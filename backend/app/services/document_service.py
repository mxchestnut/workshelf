"""
Document Service
Business logic for document operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional, List, Tuple, Union
from datetime import datetime
import json

from app.models.document import Document, DocumentStatus, DocumentVisibility
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate
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
    
    # Convert content to string if it's a dict (for database storage)
    content_str = document_data.content
    if isinstance(document_data.content, dict):
        content_str = json.dumps(document_data.content)
    
    document = Document(
        owner_id=owner_id,
        tenant_id=tenant_id,
        title=document_data.title,
        content=content_str,
        description=document_data.description,
        status=document_data.status,
        visibility=document_data.visibility,
        project_id=project_id,
        studio_id=document_data.studio_id,
        word_count=word_count,
        current_version=1
    )
    
    session.add(document)
    await session.commit()
    await session.refresh(document)
    
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
            folder_id: Optional folder ID filter (filters by project.folder_id)
        
    Returns:
        Tuple of (documents list, total count)
    """
    # Base query - join with Project to filter by folder
    query = select(Document).where(Document.owner_id == user_id)
    
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
    count_query = select(func.count()).select_from(Document).where(Document.owner_id == user_id)
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
    
    for field, value in update_data.items():
        if value is not None:
            # Convert dict content to JSON string for database storage
            if field == "content" and isinstance(value, dict):
                value = json.dumps(value)
            setattr(document, field, value)
    
    # Recalculate word count if content changed
    if "content" in update_data:
        document.word_count = count_words(document.content)
    
    # Update published_at if status changes to published
    if document_data.status == DocumentStatus.PUBLISHED and document.published_at is None:
        document.published_at = datetime.utcnow()
    
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
    Delete a document
    
    Args:
        session: Database session
        document_id: Document ID
        user_id: User performing the deletion
        
    Raises:
        HTTPException: If document not found or user doesn't have permission
    """
    try:
        # Get the document
        result = await session.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Check ownership
        if document.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this document"
            )
        
        # Delete the document (CASCADE should handle related records)
        await session.delete(document)
        await session.flush()  # Flush before commit to catch constraint errors
        await session.commit()
        
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
    # Query for public, published documents
    query = select(Document).where(
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
