"""
Test document access control with studio membership and collaborator checks

Tests verify that:
1. Studio members can access STUDIO visibility documents
2. Non-members cannot access STUDIO visibility documents
3. Collaborators can access private documents they're invited to
4. EDITOR collaborators can edit documents
5. VIEWER/COMMENTER collaborators cannot edit documents
6. Owners can always access and edit their documents
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.document_service import get_document_by_id, update_document
from app.models.document import Document, DocumentVisibility, DocumentStatus, CollaboratorRole
from app.schemas.document import DocumentUpdate


@pytest.fixture
def mock_session():
    """Create a mock database session"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def sample_document():
    """Create a sample document"""
    return Document(
        id=1,
        owner_id=100,
        tenant_id=1,
        title="Test Document",
        status=DocumentStatus.DRAFT,
        visibility=DocumentVisibility.PRIVATE,
        studio_id=None
    )


@pytest.fixture
def studio_document():
    """Create a studio document"""
    return Document(
        id=2,
        owner_id=100,
        tenant_id=1,
        title="Studio Document",
        status=DocumentStatus.PUBLISHED,
        visibility=DocumentVisibility.STUDIO,
        studio_id=50
    )


# ============================================================================
# Studio Membership Access Tests
# ============================================================================

@pytest.mark.asyncio
async def test_studio_member_can_access_studio_document(mock_session, studio_document):
    """Test that studio members can access STUDIO visibility documents"""
    user_id = 200  # Not the owner
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = studio_document
    
    # Mock studio membership query - user IS a member
    member_result = MagicMock()
    member_result.scalar_one_or_none.return_value = MagicMock(
        studio_id=50,
        user_id=user_id,
        is_active=True,
        is_approved=True
    )
    
    # Setup execute to return different results for different queries
    mock_session.execute.side_effect = [doc_result, member_result]
    
    # Should succeed
    result = await get_document_by_id(mock_session, studio_document.id, user_id)
    
    assert result == studio_document


@pytest.mark.asyncio
async def test_non_studio_member_cannot_access_studio_document(mock_session, studio_document):
    """Test that non-members cannot access STUDIO visibility documents"""
    user_id = 200  # Not the owner or studio member
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = studio_document
    
    # Mock studio membership query - user is NOT a member
    member_result = MagicMock()
    member_result.scalar_one_or_none.return_value = None
    
    mock_session.execute.side_effect = [doc_result, member_result]
    
    # Should raise 403
    with pytest.raises(HTTPException) as exc_info:
        await get_document_by_id(mock_session, studio_document.id, user_id)
    
    assert exc_info.value.status_code == 403
    assert "studio member" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_unapproved_studio_member_cannot_access(mock_session, studio_document):
    """Test that unapproved members cannot access even if in studio"""
    user_id = 200
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = studio_document
    
    # Mock studio membership query - user is member but NOT approved
    member_result = MagicMock()
    member_result.scalar_one_or_none.return_value = MagicMock(
        studio_id=50,
        user_id=user_id,
        is_active=True,
        is_approved=False  # Not approved!
    )
    
    mock_session.execute.side_effect = [doc_result, member_result]
    
    # Should raise 403
    with pytest.raises(HTTPException) as exc_info:
        await get_document_by_id(mock_session, studio_document.id, user_id)
    
    assert exc_info.value.status_code == 403


# ============================================================================
# Collaborator Access Tests
# ============================================================================

@pytest.mark.asyncio
async def test_collaborator_can_access_private_document(mock_session, sample_document):
    """Test that collaborators can access private documents"""
    user_id = 200  # Not the owner
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    # Mock collaborator query - user IS a collaborator
    collab_result = MagicMock()
    collab_result.scalar_one_or_none.return_value = MagicMock(
        document_id=sample_document.id,
        user_id=user_id,
        role=CollaboratorRole.VIEWER
    )
    
    mock_session.execute.side_effect = [doc_result, collab_result]
    
    # Should succeed
    result = await get_document_by_id(mock_session, sample_document.id, user_id)
    
    assert result == sample_document


@pytest.mark.asyncio
async def test_non_collaborator_cannot_access_private_document(mock_session, sample_document):
    """Test that non-collaborators cannot access private documents"""
    user_id = 200  # Not owner or collaborator
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    # Mock collaborator query - user is NOT a collaborator
    collab_result = MagicMock()
    collab_result.scalar_one_or_none.return_value = None
    
    mock_session.execute.side_effect = [doc_result, collab_result]
    
    # Should raise 403
    with pytest.raises(HTTPException) as exc_info:
        await get_document_by_id(mock_session, sample_document.id, user_id)
    
    assert exc_info.value.status_code == 403
    assert "permission" in exc_info.value.detail.lower()


# ============================================================================
# Collaborator Edit Permission Tests
# ============================================================================

@pytest.mark.asyncio
async def test_editor_collaborator_can_edit(mock_session, sample_document):
    """Test that EDITOR collaborators can edit documents"""
    user_id = 200  # Not the owner
    
    # Mock document query for get_document_by_id
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    # Mock collaborator query - user is EDITOR
    collab_result = MagicMock()
    collab_result.scalar_one_or_none.return_value = MagicMock(
        document_id=sample_document.id,
        user_id=user_id,
        role=CollaboratorRole.EDITOR,
        can_edit=True
    )
    
    # Mock execute to return results in order
    mock_session.execute.side_effect = [
        doc_result,  # First call in get_document_by_id
        collab_result,  # Second call for collaborator access check
        collab_result,  # Third call for edit permission check
    ]
    
    # Mock commit and refresh
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    
    update_data = DocumentUpdate(title="Updated Title")
    
    # Should succeed
    result = await update_document(mock_session, sample_document.id, update_data, user_id)
    
    assert mock_session.commit.called


@pytest.mark.asyncio
async def test_viewer_collaborator_cannot_edit(mock_session, sample_document):
    """Test that VIEWER collaborators cannot edit documents"""
    user_id = 200  # Not the owner
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    # Mock collaborator query - user is VIEWER (read-only)
    collab_result = MagicMock()
    collab_result.scalar_one_or_none.return_value = MagicMock(
        document_id=sample_document.id,
        user_id=user_id,
        role=CollaboratorRole.VIEWER,  # Viewer role
        can_edit=False  # Cannot edit
    )
    
    mock_session.execute.side_effect = [
        doc_result,  # get_document_by_id
        collab_result,  # access check
        collab_result,  # edit permission check
    ]
    
    update_data = DocumentUpdate(title="Updated Title")
    
    # Should raise 403
    with pytest.raises(HTTPException) as exc_info:
        await update_document(mock_session, sample_document.id, update_data, user_id)
    
    assert exc_info.value.status_code == 403
    assert "edit" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_commenter_with_explicit_edit_permission(mock_session, sample_document):
    """Test that collaborators with explicit can_edit=True can edit"""
    user_id = 200
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    # Mock collaborator query - COMMENTER but with explicit edit permission
    collab_result = MagicMock()
    collab_result.scalar_one_or_none.return_value = MagicMock(
        document_id=sample_document.id,
        user_id=user_id,
        role=CollaboratorRole.COMMENTER,
        can_edit=True  # Explicit permission
    )
    
    mock_session.execute.side_effect = [
        doc_result,
        collab_result,
        collab_result,
    ]
    
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    
    update_data = DocumentUpdate(title="Updated Title")
    
    # Should succeed due to explicit permission
    result = await update_document(mock_session, sample_document.id, update_data, user_id)
    
    assert mock_session.commit.called


# ============================================================================
# Owner Tests
# ============================================================================

@pytest.mark.asyncio
async def test_owner_can_always_access(mock_session, sample_document):
    """Test that owners can always access their documents"""
    user_id = 100  # Owner ID
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    mock_session.execute.return_value = doc_result
    
    # Should succeed without checking collaborators
    result = await get_document_by_id(mock_session, sample_document.id, user_id)
    
    assert result == sample_document


@pytest.mark.asyncio
async def test_owner_can_always_edit(mock_session, sample_document):
    """Test that owners can always edit their documents"""
    user_id = 100  # Owner ID
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = sample_document
    
    mock_session.execute.return_value = doc_result
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    
    update_data = DocumentUpdate(title="Updated by Owner")
    
    # Should succeed without checking collaborators
    result = await update_document(mock_session, sample_document.id, update_data, user_id)
    
    assert mock_session.commit.called


# ============================================================================
# Public Document Tests
# ============================================================================

@pytest.mark.asyncio
async def test_anyone_can_access_public_document(mock_session):
    """Test that any authenticated user can access public documents"""
    public_doc = Document(
        id=3,
        owner_id=100,
        tenant_id=1,
        title="Public Document",
        status=DocumentStatus.PUBLISHED,
        visibility=DocumentVisibility.PUBLIC
    )
    
    user_id = 999  # Random user
    
    # Mock document query
    doc_result = MagicMock()
    doc_result.scalar_one_or_none.return_value = public_doc
    
    mock_session.execute.return_value = doc_result
    
    # Should succeed
    result = await get_document_by_id(mock_session, public_doc.id, user_id)
    
    assert result == public_doc


if __name__ == "__main__":
    print("Run with: pytest test_document_access_control.py -v")
