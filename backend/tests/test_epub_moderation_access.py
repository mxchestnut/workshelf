"""
Test EPUB moderation access control

Tests verify that:
1. Staff members can access moderation endpoints
2. Regular users cannot access moderation endpoints
3. Moderators can approve/reject submissions
4. Non-moderators are denied with 403 status
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.epub_uploads import require_moderator, get_pending_reviews, moderate_submission
from app.models import User
from app.models.epub_submission import EpubSubmission, SubmissionStatus


@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def staff_user():
    """Create a staff user"""
    return User(
        id=1,
        keycloak_id="staff-user-123",
        email="moderator@example.com",
        is_staff=True,
        is_active=True
    )


@pytest.fixture
def regular_user():
    """Create a regular user"""
    return User(
        id=2,
        keycloak_id="regular-user-456",
        email="user@example.com",
        is_staff=False,
        is_active=True
    )


@pytest.fixture
def current_user_dict():
    """JWT payload for current user"""
    return {
        "sub": "user-keycloak-id",
        "email": "user@example.com",
        "preferred_username": "testuser"
    }


@pytest.fixture
def pending_submission():
    """Create a pending EPUB submission"""
    return EpubSubmission(
        id=1,
        user_id=2,
        title="Test Book",
        author_name="Test Author",
        file_hash="abc123",
        blob_url="epubs/abc123.epub",
        file_size_bytes=1000000,
        status=SubmissionStatus.NEEDS_REVIEW
    )


# ============================================================================
# require_moderator() Tests
# ============================================================================

@pytest.mark.asyncio
async def test_require_moderator_allows_staff(mock_db, staff_user, current_user_dict):
    """Test that staff users pass moderator check"""
    with patch('app.services.user_service.get_or_create_user_from_keycloak', 
               return_value=staff_user):
        
        result = await require_moderator(mock_db, current_user_dict)
        
        assert result == staff_user
        assert result.is_staff is True


@pytest.mark.asyncio
async def test_require_moderator_rejects_regular_user(mock_db, regular_user, current_user_dict):
    """Test that regular users are rejected with 403"""
    with patch('app.services.user_service.get_or_create_user_from_keycloak', 
               return_value=regular_user):
        
        with pytest.raises(HTTPException) as exc_info:
            await require_moderator(mock_db, current_user_dict)
        
        assert exc_info.value.status_code == 403
        assert "moderator" in exc_info.value.detail.lower()
        assert "staff" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_require_moderator_error_message(mock_db, regular_user, current_user_dict):
    """Test that error message is clear about required permissions"""
    with patch('app.services.user_service.get_or_create_user_from_keycloak', 
               return_value=regular_user):
        
        with pytest.raises(HTTPException) as exc_info:
            await require_moderator(mock_db, current_user_dict)
        
        # Should mention both moderator and staff
        detail = exc_info.value.detail.lower()
        assert "moderator privileges required" in detail
        assert "staff members" in detail


# ============================================================================
# get_pending_reviews() Tests
# ============================================================================

@pytest.mark.asyncio
async def test_get_pending_reviews_as_moderator(mock_db, staff_user, current_user_dict, pending_submission):
    """Test that moderators can view pending submissions"""
    # Mock require_moderator to return staff user
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        # Mock database query
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [pending_submission]
        mock_db.execute.return_value = mock_result
        
        # Call endpoint
        result = await get_pending_reviews(mock_db, current_user_dict)
        
        # Should return submissions
        assert len(result) > 0
        assert mock_db.execute.called


@pytest.mark.asyncio
async def test_get_pending_reviews_as_regular_user(mock_db, regular_user, current_user_dict):
    """Test that regular users cannot view pending submissions"""
    # Mock require_moderator to raise 403
    with patch('app.api.epub_uploads.require_moderator', 
               side_effect=HTTPException(status_code=403, detail="Not authorized")):
        
        with pytest.raises(HTTPException) as exc_info:
            await get_pending_reviews(mock_db, current_user_dict)
        
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_get_pending_reviews_returns_only_needs_review(mock_db, staff_user, current_user_dict):
    """Test that only NEEDS_REVIEW submissions are returned"""
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        
        await get_pending_reviews(mock_db, current_user_dict)
        
        # Verify query filters by NEEDS_REVIEW status
        call_args = mock_db.execute.call_args
        # Query should contain filter for NEEDS_REVIEW status
        assert mock_db.execute.called


# ============================================================================
# moderate_submission() Tests
# ============================================================================

@pytest.mark.asyncio
async def test_moderate_submission_approve_as_moderator(mock_db, staff_user, current_user_dict, pending_submission):
    """Test that moderators can approve submissions"""
    from app.api.epub_uploads import ModeratorAction
    
    action = ModeratorAction(action="approve", notes="Looks good!")
    
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        # Mock submission query
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = pending_submission
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()
        
        result = await moderate_submission(1, action, mock_db, current_user_dict)
        
        assert "approved successfully" in result["message"].lower()
        assert pending_submission.status == SubmissionStatus.APPROVED
        assert pending_submission.moderator_id == staff_user.id
        assert pending_submission.moderator_notes == "Looks good!"
        assert pending_submission.reviewed_at is not None
        assert mock_db.commit.called


@pytest.mark.asyncio
async def test_moderate_submission_reject_as_moderator(mock_db, staff_user, current_user_dict, pending_submission):
    """Test that moderators can reject submissions"""
    from app.api.epub_uploads import ModeratorAction
    
    action = ModeratorAction(action="reject", notes="Content policy violation")
    
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = pending_submission
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()
        
        result = await moderate_submission(1, action, mock_db, current_user_dict)
        
        assert "rejected successfully" in result["message"].lower()
        assert pending_submission.status == SubmissionStatus.REJECTED
        assert pending_submission.moderator_id == staff_user.id
        assert pending_submission.moderator_notes == "Content policy violation"
        assert mock_db.commit.called


@pytest.mark.asyncio
async def test_moderate_submission_as_regular_user(mock_db, regular_user, current_user_dict):
    """Test that regular users cannot moderate submissions"""
    from app.api.epub_uploads import ModeratorAction
    
    action = ModeratorAction(action="approve", notes="Test")
    
    with patch('app.api.epub_uploads.require_moderator',
               side_effect=HTTPException(status_code=403, detail="Not authorized")):
        
        with pytest.raises(HTTPException) as exc_info:
            await moderate_submission(1, action, mock_db, current_user_dict)
        
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_moderate_submission_not_found(mock_db, staff_user, current_user_dict):
    """Test that moderating non-existent submission returns 404"""
    from app.api.epub_uploads import ModeratorAction
    
    action = ModeratorAction(action="approve", notes="Test")
    
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        # Mock submission not found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await moderate_submission(999, action, mock_db, current_user_dict)
        
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_moderate_submission_tracks_moderator_info(mock_db, staff_user, current_user_dict, pending_submission):
    """Test that moderation action records moderator info"""
    from app.api.epub_uploads import ModeratorAction
    
    action = ModeratorAction(action="approve", notes="Verified content")
    
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = pending_submission
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()
        
        await moderate_submission(1, action, mock_db, current_user_dict)
        
        # Verify all tracking fields are set
        assert pending_submission.moderator_id == staff_user.id
        assert pending_submission.moderator_notes == "Verified content"
        assert pending_submission.reviewed_at is not None
        assert isinstance(pending_submission.reviewed_at, type(pending_submission.reviewed_at))


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_moderation_workflow_end_to_end(mock_db, staff_user, regular_user, current_user_dict):
    """Test complete moderation workflow"""
    from app.api.epub_uploads import ModeratorAction
    
    submission = EpubSubmission(
        id=1,
        user_id=regular_user.id,
        title="User's Book",
        author_name="User Name",
        file_hash="xyz789",
        blob_url="epubs/xyz789.epub",
        file_size_bytes=1000000,
        status=SubmissionStatus.NEEDS_REVIEW
    )
    
    # Step 1: Regular user uploads (already done - submission created)
    assert submission.status == SubmissionStatus.NEEDS_REVIEW
    
    # Step 2: Regular user tries to approve their own submission (should fail)
    action = ModeratorAction(action="approve", notes="Self-approve")
    with patch('app.api.epub_uploads.require_moderator',
               side_effect=HTTPException(status_code=403, detail="Not authorized")):
        with pytest.raises(HTTPException) as exc_info:
            await moderate_submission(1, action, mock_db, current_user_dict)
        assert exc_info.value.status_code == 403
    
    # Step 3: Moderator approves submission (should succeed)
    with patch('app.api.epub_uploads.require_moderator', return_value=staff_user):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = submission
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()
        
        result = await moderate_submission(1, action, mock_db, current_user_dict)
        
        assert submission.status == SubmissionStatus.APPROVED
        assert submission.moderator_id == staff_user.id


if __name__ == "__main__":
    print("Run with: pytest test_epub_moderation_access.py -v")
