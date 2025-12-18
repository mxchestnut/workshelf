"""Comments API - Comment and reaction management"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.services.comment_service import CommentService
from app.schemas.collaboration import (
    CommentCreate, CommentUpdate, CommentResponse,
    CommentReactionCreate, CommentReactionResponse
)

router = APIRouter(prefix="/comments", tags=["comments"])


@router.post("/documents/{document_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    document_id: int,
    comment_data: CommentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a comment on a document."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    comment = await CommentService.create_comment(
        db,
        document_id,
        user.id,
        comment_data.content,
        comment_data.parent_id,
        comment_data.anchor
    )
    return comment


@router.get("/documents/{document_id}/comments", response_model=List[CommentResponse])
async def get_document_comments(
    document_id: int,
    parent_id: int = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get comments for a document."""
    comments = await CommentService.get_comments(db, document_id, parent_id, limit, offset)
    return comments


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific comment."""
    comment = await CommentService.get_comment_by_id(db, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a comment (owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    comment = await CommentService.update_comment(db, comment_id, user.id, comment_data.content)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a comment (owner only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    success = await CommentService.delete_comment(db, comment_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    return None


@router.post("/{comment_id}/reactions", response_model=CommentReactionResponse, status_code=status.HTTP_201_CREATED)
async def add_reaction(
    comment_id: int,
    reaction_data: CommentReactionCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a reaction to a comment."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    reaction = await CommentService.add_reaction(db, comment_id, user.id, reaction_data.reaction_type)
    return reaction


@router.delete("/{comment_id}/reactions/{reaction_type}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_reaction(
    comment_id: int,
    reaction_type: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a reaction from a comment."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    success = await CommentService.remove_reaction(db, comment_id, user.id, reaction_type)
    if not success:
        raise HTTPException(status_code=404, detail="Reaction not found")
    return None


@router.get("/{comment_id}/reactions", response_model=List[CommentReactionResponse])
async def get_comment_reactions(
    comment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all reactions for a comment."""
    reactions = await CommentService.get_comment_reactions(db, comment_id)
    return reactions
