"""
EPUB Upload API
Handle self-published book uploads with content verification
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import hashlib
import os
import tempfile
import json

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.epub_submission import EpubSubmission, VerificationLog, SubmissionStatus
from app.models import User
from app.services import user_service
from app.services.content_verification import verification_service
from azure.storage.blob import BlobServiceClient, ContentSettings

router = APIRouter(prefix="/epub-uploads", tags=["epub-uploads"])


# ============================================================================
# Helper Functions - Authorization
# ============================================================================

async def require_moderator(
    db: AsyncSession,
    current_user: dict
) -> User:
    """
    Verify that the current user has moderator/staff privileges.
    
    Args:
        db: Database session
        current_user: Current authenticated user from JWT
        
    Returns:
        User object if authorized
        
    Raises:
        HTTPException: 403 if user is not staff/moderator
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    if not user.is_staff:
        raise HTTPException(
            status_code=403,
            detail="Moderator privileges required. Only staff members can perform this action."
        )
    
    return user


# ============================================================================
# Schemas
# ============================================================================class SubmissionCreate(BaseModel):
    """Create new EPUB submission"""
    title: str = Field(..., min_length=1, max_length=500)
    author_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    genres: Optional[List[str]] = None
    isbn: Optional[str] = None
    
    # Attestations (required)
    author_attestation: bool = Field(..., description="I am the author")
    copyright_holder: bool = Field(..., description="I hold the copyright")
    original_work: bool = Field(..., description="This is my original work")


class SubmissionResponse(BaseModel):
    """EPUB submission response"""
    id: int
    user_id: int
    title: str
    author_name: str
    description: Optional[str]
    genres: Optional[List[str]]
    isbn: Optional[str]
    
    status: str
    verification_score: Optional[float]
    requires_manual_review: bool
    
    file_size_bytes: int
    cover_blob_url: Optional[str]
    
    created_at: datetime
    updated_at: datetime
    verification_date: Optional[datetime]
    published_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class VerificationResultResponse(BaseModel):
    """Detailed verification results"""
    submission_id: int
    overall_score: float
    verified: bool
    requires_review: bool
    checks: dict
    warnings: List[str]
    errors: List[str]
    timestamp: str


class ModeratorAction(BaseModel):
    """Moderator approval/rejection"""
    action: str = Field(..., pattern="^(approve|reject)$")
    notes: Optional[str] = None


# ============================================================================
# Upload Endpoints
# ============================================================================

@router.post("/upload", response_model=SubmissionResponse)
async def upload_epub(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    author_name: str = Form(...),
    description: Optional[str] = Form(None),
    genres: Optional[str] = Form(None),  # JSON array string
    isbn: Optional[str] = Form(None),
    author_attestation: bool = Form(...),
    copyright_holder: bool = Form(...),
    original_work: bool = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a self-published EPUB book
    
    Requires user attestation that they are the author/copyright holder
    Triggers automatic verification checks
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Validate file type
    if not file.filename.endswith('.epub'):
        raise HTTPException(status_code=400, detail="File must be .epub format")
    
    # Validate size (max 50MB)
    content = await file.read()
    file_size = len(content)
    
    if file_size > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    
    if file_size < 1024:  # 1KB
        raise HTTPException(status_code=400, detail="File too small (likely corrupted)")
    
    # Validate attestations
    if not (author_attestation and copyright_holder and original_work):
        raise HTTPException(
            status_code=400,
            detail="You must attest that you are the author and copyright holder"
        )
    
    # Calculate file hash
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Check for duplicate uploads
    existing = await db.execute(
        select(EpubSubmission).where(EpubSubmission.file_hash == file_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="This file has already been uploaded"
        )
    
    # Parse genres
    genres_list = None
    if genres:
        try:
            genres_list = json.loads(genres)
        except:
            genres_list = [g.strip() for g in genres.split(',') if g.strip()]
    
    # Upload to Azure Blob Storage
    try:
        blob_url = await _upload_to_blob_storage(
            content,
            file_hash,
            file.filename
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )
    
    # Create submission record
    submission = EpubSubmission(
        user_id=user.id,
        title=title,
        author_name=author_name,
        description=description,
        genres=genres_list,
        isbn=isbn,
        file_hash=file_hash,
        blob_url=blob_url,
        file_size_bytes=file_size,
        status=SubmissionStatus.PENDING,
        author_attestation=author_attestation,
        copyright_holder=copyright_holder,
        original_work=original_work
    )
    
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    
    # Trigger verification in background
    background_tasks.add_task(
        _run_verification,
        submission.id,
        blob_url,
        title,
        author_name
    )
    
    return SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        title=submission.title,
        author_name=submission.author_name,
        description=submission.description,
        genres=submission.genres,
        isbn=submission.isbn,
        status=submission.status.value,
        verification_score=submission.verification_score,
        requires_manual_review=submission.requires_manual_review,
        file_size_bytes=submission.file_size_bytes,
        cover_blob_url=submission.cover_blob_url,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
        verification_date=submission.verification_date,
        published_at=submission.published_at
    )


@router.get("/my-submissions", response_model=List[SubmissionResponse])
async def get_my_submissions(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get user's EPUB submissions"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    query = select(EpubSubmission).where(EpubSubmission.user_id == user.id)
    
    if status:
        try:
            status_enum = SubmissionStatus(status)
            query = query.where(EpubSubmission.status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    
    query = query.order_by(EpubSubmission.created_at.desc())
    
    result = await db.execute(query)
    submissions = result.scalars().all()
    
    return [
        SubmissionResponse(
            id=sub.id,
            user_id=sub.user_id,
            title=sub.title,
            author_name=sub.author_name,
            description=sub.description,
            genres=sub.genres,
            isbn=sub.isbn,
            status=sub.status.value,
            verification_score=sub.verification_score,
            requires_manual_review=sub.requires_manual_review,
            file_size_bytes=sub.file_size_bytes,
            cover_blob_url=sub.cover_blob_url,
            created_at=sub.created_at,
            updated_at=sub.updated_at,
            verification_date=sub.verification_date,
            published_at=sub.published_at
        )
        for sub in submissions
    ]


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get submission details"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(EpubSubmission).where(
            EpubSubmission.id == submission_id,
            EpubSubmission.user_id == user.id
        )
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return SubmissionResponse(
        id=submission.id,
        user_id=submission.user_id,
        title=submission.title,
        author_name=submission.author_name,
        description=submission.description,
        genres=submission.genres,
        isbn=submission.isbn,
        status=submission.status.value,
        verification_score=submission.verification_score,
        requires_manual_review=submission.requires_manual_review,
        file_size_bytes=submission.file_size_bytes,
        cover_blob_url=submission.cover_blob_url,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
        verification_date=submission.verification_date,
        published_at=submission.published_at
    )


@router.get("/{submission_id}/verification", response_model=VerificationResultResponse)
async def get_verification_results(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get detailed verification results"""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(EpubSubmission).where(
            EpubSubmission.id == submission_id,
            EpubSubmission.user_id == user.id
        )
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if not submission.verification_results:
        raise HTTPException(status_code=404, detail="Verification not complete yet")
    
    return VerificationResultResponse(
        submission_id=submission.id,
        overall_score=submission.verification_score or 0.0,
        verified=submission.status == SubmissionStatus.VERIFIED,
        requires_review=submission.requires_manual_review,
        **submission.verification_results
    )


# ============================================================================
# Moderation Endpoints (Admin/Moderator only)
# ============================================================================

@router.get("/moderation/pending", response_model=List[SubmissionResponse])
async def get_pending_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get submissions requiring manual review (moderators only)
    
    Returns list of EPUB submissions awaiting moderation.
    Only accessible to users with staff/moderator privileges.
    """
    # Verify moderator privileges
    user = await require_moderator(db, current_user)
    
    result = await db.execute(
        select(EpubSubmission).where(
            EpubSubmission.status == SubmissionStatus.NEEDS_REVIEW
        ).order_by(EpubSubmission.created_at.asc())
    )
    submissions = result.scalars().all()
    
    return [
        SubmissionResponse(
            id=sub.id,
            user_id=sub.user_id,
            title=sub.title,
            author_name=sub.author_name,
            description=sub.description,
            genres=sub.genres,
            isbn=sub.isbn,
            status=sub.status.value,
            verification_score=sub.verification_score,
            requires_manual_review=sub.requires_manual_review,
            file_size_bytes=sub.file_size_bytes,
            cover_blob_url=sub.cover_blob_url,
            created_at=sub.created_at,
            updated_at=sub.updated_at,
            verification_date=sub.verification_date,
            published_at=sub.published_at
        )
        for sub in submissions
    ]


@router.post("/{submission_id}/moderate")
async def moderate_submission(
    submission_id: int,
    action: ModeratorAction,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Approve or reject an EPUB submission (moderators only)
    
    Allows staff/moderators to approve or reject EPUB submissions
    after manual review. Sets moderator notes and timestamps.
    
    Args:
        submission_id: ID of submission to moderate
        action: ModeratorAction with action type and notes
        
    Returns:
        Success message with action taken
        
    Raises:
        403: If user is not a moderator
        404: If submission not found
    """
    # Verify moderator privileges
    user = await require_moderator(db, current_user)
    
    result = await db.execute(
        select(EpubSubmission).where(EpubSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if action.action == "approve":
        submission.status = SubmissionStatus.APPROVED
        submission.moderator_id = user.id
        submission.moderator_notes = action.notes
        submission.reviewed_at = datetime.utcnow()
        
        # TODO: Create bookshelf item and publish
        
    elif action.action == "reject":
        submission.status = SubmissionStatus.REJECTED
        submission.moderator_id = user.id
        submission.moderator_notes = action.notes
        submission.reviewed_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": f"Submission {action.action}ed successfully"}


# ============================================================================
# Helper Functions
# ============================================================================

async def _upload_to_blob_storage(
    content: bytes,
    file_hash: str,
    filename: str
) -> str:
    """Upload EPUB to Azure Blob Storage"""
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise Exception("Azure Storage not configured")
    
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    container_name = "epub-submissions"
    
    # Ensure container exists
    try:
        container_client = blob_service_client.get_container_client(container_name)
        if not await container_client.exists():
            await container_client.create_container()
    except:
        pass
    
    # Upload blob with hash as name
    blob_name = f"{file_hash}.epub"
    blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=blob_name
    )
    
    await blob_client.upload_blob(
        content,
        overwrite=True,
        content_settings=ContentSettings(content_type="application/epub+zip")
    )
    
    return blob_client.url


async def _run_verification(
    submission_id: int,
    blob_url: str,
    title: str,
    author: str
):
    """
    Run content verification checks
    This runs in the background after upload
    """
    from app.core.database import SessionLocal
    
    async with SessionLocal() as db:
        try:
            # Get submission
            result = await db.execute(
                select(EpubSubmission).where(EpubSubmission.id == submission_id)
            )
            submission = result.scalar_one_or_none()
            
            if not submission:
                return
            
            # Update status
            submission.status = SubmissionStatus.VERIFYING
            await db.commit()
            
            # Download EPUB temporarily
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(blob_url)
                
                with tempfile.NamedTemporaryFile(suffix='.epub', delete=False) as tmp_file:
                    tmp_file.write(response.content)
                    tmp_path = tmp_file.name
            
            try:
                # Run verification
                verification_results = await verification_service.verify_epub_content(
                    tmp_path,
                    author,
                    title
                )
                
                # Update submission
                submission.verification_results = verification_results
                submission.verification_score = verification_results.get("overall_score", 0.0)
                submission.verification_date = datetime.utcnow()
                
                if verification_results.get("verified"):
                    submission.status = SubmissionStatus.VERIFIED
                elif verification_results.get("requires_review"):
                    submission.status = SubmissionStatus.NEEDS_REVIEW
                    submission.requires_manual_review = True
                else:
                    submission.status = SubmissionStatus.REJECTED
                
                await db.commit()
                
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
        except Exception as e:
            print(f"Verification error: {str(e)}")
            # Mark as needing review on error
            try:
                submission.status = SubmissionStatus.NEEDS_REVIEW
                submission.requires_manual_review = True
                submission.verification_results = {
                    "error": str(e),
                    "verified": False,
                    "requires_review": True
                }
                await db.commit()
            except:
                pass
