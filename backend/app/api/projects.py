"""
Projects API Endpoints - Manage writing projects.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.project_service import ProjectService
from app.services import user_service
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new project."""
    # Get or create user in database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    return await ProjectService.create_project(
        db, data, user.id, user.tenant_id
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get project by ID."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await ProjectService.get_project(
        db, project_id, user.id, user.tenant_id
    )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List user's projects."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await ProjectService.list_projects(
        db, user.id, user.tenant_id, skip, limit
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update project."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    return await ProjectService.update_project(
        db, project_id, data, user.id, user.tenant_id
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete project."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    await ProjectService.delete_project(
        db, project_id, user.id, user.tenant_id
    )
