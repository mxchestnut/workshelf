"""
Export API Routes
Document and data export functionality
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.services.export_service import ExportService


router = APIRouter(prefix="/api/export", tags=["Export"])


class ExportDocumentRequest(BaseModel):
    export_format: str  # "pdf", "docx", "markdown", "html", "epub", "txt", "json"
    include_metadata: bool = True
    include_comments: bool = False
    include_version_history: bool = False


class ExportStudioRequest(BaseModel):
    export_format: str
    include_metadata: bool = True
    include_comments: bool = False
    include_version_history: bool = False


@router.post("/document/{document_id}")
async def export_document(
    document_id: int,
    request: ExportDocumentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export a single document
    
    Supported formats:
    - pdf: PDF document (requires additional libraries)
    - docx: Microsoft Word (requires python-docx)
    - markdown: Markdown format
    - html: HTML document
    - epub: EPUB ebook (requires ebooklib)
    - txt: Plain text
    - json: JSON with metadata
    """
    result = await ExportService.create_export_job(
        db=db,
        user_id=current_user.id,
        export_type="document",
        export_format=request.export_format,
        document_id=document_id,
        include_metadata=request.include_metadata,
        include_comments=request.include_comments,
        include_version_history=request.include_version_history
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/studio/{studio_id}")
async def export_studio(
    studio_id: int,
    request: ExportStudioRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all documents in a studio as a ZIP archive
    """
    result = await ExportService.create_export_job(
        db=db,
        user_id=current_user.id,
        export_type="studio",
        export_format=request.export_format,
        studio_id=studio_id,
        include_metadata=request.include_metadata,
        include_comments=request.include_comments,
        include_version_history=request.include_version_history
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/gdpr")
async def export_gdpr_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export all user data for GDPR compliance
    
    Includes:
    - User profile
    - All documents
    - Comments
    - Activity history
    - Settings
    
    Files are available for 7 days.
    """
    result = await ExportService.create_export_job(
        db=db,
        user_id=current_user.id,
        export_type="gdpr_data",
        export_format="json"
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/jobs")
async def get_export_jobs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all export jobs for the current user
    """
    jobs = await ExportService.get_user_export_jobs(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return {"jobs": jobs}


@router.get("/job/{job_id}")
async def get_export_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details of a specific export job
    """
    job = await ExportService.get_export_job(
        db=db,
        job_id=job_id,
        user_id=current_user.id
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    return {"job": job}


@router.get("/job/{job_id}/download")
async def download_export(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get download URL for an export job
    
    Returns the file URL if the export is complete.
    Files expire after 7 days.
    """
    job = await ExportService.get_export_job(
        db=db,
        job_id=job_id,
        user_id=current_user.id
    )
    
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    
    if job.status.value != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Export not ready. Status: {job.status.value}"
        )
    
    if job.status.value == "expired":
        raise HTTPException(status_code=410, detail="Export has expired")
    
    return {
        "file_url": job.file_url,
        "file_name": job.file_name,
        "file_size_bytes": job.file_size_bytes,
        "expires_at": job.expires_at
    }
