"""
Comment service for managing comments and reactions on documents.
"""
from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Comment, CommentReaction, User


class CommentService:
    """Service for managing comments and comment reactions."""
    
    @staticmethod
    async def create_comment(
        db: AsyncSession,
        document_id: int,
        user_id: int,
        content: str,
        parent_id: Optional[int] = None,
        anchor: Optional[dict] = None
    ) -> Comment:
        """Create a new comment on a document."""
        comment = Comment(
            document_id=document_id,
            user_id=user_id,
            content=content,
            parent_id=parent_id,
            anchor=anchor
        )
        db.add(comment)
        await db.commit()
        await db.refresh(comment)
        
        # Load user relationship
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.id == comment.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def get_comments(
        db: AsyncSession,
        document_id: int,
        parent_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Comment]:
        """Get comments for a document, optionally filtered by parent."""
        query = select(Comment).options(
            selectinload(Comment.user),
            selectinload(Comment.replies)
        ).where(Comment.document_id == document_id)
        
        if parent_id is not None:
            query = query.where(Comment.parent_id == parent_id)
        else:
            # Get top-level comments only (no parent)
            query = query.where(Comment.parent_id.is_(None))
        
        query = query.order_by(Comment.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_comment_by_id(db: AsyncSession, comment_id: int) -> Optional[Comment]:
        """Get a comment by ID with user loaded."""
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.user), selectinload(Comment.replies))
            .where(Comment.id == comment_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_comment(
        db: AsyncSession,
        comment_id: int,
        user_id: int,
        content: str
    ) -> Optional[Comment]:
        """Update a comment (only by owner)."""
        result = await db.execute(
            select(Comment).where(
                and_(Comment.id == comment_id, Comment.user_id == user_id)
            )
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            return None
        
        comment.content = content
        comment.is_edited = True
        await db.commit()
        await db.refresh(comment)
        
        # Load user relationship
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.user))
            .where(Comment.id == comment.id)
        )
        return result.scalar_one()
    
    @staticmethod
    async def delete_comment(
        db: AsyncSession,
        comment_id: int,
        user_id: int
    ) -> bool:
        """Delete a comment (only by owner)."""
        result = await db.execute(
            select(Comment).where(
                and_(Comment.id == comment_id, Comment.user_id == user_id)
            )
        )
        comment = result.scalar_one_or_none()
        
        if not comment:
            return False
        
        await db.delete(comment)
        await db.commit()
        return True
    
    @staticmethod
    async def add_reaction(
        db: AsyncSession,
        comment_id: int,
        user_id: int,
        reaction_type: str
    ) -> CommentReaction:
        """Add a reaction to a comment."""
        # Check if reaction already exists
        result = await db.execute(
            select(CommentReaction).where(
                and_(
                    CommentReaction.comment_id == comment_id,
                    CommentReaction.user_id == user_id,
                    CommentReaction.reaction_type == reaction_type
                )
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            return existing
        
        reaction = CommentReaction(
            comment_id=comment_id,
            user_id=user_id,
            reaction_type=reaction_type
        )
        db.add(reaction)
        await db.commit()
        await db.refresh(reaction)
        return reaction
    
    @staticmethod
    async def remove_reaction(
        db: AsyncSession,
        comment_id: int,
        user_id: int,
        reaction_type: str
    ) -> bool:
        """Remove a reaction from a comment."""
        result = await db.execute(
            select(CommentReaction).where(
                and_(
                    CommentReaction.comment_id == comment_id,
                    CommentReaction.user_id == user_id,
                    CommentReaction.reaction_type == reaction_type
                )
            )
        )
        reaction = result.scalar_one_or_none()
        
        if not reaction:
            return False
        
        await db.delete(reaction)
        await db.commit()
        return True
    
    @staticmethod
    async def get_comment_reactions(
        db: AsyncSession,
        comment_id: int
    ) -> List[CommentReaction]:
        """Get all reactions for a comment."""
        result = await db.execute(
            select(CommentReaction)
            .options(selectinload(CommentReaction.user))
            .where(CommentReaction.comment_id == comment_id)
            .order_by(CommentReaction.created_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_reaction_counts(
        db: AsyncSession,
        comment_id: int
    ) -> dict:
        """Get reaction counts grouped by type for a comment."""
        result = await db.execute(
            select(
                CommentReaction.reaction_type,
                func.count(CommentReaction.id).label('count')
            )
            .where(CommentReaction.comment_id == comment_id)
            .group_by(CommentReaction.reaction_type)
        )
        
        counts = {}
        for row in result:
            counts[row.reaction_type] = row.count
        
        return counts
