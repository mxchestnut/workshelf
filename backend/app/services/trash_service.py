"""
Trash Service
Manages soft-deleted documents and projects with 30-day auto-purge
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from typing import List, Dict, Any, Tuple
import logging

from app.models.document import Document
from app.models.project import Project

logger = logging.getLogger(__name__)

# Trash retention period: 30 days
TRASH_RETENTION_DAYS = 30


class TrashService:
    """Service for managing trash bin (soft-deleted items)"""
    
    # ========================================================================
    # DOCUMENTS
    # ========================================================================
    
    @staticmethod
    async def move_document_to_trash(
        db: AsyncSession,
        document_id: int,
        user_id: int
    ) -> Document:
        """
        Soft delete a document (move to trash)
        """
        result = await db.execute(
            select(Document).where(
                and_(
                    Document.id == document_id,
                    Document.owner_id == user_id
                )
            )
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise ValueError("Document not found or access denied")
        
        if document.is_deleted:
            raise ValueError("Document is already in trash")
        
        document.is_deleted = True
        document.deleted_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(document)
        
        logger.info(f"Moved document {document_id} to trash (user {user_id})")
        
        return document
    
    @staticmethod
    async def restore_document_from_trash(
        db: AsyncSession,
        document_id: int,
        user_id: int
    ) -> Document:
        """
        Restore a document from trash
        """
        result = await db.execute(
            select(Document).where(
                and_(
                    Document.id == document_id,
                    Document.owner_id == user_id,
                    Document.is_deleted == True
                )
            )
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise ValueError("Document not found in trash or access denied")
        
        document.is_deleted = False
        document.deleted_at = None
        
        await db.commit()
        await db.refresh(document)
        
        logger.info(f"Restored document {document_id} from trash (user {user_id})")
        
        return document
    
    @staticmethod
    async def permanently_delete_document(
        db: AsyncSession,
        document_id: int,
        user_id: int
    ) -> bool:
        """
        Permanently delete a document (bypass trash or delete from trash)
        """
        result = await db.execute(
            select(Document).where(
                and_(
                    Document.id == document_id,
                    Document.owner_id == user_id
                )
            )
        )
        document = result.scalar_one_or_none()
        
        if not document:
            return False
        
        await db.delete(document)
        await db.commit()
        
        logger.info(f"Permanently deleted document {document_id} (user {user_id})")
        
        return True
    
    @staticmethod
    async def get_trashed_documents(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Document], int]:
        """
        Get all documents in trash for a user
        """
        # Get total count
        count_result = await db.execute(
            select(Document).where(
                and_(
                    Document.owner_id == user_id,
                    Document.is_deleted == True
                )
            )
        )
        total = len(count_result.scalars().all())
        
        # Get paginated results
        result = await db.execute(
            select(Document)
            .where(
                and_(
                    Document.owner_id == user_id,
                    Document.is_deleted == True
                )
            )
            .order_by(Document.deleted_at.desc())
            .offset(skip)
            .limit(limit)
        )
        documents = result.scalars().all()
        
        return list(documents), total
    
    @staticmethod
    async def empty_document_trash(
        db: AsyncSession,
        user_id: int
    ) -> int:
        """
        Permanently delete all documents in trash for a user
        Returns number of documents deleted
        """
        result = await db.execute(
            delete(Document).where(
                and_(
                    Document.owner_id == user_id,
                    Document.is_deleted == True
                )
            )
        )
        
        count = result.rowcount
        await db.commit()
        
        logger.info(f"Emptied trash for user {user_id}: {count} documents deleted")
        
        return count
    
    # ========================================================================
    # PROJECTS
    # ========================================================================
    
    @staticmethod
    async def move_project_to_trash(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        move_documents: bool = False
    ) -> Project:
        """
        Soft delete a project (move to trash)
        
        Args:
            move_documents: If True, also move all project documents to trash
        """
        result = await db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.user_id == user_id
                )
            )
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise ValueError("Project not found or access denied")
        
        if project.is_deleted:
            raise ValueError("Project is already in trash")
        
        project.is_deleted = True
        project.deleted_at = datetime.now(timezone.utc)
        
        # Optionally move documents to trash
        if move_documents:
            documents_result = await db.execute(
                select(Document).where(
                    and_(
                        Document.project_id == project_id,
                        Document.owner_id == user_id,
                        Document.is_deleted == False
                    )
                )
            )
            documents = documents_result.scalars().all()
            
            deleted_at = datetime.now(timezone.utc)
            for doc in documents:
                doc.is_deleted = True
                doc.deleted_at = deleted_at
            
            logger.info(f"Moved {len(documents)} documents to trash with project {project_id}")
        
        await db.commit()
        await db.refresh(project)
        
        logger.info(f"Moved project {project_id} to trash (user {user_id})")
        
        return project
    
    @staticmethod
    async def restore_project_from_trash(
        db: AsyncSession,
        project_id: int,
        user_id: int,
        restore_documents: bool = False
    ) -> Project:
        """
        Restore a project from trash
        
        Args:
            restore_documents: If True, also restore all project documents from trash
        """
        result = await db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.user_id == user_id,
                    Project.is_deleted == True
                )
            )
        )
        project = result.scalar_one_or_none()
        
        if not project:
            raise ValueError("Project not found in trash or access denied")
        
        project.is_deleted = False
        project.deleted_at = None
        
        # Optionally restore documents
        if restore_documents:
            documents_result = await db.execute(
                select(Document).where(
                    and_(
                        Document.project_id == project_id,
                        Document.owner_id == user_id,
                        Document.is_deleted == True
                    )
                )
            )
            documents = documents_result.scalars().all()
            
            for doc in documents:
                doc.is_deleted = False
                doc.deleted_at = None
            
            logger.info(f"Restored {len(documents)} documents with project {project_id}")
        
        await db.commit()
        await db.refresh(project)
        
        logger.info(f"Restored project {project_id} from trash (user {user_id})")
        
        return project
    
    @staticmethod
    async def permanently_delete_project(
        db: AsyncSession,
        project_id: int,
        user_id: int
    ) -> bool:
        """
        Permanently delete a project (bypass trash or delete from trash)
        """
        result = await db.execute(
            select(Project).where(
                and_(
                    Project.id == project_id,
                    Project.user_id == user_id
                )
            )
        )
        project = result.scalar_one_or_none()
        
        if not project:
            return False
        
        await db.delete(project)
        await db.commit()
        
        logger.info(f"Permanently deleted project {project_id} (user {user_id})")
        
        return True
    
    @staticmethod
    async def get_trashed_projects(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Project], int]:
        """
        Get all projects in trash for a user
        """
        # Get total count
        count_result = await db.execute(
            select(Project).where(
                and_(
                    Project.user_id == user_id,
                    Project.is_deleted == True
                )
            )
        )
        total = len(count_result.scalars().all())
        
        # Get paginated results
        result = await db.execute(
            select(Project)
            .where(
                and_(
                    Project.user_id == user_id,
                    Project.is_deleted == True
                )
            )
            .order_by(Project.deleted_at.desc())
            .offset(skip)
            .limit(limit)
        )
        projects = result.scalars().all()
        
        return list(projects), total
    
    @staticmethod
    async def empty_project_trash(
        db: AsyncSession,
        user_id: int
    ) -> int:
        """
        Permanently delete all projects in trash for a user
        Returns number of projects deleted
        """
        result = await db.execute(
            delete(Project).where(
                and_(
                    Project.user_id == user_id,
                    Project.is_deleted == True
                )
            )
        )
        
        count = result.rowcount
        await db.commit()
        
        logger.info(f"Emptied project trash for user {user_id}: {count} projects deleted")
        
        return count
    
    # ========================================================================
    # AUTO-PURGE (Cleanup expired trash items)
    # ========================================================================
    
    @staticmethod
    async def purge_expired_trash_documents(db: AsyncSession) -> int:
        """
        Permanently delete documents that have been in trash for > 30 days
        Returns number of documents deleted
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS)
        
        result = await db.execute(
            delete(Document).where(
                and_(
                    Document.is_deleted == True,
                    Document.deleted_at <= cutoff_date
                )
            )
        )
        
        count = result.rowcount
        await db.commit()
        
        if count > 0:
            logger.info(f"Auto-purged {count} expired documents from trash (older than {TRASH_RETENTION_DAYS} days)")
        
        return count
    
    @staticmethod
    async def purge_expired_trash_projects(db: AsyncSession) -> int:
        """
        Permanently delete projects that have been in trash for > 30 days
        Returns number of projects deleted
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS)
        
        result = await db.execute(
            delete(Project).where(
                and_(
                    Project.is_deleted == True,
                    Project.deleted_at <= cutoff_date
                )
            )
        )
        
        count = result.rowcount
        await db.commit()
        
        if count > 0:
            logger.info(f"Auto-purged {count} expired projects from trash (older than {TRASH_RETENTION_DAYS} days)")
        
        return count
    
    @staticmethod
    async def purge_all_expired_trash(db: AsyncSession) -> Dict[str, int]:
        """
        Run complete trash purge for both documents and projects
        Returns counts of deleted items
        """
        docs_deleted = await TrashService.purge_expired_trash_documents(db)
        projects_deleted = await TrashService.purge_expired_trash_projects(db)
        
        total = docs_deleted + projects_deleted
        
        if total > 0:
            logger.info(f"Trash purge complete: {docs_deleted} documents, {projects_deleted} projects deleted")
        
        return {
            "documents_deleted": docs_deleted,
            "projects_deleted": projects_deleted,
            "total_deleted": total
        }
    
    # ========================================================================
    # UTILITIES
    # ========================================================================
    
    @staticmethod
    async def get_trash_stats(db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """
        Get statistics about user's trash
        """
        # Count documents
        docs_result = await db.execute(
            select(Document).where(
                and_(
                    Document.owner_id == user_id,
                    Document.is_deleted == True
                )
            )
        )
        docs = docs_result.scalars().all()
        
        # Count projects
        projects_result = await db.execute(
            select(Project).where(
                and_(
                    Project.user_id == user_id,
                    Project.is_deleted == True
                )
            )
        )
        projects = projects_result.scalars().all()
        
        # Calculate expiration dates
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS)
        
        docs_expiring_soon = [
            doc for doc in docs
            if doc.deleted_at and doc.deleted_at <= cutoff_date + timedelta(days=7)
        ]
        
        projects_expiring_soon = [
            proj for proj in projects
            if proj.deleted_at and proj.deleted_at <= cutoff_date + timedelta(days=7)
        ]
        
        return {
            "total_documents": len(docs),
            "total_projects": len(projects),
            "documents_expiring_soon": len(docs_expiring_soon),
            "projects_expiring_soon": len(projects_expiring_soon),
            "retention_days": TRASH_RETENTION_DAYS
        }
