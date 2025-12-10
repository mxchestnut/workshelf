"""
Document Service
Business logic for document operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload
from typing import Optional, List, Tuple, Union, Dict, Any
from datetime import datetime, timezone
import json

from app.models.document import Document, DocumentStatus, DocumentVisibility, DocumentVersion
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.storage_service import storage_service
from fastapi import HTTPException, status


def extract_text_from_content(content: Union[str, dict, None]) -> str:
    """Extract plain text from content (handles both string and rich text JSON)"""
    if not content:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        # Extract text from TipTap/ProseMirror JSON structure
        def extract_text(node):
            if isinstance(node, dict):
                text = ""
                if node.get("type") == "text":
                    return node.get("text", "")
                if "content" in node:
                    for child in node["content"]:
                        text += extract_text(child) + " "
                return text
            return ""
        return extract_text(content)
    return ""


def calculate_reading_time(content: Union[str, dict, None]) -> int:
    """
    Calculate estimated reading time in minutes
    Assumes average reading speed of 200 words per minute
    """
    text = extract_text_from_content(content)
    if not text:
        return 0
    word_count = len(text.split())
    return max(1, round(word_count / 200))


def count_words(content: Union[str, dict, None]) -> int:
    """Count words in content (handles both string and rich text JSON)"""
    text = extract_text_from_content(content)
    if not text:
        return 0
    return len(text.split())


async def create_document(
    session: AsyncSession,
    document_data: DocumentCreate,
    owner_id: int,
    tenant_id: int
) -> Document:
    """
    Create a new document
    
    Args:
        session: Database session
        document_data: Document creation data
        owner_id: ID of the document owner
        tenant_id: ID of the tenant
        
    Returns:
        Created document
    """
    # If no project_id provided, assign to "Uncategorized" project
    project_id = document_data.project_id
    if not project_id:
        from app.services.project_service import ProjectService
        uncategorized_project = await ProjectService.get_or_create_uncategorized_project(
            session, owner_id, tenant_id
        )
        project_id = uncategorized_project.id
    
    # Calculate word count
    word_count = count_words(document_data.content)
    
    # Convert content to string if it's a dict (for storage)
    content_str = document_data.content
    if isinstance(document_data.content, dict):
        content_str = json.dumps(document_data.content)
    
    # Upload content to S3 and get file path
    file_path = None
    file_size = None
    if storage_service.s3_client:
        file_path = storage_service.upload_document(
            document_id=0,  # Temporary, will update after document creation
            content=content_str,
            tenant_id=tenant_id
        )
        if file_path:
            file_size = len(content_str.encode('utf-8'))
    
    # Create document - store in S3 if available, else in database
    document = Document(
        owner_id=owner_id,
        tenant_id=tenant_id,
        title=document_data.title,
        content=None if file_path else content_str,  # Store in DB only if S3 upload failed
        description=document_data.description,
        status=document_data.status,
        visibility=document_data.visibility,
        project_id=project_id,
        folder_id=document_data.folder_id,
        studio_id=document_data.studio_id,
        word_count=word_count,
        current_version=1,
        file_path=file_path,
        file_size=file_size
    )
    
    session.add(document)
    await session.commit()
    await session.refresh(document)
    
    # Update S3 path with actual document ID
    if file_path and storage_service.s3_client:
        # Delete temporary upload
        storage_service.delete_document(file_path)
        # Upload with correct document ID
        new_file_path = storage_service.upload_document(
            document_id=document.id,
            content=content_str,
            tenant_id=tenant_id
        )
        if new_file_path:
            document.file_path = new_file_path
            await session.commit()
    
    return document


async def get_document_by_id(
    session: AsyncSession,
    document_id: int,
    user_id: Optional[int] = None
) -> Optional[Document]:
    """
    Get document by ID
    
    Args:
        session: Database session
        document_id: Document ID
        user_id: Optional user ID for permission check
        
    Returns:
        Document if found and accessible
        
    Raises:
        HTTPException: If document not found or not accessible
    """
    result = await session.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Load content from S3 if stored there
    if document.file_path and not document.content:
        s3_content = storage_service.download_document(document.file_path)
        if s3_content:
            document.content = s3_content
        else:
            # S3 load failed, log error but continue
            import logging
            logging.error(f"Failed to load document {document_id} from S3: {document.file_path}")
    
    # Check access permissions
    if user_id:
        # Owner can always access
        if document.owner_id == user_id:
            return document
        
        # Public documents are accessible to all authenticated users
        if document.visibility == DocumentVisibility.PUBLIC:
            return document
        
        # Check studio membership for STUDIO visibility
        if document.visibility == DocumentVisibility.STUDIO:
            if document.studio_id:
                # Query studio membership
                from app.models.studio import StudioMember
                studio_member_result = await session.execute(
                    select(StudioMember).where(
                        StudioMember.studio_id == document.studio_id,
                        StudioMember.user_id == user_id,
                        StudioMember.is_active == True,
                        StudioMember.is_approved == True
                    )
                )
                studio_member = studio_member_result.scalar_one_or_none()
                
                if studio_member:
                    return document
            
            # Not a studio member - deny access
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be an approved studio member to access this document"
            )
        
        # Check collaborator status for non-public documents
        from app.models.document import DocumentCollaborator
        collaborator_result = await session.execute(
            select(DocumentCollaborator).where(
                DocumentCollaborator.document_id == document.id,
                DocumentCollaborator.user_id == user_id
            )
        )
        collaborator = collaborator_result.scalar_one_or_none()
        
        if collaborator:
            # Collaborator has access
            return document
        
        # If not owner and document is private
        if document.visibility == DocumentVisibility.PRIVATE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this document"
            )
    
    return document


async def list_user_documents(
    session: AsyncSession,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[DocumentStatus] = None,
    project_id: Optional[int] = None,
    folder_id: Optional[int] = None
) -> Tuple[List[Document], int]:
    """
    List documents owned by a user
    
    Args:
        session: Database session
        user_id: Owner user ID
        page: Page number (1-indexed)
        page_size: Items per page
        status_filter: Optional status filter
        project_id: Optional project ID filter
        folder_id: Optional folder ID filter (filters by project.folder_id)
        
    Returns:
        Tuple of (documents list, total count)
    """
    # Base query - join with Project to filter by folder
    # EXCLUDE soft-deleted documents by default
    # Note: Removed joinedload(Document.owner) to avoid WITHIN GROUP error with ORDER BY
    query = select(Document).where(
        Document.owner_id == user_id,
        Document.is_deleted == False
    )
    
    # Apply project filter
    if project_id is not None:
        query = query.where(Document.project_id == project_id)
    
    # Apply folder filter (via project relationship)
    if folder_id is not None:
        from app.models.project import Project
        query = query.join(Project, Document.project_id == Project.id).where(Project.folder_id == folder_id)
    
    # Apply status filter
    if status_filter:
        query = query.where(Document.status == status_filter)
    
    # Order by most recent first
    query = query.order_by(Document.updated_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(Document).where(
        Document.owner_id == user_id,
        Document.is_deleted == False
    )
    if project_id is not None:
        count_query = count_query.where(Document.project_id == project_id)
    if folder_id is not None:
        from app.models.project import Project
        count_query = count_query.join(Project, Document.project_id == Project.id).where(Project.folder_id == folder_id)
    if status_filter:
        count_query = count_query.where(Document.status == status_filter)
    
    total_result = await session.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await session.execute(query)
    documents = result.scalars().all()
    
    return list(documents), total


async def update_document(
    session: AsyncSession,
    document_id: int,
    document_data: DocumentUpdate,
    user_id: int
) -> Document:
    """
    Update a document
    
    Args:
        session: Database session
        document_id: Document ID
        document_data: Update data
        user_id: User performing the update
        
    Returns:
        Updated document
        
    Raises:
        HTTPException: If document not found or user doesn't have permission
    """
    # Get document and check ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    # Check if user has edit permission
    can_edit = False
    
    # Owner can always edit
    if document.owner_id == user_id:
        can_edit = True
    else:
        # Check if user is a collaborator with edit permission
        from app.models.document import DocumentCollaborator, CollaboratorRole
        collaborator_result = await session.execute(
            select(DocumentCollaborator).where(
                DocumentCollaborator.document_id == document_id,
                DocumentCollaborator.user_id == user_id
            )
        )
        collaborator = collaborator_result.scalar_one_or_none()
        
        if collaborator:
            # Check if collaborator role allows editing
            # OWNER and EDITOR can edit, others cannot
            if collaborator.role in [CollaboratorRole.OWNER, CollaboratorRole.EDITOR]:
                can_edit = True
            elif collaborator.can_edit:  # Explicit permission flag
                can_edit = True
    
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this document"
        )
    
    # Update fields
    update_data = document_data.model_dump(exclude_unset=True)
    
    content_updated = False
    new_content = None
    
    for field, value in update_data.items():
        if value is not None:
            # Handle content updates
            if field == "content":
                content_updated = True
                # Convert dict content to JSON string
                if isinstance(value, dict):
                    value = json.dumps(value)
                new_content = value
                
                # Upload to S3 if configured
                if storage_service.s3_client:
                    file_path = storage_service.upload_document(
                        document_id=document.id,
                        content=value,
                        tenant_id=document.tenant_id
                    )
                    if file_path:
                        # Delete old S3 file if exists
                        if document.file_path:
                            storage_service.delete_document(document.file_path)
                        
                        document.file_path = file_path
                        document.file_size = len(value.encode('utf-8'))
                        # Don't store in database if S3 upload succeeded
                        setattr(document, field, None)
                    else:
                        # S3 upload failed, store in database
                        setattr(document, field, value)
                else:
                    # S3 not configured, store in database
                    setattr(document, field, value)
            else:
                setattr(document, field, value)
    
    # Recalculate word count if content changed
    if content_updated and new_content:
        document.word_count = count_words(new_content)
    
    # Update published_at if status changes to published
    if document_data.status == DocumentStatus.PUBLISHED and document.published_at is None:
        document.published_at = datetime.now(timezone.utc)
    
    # Increment version
    document.current_version += 1
    
    await session.commit()
    await session.refresh(document)
    
    return document


async def delete_document(
    session: AsyncSession,
    document_id: int,
    user_id: int
) -> None:
    """
    Soft delete a document (move to trash)
    
    Args:
        session: Database session
        document_id: Document ID
        user_id: User performing the deletion
        
    Raises:
        HTTPException: If document not found or user doesn't have permission
    
    Note: This performs a SOFT DELETE (moves to trash).
    Use TrashService.permanently_delete_document() for hard delete.
    """
    try:
        from app.services.trash_service import TrashService
        await TrashService.move_document_to_trash(session, document_id, user_id)
        
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        elif "access denied" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this document"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to delete document {document_id}: {type(e).__name__}: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


async def list_public_documents(
    session: AsyncSession,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Document], int]:
    """
    List public published documents
    
    Args:
        session: Database session
        page: Page number (1-indexed)
        page_size: Items per page
        
    Returns:
        Tuple of (documents list, total count)
    """
    # Query for public, published documents with owner eager loaded
    query = select(Document).options(
        joinedload(Document.owner)
    ).where(
        Document.visibility == DocumentVisibility.PUBLIC,
        Document.status == DocumentStatus.PUBLISHED
    ).order_by(Document.published_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(Document).where(
        Document.visibility == DocumentVisibility.PUBLIC,
        Document.status == DocumentStatus.PUBLISHED
    )
    
    total_result = await session.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await session.execute(query)
    documents = result.scalars().all()
    
    return list(documents), total


# ============================================================================
# Document Versioning & Mode Management (Git-style workflow for writers)
# ============================================================================

async def list_document_versions(
    session: AsyncSession,
    document_id: int,
    user_id: int
) -> List[Dict[str, Any]]:
    """
    List all versions of a document (Git-style history)
    
    Returns:
        List of version dictionaries with metadata
    """
    # Get document and verify ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    # Query versions with creator eager loaded
    query = select(DocumentVersion).options(
        joinedload(DocumentVersion.created_by)
    ).where(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version.desc())
    
    result = await session.execute(query)
    versions = result.scalars().all()
    
    # Format response (Git-log style)
    version_list = []
    for v in versions:
        version_list.append({
            "version": v.version,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "created_by": {
                "id": v.created_by.id if v.created_by else None,
                "username": v.created_by.username if v.created_by else "Unknown"
            },
            "change_summary": v.change_summary,
            "mode": v.mode,
            "previous_mode": v.previous_mode,
            "is_mode_transition": v.is_mode_transition,
            "is_major_version": v.is_major_version,
            "word_count": v.word_count,
            "title": v.title
        })
    
    return version_list


async def get_document_version(
    session: AsyncSession,
    document_id: int,
    version_number: int,
    user_id: int
) -> Dict[str, Any]:
    """
    Get a specific version of a document
    
    Returns:
        Full version data including content
    """
    # Verify ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    # Get version
    query = select(DocumentVersion).options(
        joinedload(DocumentVersion.created_by)
    ).where(
        DocumentVersion.document_id == document_id,
        DocumentVersion.version == version_number
    )
    
    result = await session.execute(query)
    version = result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Version {version_number} not found for document {document_id}"
        )
    
    return {
        "version": version.version,
        "created_at": version.created_at.isoformat() if version.created_at else None,
        "created_by": {
            "id": version.created_by.id if version.created_by else None,
            "username": version.created_by.username if version.created_by else "Unknown"
        },
        "title": version.title,
        "content": version.content,
        "content_html": version.content_html,
        "word_count": version.word_count,
        "change_summary": version.change_summary,
        "mode": version.mode,
        "previous_mode": version.previous_mode,
        "is_mode_transition": version.is_mode_transition,
        "is_major_version": version.is_major_version
    }


async def restore_document_version(
    session: AsyncSession,
    document_id: int,
    version_number: int,
    user_id: int
) -> Document:
    """
    Restore a document to a previous version (Git checkout)
    
    Creates a new version with the restored content
    """
    from datetime import datetime
    
    # Get document and verify ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    # Get the version to restore
    version_data = await get_document_version(session, document_id, version_number, user_id)
    
    # Create a new version before restoration
    current_mode = document.mode
    new_version = DocumentVersion(
        document_id=document.id,
        version=document.current_version + 1,
        title=version_data["title"],
        content=version_data["content"],
        content_html=version_data["content_html"],
        word_count=version_data["word_count"],
        mode=current_mode,
        previous_mode=current_mode,
        created_by_id=user_id,
        change_summary=f"Restored from version {version_number}",
        is_mode_transition=False,
        is_major_version=True  # Restoration is a major change
    )
    session.add(new_version)
    
    # Update document with restored content
    document.title = version_data["title"]
    document.content = version_data["content"]
    document.content_html = version_data["content_html"]
    document.word_count = version_data["word_count"]
    document.current_version += 1
    document.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(document)
    
    return document


async def create_manual_version(
    session: AsyncSession,
    document_id: int,
    user_id: int,
    change_summary: str
) -> Dict[str, Any]:
    """
    Create a manual version snapshot (Git commit)
    """
    from datetime import datetime
    
    # Get document and verify ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    # Create new version
    new_version = DocumentVersion(
        document_id=document.id,
        version=document.current_version + 1,
        title=document.title,
        content=document.content or "",
        content_html=document.content_html,
        word_count=document.word_count or 0,
        mode=document.mode,
        previous_mode=document.mode,
        created_by_id=user_id,
        change_summary=change_summary,
        is_mode_transition=False,
        is_major_version=False
    )
    session.add(new_version)
    
    # Update document version counter
    document.current_version += 1
    document.updated_at = datetime.now(timezone.utc)
    
    await session.commit()
    await session.refresh(new_version)
    
    return {
        "version": new_version.version,
        "created_at": new_version.created_at.isoformat() if new_version.created_at else None,
        "change_summary": new_version.change_summary,
        "mode": new_version.mode
    }


async def change_document_mode(
    session: AsyncSession,
    document_id: int,
    user_id: int,
    new_mode: 'DocumentMode',
    change_summary: Optional[str] = None
) -> Document:
    """
    Change document mode with automatic versioning
    
    Modes: alpha (Draft Room) → beta (Workshop) → publish (Print Queue) → read (Bookshelf)
    """
    from datetime import datetime
    from app.models.document import DocumentMode
    
    # Get document and verify ownership
    document = await get_document_by_id(session, document_id, user_id)
    
    previous_mode = document.mode
    
    # Validate mode transition (can go forward or backward)
    if previous_mode == new_mode:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is already in {new_mode} mode"
        )
    
    # Create version snapshot for mode transition
    transition_message = change_summary or f"Mode changed: {previous_mode} → {new_mode}"
    
    new_version = DocumentVersion(
        document_id=document.id,
        version=document.current_version + 1,
        title=document.title,
        content=document.content or "",
        content_html=document.content_html,
        word_count=document.word_count or 0,
        mode=new_mode,
        previous_mode=previous_mode,
        created_by_id=user_id,
        change_summary=transition_message,
        is_mode_transition=True,
        is_major_version=True  # Mode transitions are major versions
    )
    session.add(new_version)
    
    # Update document mode
    document.mode = new_mode
    document.current_version += 1
    document.updated_at = datetime.now(timezone.utc)
    
    # Apply mode-specific logic
    if new_mode == DocumentMode.PUBLISH:
        # Lock document in publish mode
        document.is_locked = True
    elif previous_mode == DocumentMode.PUBLISH and new_mode in [DocumentMode.ALPHA, DocumentMode.BETA]:
        # Unlock when moving back from publish
        document.is_locked = False
    
    await session.commit()
    await session.refresh(document)
    
    return document
