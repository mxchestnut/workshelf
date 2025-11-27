"""
Studio Customization Service - Phase 5
Manages studio themes, branding, and custom domains
"""
from typing import Optional, List, Dict
from datetime import datetime
import secrets
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Studio, StudioTheme, StudioCustomDomain, DocumentView
)


class StudioCustomizationService:
    """Service for managing studio customization features."""
    
    # ========================================================================
    # THEME MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_or_update_theme(
        db: AsyncSession,
        studio_id: int,
        primary_color: Optional[str] = None,
        secondary_color: Optional[str] = None,
        accent_color: Optional[str] = None,
        background_color: Optional[str] = None,
        text_color: Optional[str] = None,
        heading_font: Optional[str] = None,
        body_font: Optional[str] = None,
        code_font: Optional[str] = None,
        custom_css: Optional[str] = None,
        layout_config: Optional[Dict] = None
    ) -> StudioTheme:
        """Create or update studio theme."""
        # Check if theme exists
        result = await db.execute(
            select(StudioTheme).where(StudioTheme.studio_id == studio_id)
        )
        theme = result.scalar_one_or_none()
        
        if theme:
            # Update existing theme
            if primary_color is not None:
                theme.primary_color = primary_color
            if secondary_color is not None:
                theme.secondary_color = secondary_color
            if accent_color is not None:
                theme.accent_color = accent_color
            if background_color is not None:
                theme.background_color = background_color
            if text_color is not None:
                theme.text_color = text_color
            if heading_font is not None:
                theme.heading_font = heading_font
            if body_font is not None:
                theme.body_font = body_font
            if code_font is not None:
                theme.code_font = code_font
            if custom_css is not None:
                theme.custom_css = custom_css
            if layout_config is not None:
                theme.layout_config = layout_config
        else:
            # Create new theme
            theme = StudioTheme(
                studio_id=studio_id,
                primary_color=primary_color or "#3B82F6",
                secondary_color=secondary_color or "#8B5CF6",
                accent_color=accent_color or "#10B981",
                background_color=background_color or "#FFFFFF",
                text_color=text_color or "#1F2937",
                heading_font=heading_font or "Inter",
                body_font=body_font or "Inter",
                code_font=code_font or "JetBrains Mono",
                custom_css=custom_css,
                layout_config=layout_config
            )
            db.add(theme)
        
        await db.commit()
        await db.refresh(theme)
        return theme
    
    @staticmethod
    async def get_studio_theme(
        db: AsyncSession,
        studio_id: int
    ) -> Optional[StudioTheme]:
        """Get studio theme."""
        result = await db.execute(
            select(StudioTheme).where(StudioTheme.studio_id == studio_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_theme(
        db: AsyncSession,
        studio_id: int
    ) -> bool:
        """Delete studio theme (revert to defaults)."""
        result = await db.execute(
            select(StudioTheme).where(StudioTheme.studio_id == studio_id)
        )
        theme = result.scalar_one_or_none()
        
        if not theme:
            return False
        
        await db.delete(theme)
        await db.commit()
        return True
    
    # ========================================================================
    # CUSTOM DOMAIN MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_custom_domain(
        db: AsyncSession,
        studio_id: int,
        domain: str,
        subdomain: Optional[str] = None
    ) -> StudioCustomDomain:
        """Create a custom domain configuration."""
        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        
        # Generate DNS records required for setup
        dns_records = [
            {
                "type": "TXT",
                "name": f"_workshelf-verify.{domain}",
                "value": verification_token,
                "ttl": 3600
            },
            {
                "type": "CNAME",
                "name": subdomain or "@",
                "value": "studios.workshelf.dev",
                "ttl": 3600
            }
        ]
        
        custom_domain = StudioCustomDomain(
            studio_id=studio_id,
            domain=domain,
            subdomain=subdomain,
            verification_token=verification_token,
            dns_records=dns_records,
            status="pending"
        )
        db.add(custom_domain)
        await db.commit()
        await db.refresh(custom_domain)
        return custom_domain
    
    @staticmethod
    async def verify_custom_domain(
        db: AsyncSession,
        domain_id: int
    ) -> StudioCustomDomain:
        """Verify a custom domain (simplified - in production would check DNS)."""
        result = await db.execute(
            select(StudioCustomDomain).where(StudioCustomDomain.id == domain_id)
        )
        custom_domain = result.scalar_one_or_none()
        
        if not custom_domain:
            raise ValueError("Custom domain not found")
        
        # In production, this would:
        # 1. Check DNS records
        # 2. Verify TXT record matches token
        # 3. Verify CNAME points to correct location
        # For now, we'll just mark as verified
        
        custom_domain.is_verified = True
        custom_domain.verified_at = datetime.utcnow()
        custom_domain.status = "active"
        custom_domain.is_active = True
        
        await db.commit()
        await db.refresh(custom_domain)
        return custom_domain
    
    @staticmethod
    async def get_studio_domains(
        db: AsyncSession,
        studio_id: int
    ) -> List[StudioCustomDomain]:
        """Get all custom domains for a studio."""
        result = await db.execute(
            select(StudioCustomDomain)
            .where(StudioCustomDomain.studio_id == studio_id)
            .order_by(StudioCustomDomain.created_at.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def delete_custom_domain(
        db: AsyncSession,
        domain_id: int,
        studio_id: int
    ) -> bool:
        """Delete a custom domain."""
        result = await db.execute(
            select(StudioCustomDomain).where(
                StudioCustomDomain.id == domain_id,
                StudioCustomDomain.studio_id == studio_id
            )
        )
        custom_domain = result.scalar_one_or_none()
        
        if not custom_domain:
            return False
        
        await db.delete(custom_domain)
        await db.commit()
        return True
    
    # ========================================================================
    # VIEW TRACKING
    # ========================================================================
    
    @staticmethod
    async def record_view(
        db: AsyncSession,
        document_id: int,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None,
        view_duration: Optional[int] = None,
        scroll_depth: Optional[int] = None,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        country_code: Optional[str] = None,
        city: Optional[str] = None
    ) -> DocumentView:
        """Record a document view for analytics."""
        # Check if this is a unique view for this session
        is_unique = True
        if session_id:
            result = await db.execute(
                select(DocumentView).where(
                    DocumentView.document_id == document_id,
                    DocumentView.session_id == session_id
                )
            )
            existing_view = result.scalar_one_or_none()
            is_unique = existing_view is None
        
        view = DocumentView(
            document_id=document_id,
            user_id=user_id,
            session_id=session_id or secrets.token_urlsafe(16),
            view_duration=view_duration,
            scroll_depth=scroll_depth,
            referrer=referrer,
            user_agent=user_agent,
            ip_address=ip_address,
            country_code=country_code,
            city=city,
            is_unique=is_unique
        )
        db.add(view)
        await db.commit()
        await db.refresh(view)
        return view
    
    @staticmethod
    async def get_document_views(
        db: AsyncSession,
        document_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[DocumentView]:
        """Get views for a document."""
        result = await db.execute(
            select(DocumentView)
            .where(DocumentView.document_id == document_id)
            .order_by(DocumentView.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_view_count(
        db: AsyncSession,
        document_id: int,
        unique_only: bool = False
    ) -> int:
        """Get view count for a document."""
        from sqlalchemy import func
        
        query = select(func.count(DocumentView.id)).where(
            DocumentView.document_id == document_id
        )
        
        if unique_only:
            query = query.where(DocumentView.is_unique == True)
        
        result = await db.execute(query)
        return result.scalar() or 0
