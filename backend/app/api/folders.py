"""
Folders API Endpoints - Document organization.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.folder_service import FolderService
from app.services import user_service
from app.schemas.project import FolderCreate, FolderUpdate, FolderResponse

router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
async def create_folder(
    data: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new folder."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await FolderService.create_folder(
        db, data, user.id, user.tenant_id
    )


@router.get("/{folder_id}", response_model=FolderResponse)
async def get_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get folder by ID."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await FolderService.get_folder(
        db, folder_id, user.id, user.tenant_id
    )


@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    parent_id: Optional[int] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List folders."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await FolderService.list_folders(
        db, user.id, user.tenant_id, parent_id, skip, limit
    )


@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    data: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update folder."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await FolderService.update_folder(
        db, folder_id, data, user.id, user.tenant_id
    )


@router.get("/tree", response_model=List[Dict[str, Any]])
async def get_folder_tree(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get complete folder tree for a project."""
    try:
        user = await user_service.get_or_create_user_from_keycloak(db, current_user)
        print(f"[FOLDER TREE] user_id={user.id}, tenant_id={user.tenant_id}, project_id={project_id}")
        result = await FolderService.get_folder_tree(
            db, user.id, user.tenant_id, project_id
        )
        print(f"[FOLDER TREE] Returning {len(result)} root folders")
        return result
    except Exception as e:
        print(f"[FOLDER TREE ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete folder."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await FolderService.delete_folder(
        db, folder_id, user.id, user.tenant_id
    )
