"""
Folders Service Layer - Document organization.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.folder import Folder
from app.models.document import Document
from app.schemas.project import FolderCreate, FolderUpdate, FolderResponse
from app.core.exceptions import NotFoundError


class FolderService:
    """Service for folder management."""

    @staticmethod
    async def create_folder(
        db: AsyncSession,
        data: FolderCreate,
        user_id: str,
        tenant_id: str
    ) -> FolderResponse:
        """Create a new folder."""
        folder = Folder(
            **data.model_dump(),
            user_id=user_id,
            tenant_id=tenant_id
        )
        db.add(folder)
        await db.commit()
        await db.refresh(folder)
        
        response = FolderResponse.model_validate(folder)
        response.document_count = 0
        response.subfolder_count = 0
        
        return response

    @staticmethod
    async def get_folder(
        db: AsyncSession,
        folder_id: str,
        user_id: str,
        tenant_id: str
    ) -> Optional[FolderResponse]:
        """Get folder by ID."""
        stmt = select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == tenant_id,
                Folder.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if not folder:
            raise NotFoundError("Folder not found")
        
        response = FolderResponse.model_validate(folder)
        
        # Count documents and subfolders
        doc_stmt = select(func.count()).select_from(Document).where(
            Document.folder_id == folder_id
        )
        doc_count = await db.scalar(doc_stmt) or 0
        
        sub_stmt = select(func.count()).select_from(Folder).where(
            Folder.parent_id == folder_id
        )
        sub_count = await db.scalar(sub_stmt) or 0
        
        response.document_count = doc_count
        response.subfolder_count = sub_count
        
        return response

    @staticmethod
    async def list_folders(
        db: AsyncSession,
        user_id: str,
        tenant_id: str,
        parent_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[FolderResponse]:
        """List folders."""
        stmt = select(Folder).where(
            and_(
                Folder.tenant_id == tenant_id,
                Folder.user_id == user_id,
                Folder.parent_id == parent_id
            )
        ).offset(skip).limit(limit).order_by(Folder.name)
        
        result = await db.execute(stmt)
        folders = result.scalars().all()
        
        responses = []
        for folder in folders:
            response = FolderResponse.model_validate(folder)
            response.document_count = 0
            response.subfolder_count = 0
            responses.append(response)
        
        return responses

    @staticmethod
    async def update_folder(
        db: AsyncSession,
        folder_id: str,
        data: FolderUpdate,
        user_id: str,
        tenant_id: str
    ) -> FolderResponse:
        """Update folder."""
        stmt = select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == tenant_id,
                Folder.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if not folder:
            raise NotFoundError("Folder not found")
        
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(folder, field, value)
        
        folder.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(folder)
        
        response = FolderResponse.model_validate(folder)
        response.document_count = 0
        response.subfolder_count = 0
        
        return response

    @staticmethod
    async def delete_folder(
        db: AsyncSession,
        folder_id: str,
        user_id: str,
        tenant_id: str
    ) -> bool:
        """Delete folder."""
        stmt = select(Folder).where(
            and_(
                Folder.id == folder_id,
                Folder.tenant_id == tenant_id,
                Folder.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if not folder:
            raise NotFoundError("Folder not found")
        
        await db.delete(folder)
        await db.commit()
        return True

    @staticmethod
    async def get_folder_tree(
        db: AsyncSession,
        user_id: str,
        tenant_id: str,
        project_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get complete folder tree for a project.
        Returns folders organized hierarchically with children nested.
        Only includes folders that have documents in the specified project.
        """
        if project_id is None:
            # If no project specified, return all folders (legacy behavior)
            stmt = select(Folder).where(
                and_(
                    Folder.tenant_id == tenant_id,
                    Folder.user_id == user_id
                )
            ).order_by(Folder.name)
            result = await db.execute(stmt)
            folders = result.scalars().all()
        else:
            # Get folder IDs that have documents in this project
            folder_ids_stmt = select(Document.folder_id).where(
                and_(
                    Document.project_id == project_id,
                    Document.folder_id.isnot(None)
                )
            ).distinct()
            result = await db.execute(folder_ids_stmt)
            folder_ids_with_docs = set(row[0] for row in result.fetchall())
            
            if not folder_ids_with_docs:
                # No folders have documents in this project
                return []
            
            # Get all folders in the tree path (including parent folders)
            all_relevant_folder_ids = set(folder_ids_with_docs)
            
            # Query folders
            stmt = select(Folder).where(
                and_(
                    Folder.tenant_id == tenant_id,
                    Folder.user_id == user_id,
                    Folder.id.in_(folder_ids_with_docs)
                )
            ).order_by(Folder.name)
            result = await db.execute(stmt)
            folders = result.scalars().all()
            
            # Recursively add parent folders to ensure complete tree
            parent_ids = {f.parent_id for f in folders if f.parent_id}
            while parent_ids:
                parent_ids = parent_ids - all_relevant_folder_ids
                if not parent_ids:
                    break
                    
                parent_stmt = select(Folder).where(
                    and_(
                        Folder.tenant_id == tenant_id,
                        Folder.user_id == user_id,
                        Folder.id.in_(parent_ids)
                    )
                )
                parent_result = await db.execute(parent_stmt)
                parent_folders = parent_result.scalars().all()
                folders = list(folders) + parent_folders
                
                all_relevant_folder_ids.update(parent_ids)
                parent_ids = {f.parent_id for f in parent_folders if f.parent_id}
        
        # Build folder map with document counts
        folder_map: Dict[int, Dict[str, Any]] = {}
        for folder in folders:
            # Count documents in this folder for this project
            if project_id is not None:
                doc_stmt = select(func.count()).select_from(Document).where(
                    and_(
                        Document.folder_id == folder.id,
                        Document.project_id == project_id
                    )
                )
            else:
                doc_stmt = select(func.count()).select_from(Document).where(
                    Document.folder_id == folder.id
                )
            doc_count = await db.scalar(doc_stmt) or 0
            
            folder_map[folder.id] = {
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id,
                "color": folder.color,
                "icon": folder.icon,
                "document_count": doc_count,
                "children": []
            }
        
        # Build tree structure
        tree = []
        for folder in folders:
            folder_dict = folder_map[folder.id]
            if folder.parent_id and folder.parent_id in folder_map:
                folder_map[folder.parent_id]["children"].append(folder_dict)
            else:
                tree.append(folder_dict)
        
        return tree
