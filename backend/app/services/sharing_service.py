from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from datetime import datetime, timezone
from typing import Optional
import secrets
import hashlib

from ..models.social import ShareLink
from ..models.document import Document


class SharingService:
    """Service for managing document sharing."""
    
    @staticmethod
    def _generate_token(length: int = 32) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """Hash a password."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    async def create_share_link(
        db: AsyncSession,
        document_id: int,
        created_by: int,
        password: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        allow_downloads: bool = True,
        allow_comments: bool = False
    ) -> ShareLink:
        """Create a share link for a document."""
        token = SharingService._generate_token()
        password_hash = SharingService._hash_password(password) if password else None
        
        share_link = ShareLink(
            document_id=document_id,
            created_by=created_by,
            token=token,
            password_hash=password_hash,
            expires_at=expires_at,
            is_active=True,
            allow_downloads=allow_downloads,
            allow_comments=allow_comments,
            view_count=0
        )
        db.add(share_link)
        await db.commit()
        await db.refresh(share_link)
        return share_link
    
    @staticmethod
    async def get_share_link(db: AsyncSession, token: str) -> Optional[ShareLink]:
        """Get share link by token."""
        result = await db.execute(select(ShareLink).filter(ShareLink.token == token))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def validate_share_link(
        db: AsyncSession,
        token: str,
        password: Optional[str] = None
    ) -> tuple[Optional[ShareLink], Optional[str]]:
        """
        Validate a share link and password.
        Returns (share_link, error_message).
        """
        share_link = await SharingService.get_share_link(db, token)
        
        if not share_link:
            return None, "Share link not found"
        
        if not share_link.is_active:
            return None, "Share link is no longer active"
        
        if share_link.expires_at and share_link.expires_at < datetime.now(timezone.utc):
            return None, "Share link has expired"
        
        # Check password if required
        if share_link.password_hash:
            if not password:
                return None, "Password required"
            if SharingService._hash_password(password) != share_link.password_hash:
                return None, "Invalid password"
        
        return share_link, None
    
    @staticmethod
    async def access_share_link(
        db: AsyncSession,
        token: str,
        password: Optional[str] = None
    ) -> tuple[Optional[Document], Optional[str]]:
        """
        Access a shared document via share link.
        Returns (document, error_message).
        """
        share_link, error = await SharingService.validate_share_link(db, token, password)
        
        if error:
            return None, error
        
        # Increment view count and update last accessed
        share_link.view_count += 1
        share_link.last_accessed_at = datetime.now(timezone.utc)
        share_link.updated_at = datetime.now(timezone.utc)
        await db.commit()
        
        # Get the document
        result = await db.execute(select(Document).filter(Document.id == share_link.document_id))
        document = result.scalar_one_or_none()
        
        if not document:
            return None, "Document not found"
        
        return document, None
    
    @staticmethod
    async def update_share_link(
        db: AsyncSession,
        token: str,
        created_by: int,
        expires_at: Optional[datetime] = None,
        is_active: Optional[bool] = None,
        allow_downloads: Optional[bool] = None,
        allow_comments: Optional[bool] = None
    ) -> Optional[ShareLink]:
        """Update share link settings."""
        result = await db.execute(
            select(ShareLink).filter(
                and_(
                    ShareLink.token == token,
                    ShareLink.created_by == created_by
                )
            )
        )
        share_link = result.scalar_one_or_none()
        
        if not share_link:
            return None
        
        if expires_at is not None:
            share_link.expires_at = expires_at
        if is_active is not None:
            share_link.is_active = is_active
        if allow_downloads is not None:
            share_link.allow_downloads = allow_downloads
        if allow_comments is not None:
            share_link.allow_comments = allow_comments
        
        share_link.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(share_link)
        return share_link
    
    @staticmethod
    async def delete_share_link(db: AsyncSession, token: str, created_by: int) -> bool:
        """Delete a share link."""
        result = await db.execute(
            select(ShareLink).filter(
                and_(
                    ShareLink.token == token,
                    ShareLink.created_by == created_by
                )
            )
        )
        share_link = result.scalar_one_or_none()
        
        if not share_link:
            return False
        
        await db.delete(share_link)
        await db.commit()
        return True
    
    @staticmethod
    async def get_document_share_links(
        db: AsyncSession,
        document_id: int,
        created_by: int
    ) -> list[ShareLink]:
        """Get all share links for a document."""
        result = await db.execute(
            select(ShareLink).filter(
                and_(
                    ShareLink.document_id == document_id,
                    ShareLink.created_by == created_by
                )
            )
        )
        return list(result.scalars().all())
