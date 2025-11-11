"""
Projects Service Layer - Manage writing projects and organization.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List
from datetime import datetime
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.core.exceptions import NotFoundError


class ProjectService:
    """Service for project management."""

    @staticmethod
    async def create_project(
        db: AsyncSession,
        data: ProjectCreate,
        user_id: str,
        tenant_id: str
    ) -> ProjectResponse:
        """Create a new project."""
        project = Project(
            **data.model_dump(),
            user_id=user_id,
            tenant_id=tenant_id,
            current_word_count=0
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        
        # Calculate progress
        progress = 0
        if project.target_word_count and project.target_word_count > 0:
            progress = (project.current_word_count / project.target_word_count) * 100
        
        response = ProjectResponse.model_validate(project)
        response.progress_percentage = min(progress, 100.0)
        response.document_count = 0  # Will be calculated from relationships
        
        return response

    @staticmethod
    async def get_project(
        db: AsyncSession,
        project_id: str,
        user_id: str,
        tenant_id: str
    ) -> Optional[ProjectResponse]:
        """Get project by ID."""
        stmt = select(Project).where(
            and_(
                Project.id == project_id,
                Project.tenant_id == tenant_id,
                Project.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project not found")
        
        response = ProjectResponse.model_validate(project)
        
        # Calculate progress
        progress = 0
        if project.target_word_count and project.target_word_count > 0:
            progress = (project.current_word_count / project.target_word_count) * 100
        response.progress_percentage = min(progress, 100.0)
        
        # TODO: Get actual document count from relationships
        response.document_count = 0
        
        return response

    @staticmethod
    async def list_projects(
        db: AsyncSession,
        user_id: str,
        tenant_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[ProjectResponse]:
        """List user's projects."""
        stmt = select(Project).where(
            and_(
                Project.tenant_id == tenant_id,
                Project.user_id == user_id
            )
        ).offset(skip).limit(limit).order_by(Project.updated_at.desc())
        
        result = await db.execute(stmt)
        projects = result.scalars().all()
        
        responses = []
        for project in projects:
            response = ProjectResponse.model_validate(project)
            
            # Calculate progress
            progress = 0
            if project.target_word_count and project.target_word_count > 0:
                progress = (project.current_word_count / project.target_word_count) * 100
            response.progress_percentage = min(progress, 100.0)
            response.document_count = 0
            
            responses.append(response)
        
        return responses

    @staticmethod
    async def update_project(
        db: AsyncSession,
        project_id: str,
        data: ProjectUpdate,
        user_id: str,
        tenant_id: str
    ) -> ProjectResponse:
        """Update project."""
        stmt = select(Project).where(
            and_(
                Project.id == project_id,
                Project.tenant_id == tenant_id,
                Project.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project not found")
        
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(project, field, value)
        
        project.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(project)
        
        response = ProjectResponse.model_validate(project)
        progress = 0
        if project.target_word_count and project.target_word_count > 0:
            progress = (project.current_word_count / project.target_word_count) * 100
        response.progress_percentage = min(progress, 100.0)
        response.document_count = 0
        
        return response

    @staticmethod
    async def delete_project(
        db: AsyncSession,
        project_id: str,
        user_id: str,
        tenant_id: str
    ) -> bool:
        """Delete project."""
        stmt = select(Project).where(
            and_(
                Project.id == project_id,
                Project.tenant_id == tenant_id,
                Project.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        if not project:
            raise NotFoundError("Project not found")
        
        await db.delete(project)
        await db.commit()
        return True

    @staticmethod
    async def get_or_create_uncategorized_project(
        db: AsyncSession,
        user_id: str,
        tenant_id: str
    ) -> Project:
        """Get or create the default 'Uncategorized' project for orphaned documents."""
        # Try to find existing uncategorized project
        stmt = select(Project).where(
            and_(
                Project.user_id == user_id,
                Project.tenant_id == tenant_id,
                Project.title == "Uncategorized"
            )
        )
        result = await db.execute(stmt)
        project = result.scalar_one_or_none()
        
        # Create if doesn't exist
        if not project:
            project = Project(
                user_id=user_id,
                tenant_id=tenant_id,
                title="Uncategorized",
                description="Documents without a specific project",
                project_type="blank",
                current_word_count=0,
                target_word_count=None
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)
        
        return project
