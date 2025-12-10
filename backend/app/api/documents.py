"""
Document Management API - CRUD operations for documents
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user, get_optional_user
from app.services import document_service, user_service
from app.services.content_integrity_service import ContentIntegrityService
from app.models.document import DocumentStatus, DocumentMode
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentListResponse,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new document
    
    Requires authentication.
    The document will be owned by the authenticated user.
    """
    # Get user from database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Create document
    document = await document_service.create_document(db, document_data, user.id, user.tenant_id)
    
    return document


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=5000, description="Items per page"),
    status_filter: Optional[DocumentStatus] = Query(None, description="Filter by status"),
    project_id: Optional[int] = Query(None, description="Filter by project ID"),
    folder_id: Optional[int] = Query(None, description="Filter by folder ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List user's documents
    
    Requires authentication.
    Returns paginated list of documents owned by the authenticated user.
    """
    # Get user from database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get documents (function expects page number, not skip)
    documents, total = await document_service.list_user_documents(
        db, user.id, page, page_size, status_filter, project_id, folder_id
    )
    
    # Calculate skip for response metadata
    skip = (page - 1) * page_size
    
    return {
        "documents": documents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (skip + len(documents)) < total
    }


@router.get("/public", response_model=DocumentListResponse)
async def list_public_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    List public published documents
    
    No authentication required.
    Returns published documents with public visibility.
    """
    skip = (page - 1) * page_size
    documents, total = await document_service.list_public_documents(db, page, page_size)
    
    return {
        "documents": documents,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (skip + len(documents)) < total
    }


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Get a specific document by ID
    
    Authentication optional.
    - If authenticated: Can access own documents regardless of visibility
    - If not authenticated: Can only access public documents
    """
    # Determine user_id
    user_id = None
    if current_user:
        user = await user_service.get_or_create_user_from_keycloak(db, current_user)
        user_id = user.id
    
    # Get document
    document = await document_service.get_document_by_id(db, document_id, user_id)
    
    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a document
    
    Requires authentication.
    Only the document owner can update it.
    
    AUTOMATIC INTEGRITY CHECK: When changing status to "published", content is automatically
    checked for plagiarism and AI-generated content to ensure authenticity.
    
    Limits:
    - Maximum 25% plagiarism (similarity to existing sources)
    - Maximum 30% AI-generated content
    
    Your authentic voice is what makes your work valuable!
    """
    # Get user from database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if user is trying to publish the document
    if document_data.status and document_data.status == DocumentStatus.PUBLISHED:
        # AUTOMATIC INTEGRITY CHECK before publishing
        integrity_result = await ContentIntegrityService.auto_check_before_publish(
            db=db,
            document_id=document_id,
            user_id=user.id,
            action="publish"
        )
        
        if not integrity_result["can_proceed"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Content failed integrity check",
                    "check_id": integrity_result.get("check_id"),
                    "issues": integrity_result.get("issues", []),
                    "message": integrity_result.get("message"),
                    "policy_reminder": integrity_result.get("policy_reminder"),
                    "help": "Review the issues and revise your content. Work Shelf celebrates authentic human creativity!"
                }
            )
    
    # Update document
    document = await document_service.update_document(db, document_id, document_data, user.id)
    
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a document
    
    Requires authentication.
    Only the document owner can delete it.
    """
    # Get user from database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Delete document
    await document_service.delete_document(db, document_id, user.id)
    
    return None


# ============================================================================
# Document Versioning & Mode Management (Git-style workflow for writers)
# ============================================================================

@router.get("/{document_id}/versions", response_model=List[Dict[str, Any]])
async def list_document_versions(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all versions of a document (Git-style history)
    
    Returns version history like `git log`:
    - Version number
    - Created timestamp
    - Author
    - Change summary (commit message)
    - Mode at time of version
    - Whether this was a mode transition
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    versions = await document_service.list_document_versions(db, document_id, user.id)
    return versions


@router.get("/{document_id}/versions/{version_number}", response_model=Dict[str, Any])
async def get_document_version(
    document_id: int,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific version of a document
    
    Like `git show <commit>` - view the full content of a specific version
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    version = await document_service.get_document_version(db, document_id, version_number, user.id)
    return version


@router.post("/{document_id}/versions/{version_number}/restore", response_model=DocumentResponse)
async def restore_document_version(
    document_id: int,
    version_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Restore a document to a previous version
    
    Like `git checkout <commit>` - restore the document to a previous state.
    Creates a new version with the restored content.
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    document = await document_service.restore_document_version(db, document_id, version_number, user.id)
    return document


@router.post("/{document_id}/versions", response_model=Dict[str, Any])
async def create_manual_version(
    document_id: int,
    change_summary: str = Query(..., description="Commit message for this version"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a manual version snapshot
    
    Like `git commit` - create a snapshot of the current document state
    with a descriptive message.
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    version = await document_service.create_manual_version(db, document_id, user.id, change_summary)
    return version


@router.post("/{document_id}/mode", response_model=DocumentResponse)
async def change_document_mode(
    document_id: int,
    new_mode: DocumentMode,
    change_summary: Optional[str] = Query(None, description="Optional message for mode transition"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Change document mode (Alpha → Beta → Publish → Read)
    
    Automatically creates a version snapshot when changing modes.
    
    Modes:
    - alpha: Draft Room - collaborative drafting
    - beta: Workshop - structured feedback
    - publish: Print Queue - finalization and quality checks
    - read: Bookshelf - consumer reading view
    
    Mode changes can go forward or backward (e.g., Publish → Beta for revisions)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    document = await document_service.change_document_mode(db, document_id, user.id, new_mode, change_summary)
    return document


# ============================================================================
# Document Publishing to Store
# ============================================================================

@router.post("/{document_id}/publish", response_model=Dict[str, Any])
async def publish_document_to_store(
    document_id: int,
    price_usd: float = Query(..., ge=0, description="Price in USD (0 for free)"),
    description: Optional[str] = Query(None, description="Store listing description"),
    genres: Optional[List[str]] = Query(None, description="List of genres"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Publish a document to the WorkShelf store
    
    Creates a StoreItem from the document and makes it available for readers.
    The document will be converted to EPUB format and uploaded to blob storage.
    
    Requirements:
    - Document must be owned by the user
    - Document status will be changed to 'published'
    - Minimum price is $0.00 (free) or $0.99 (paid)
    
    Returns:
    - store_item_id: The ID of the created store item
    - epub_url: URL to the published EPUB
    - status: Publication status
    """
    from app.services.store_service import publish_document_to_store as publish_service
    
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Validate price
    if price_usd > 0 and price_usd < 0.99:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum price is $0.99 for paid content"
        )
    
    # Publish document
    result = await publish_service(
        db=db,
        document_id=document_id,
        user_id=user.id,
        price_usd=price_usd,
        description=description,
        genres=genres
    )
    
    return result
