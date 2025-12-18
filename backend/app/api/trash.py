"""
Trash API
Manages soft-deleted documents and projects with 30-day auto-purge
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.services.trash_service import TrashService
from app.schemas.document import DocumentResponse
from app.schemas.project import ProjectResponse

router = APIRouter(prefix="/trash", tags=["trash"])


class TrashItemResponse(BaseModel):
    """Response for trash item"""
    id: int
    title: str
    type: str  # 'document' or 'project'
    deleted_at: datetime
    days_until_permanent_deletion: int


class TrashStatsResponse(BaseModel):
    """Response for trash statistics"""
    total_documents: int
    total_projects: int
    documents_expiring_soon: int
    projects_expiring_soon: int
    retention_days: int


class EmptyTrashResponse(BaseModel):
    """Response after emptying trash"""
    documents_deleted: int
    projects_deleted: int
    total_deleted: int


# ============================================================================
# DOCUMENTS
# ============================================================================

@router.post("/documents/{document_id}", status_code=status.HTTP_200_OK)
async def move_document_to_trash(
    document_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Move a document to trash (soft delete)
    Document will be automatically deleted after 30 days
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    try:
        document = await TrashService.move_document_to_trash(db, document_id, user.id)
        return {
            "message": "Document moved to trash",
            "document_id": document.id,
            "deleted_at": document.deleted_at
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/documents/{document_id}/restore", status_code=status.HTTP_200_OK)
async def restore_document_from_trash(
    document_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restore a document from trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    try:
        document = await TrashService.restore_document_from_trash(db, document_id, user.id)
        return {
            "message": "Document restored from trash",
            "document_id": document.id
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_document(
    document_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete a document (cannot be recovered)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    success = await TrashService.permanently_delete_document(db, document_id, user.id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    
    return None


@router.get("/documents", response_model=List[DocumentResponse])
async def get_trashed_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all documents in trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    documents, total = await TrashService.get_trashed_documents(db, user.id, skip, limit)
    
    return documents


@router.delete("/documents", status_code=status.HTTP_200_OK, response_model=EmptyTrashResponse)
async def empty_document_trash(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete all documents in trash (cannot be recovered)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    count = await TrashService.empty_document_trash(db, user.id)
    
    return {
        "documents_deleted": count,
        "projects_deleted": 0,
        "total_deleted": count
    }


# ============================================================================
# PROJECTS
# ============================================================================

@router.post("/projects/{project_id}", status_code=status.HTTP_200_OK)
async def move_project_to_trash(
    project_id: int,
    move_documents: bool = Query(False, description="Also move project documents to trash"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Move a project to trash (soft delete)
    Project will be automatically deleted after 30 days
    
    Query params:
    - move_documents: If true, also move all project documents to trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    try:
        project = await TrashService.move_project_to_trash(db, project_id, user.id, move_documents)
        return {
            "message": "Project moved to trash",
            "project_id": project.id,
            "deleted_at": project.deleted_at,
            "documents_moved": move_documents
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/projects/{project_id}/restore", status_code=status.HTTP_200_OK)
async def restore_project_from_trash(
    project_id: int,
    restore_documents: bool = Query(False, description="Also restore project documents from trash"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Restore a project from trash
    
    Query params:
    - restore_documents: If true, also restore all project documents from trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    try:
        project = await TrashService.restore_project_from_trash(db, project_id, user.id, restore_documents)
        return {
            "message": "Project restored from trash",
            "project_id": project.id,
            "documents_restored": restore_documents
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_project(
    project_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete a project (cannot be recovered)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    success = await TrashService.permanently_delete_project(db, project_id, user.id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    return None


@router.get("/projects", response_model=List[ProjectResponse])
async def get_trashed_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all projects in trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    projects, total = await TrashService.get_trashed_projects(db, user.id, skip, limit)
    
    return projects


@router.delete("/projects", status_code=status.HTTP_200_OK, response_model=EmptyTrashResponse)
async def empty_project_trash(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete all projects in trash (cannot be recovered)
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    count = await TrashService.empty_project_trash(db, user.id)
    
    return {
        "documents_deleted": 0,
        "projects_deleted": count,
        "total_deleted": count
    }


# ============================================================================
# TRASH MANAGEMENT
# ============================================================================

@router.get("/stats", response_model=TrashStatsResponse)
async def get_trash_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get statistics about trash
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    stats = await TrashService.get_trash_stats(db, user.id)
    
    return stats


@router.delete("/empty", status_code=status.HTTP_200_OK, response_model=EmptyTrashResponse)
async def empty_all_trash(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permanently delete ALL items in trash (documents and projects)
    ⚠️ WARNING: This action cannot be undone
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    docs_deleted = await TrashService.empty_document_trash(db, user.id)
    projects_deleted = await TrashService.empty_project_trash(db, user.id)
    
    return {
        "documents_deleted": docs_deleted,
        "projects_deleted": projects_deleted,
        "total_deleted": docs_deleted + projects_deleted
    }
