"""
Group Customization Service
Manages group themes, branding, and custom styling
"""
from typing import Optional, List
import secrets
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group_customization import GroupTheme
from app.models.collaboration import Group, GroupCustomDomain


class GroupCustomizationService:
    """Service for managing group customization features."""
    
    # ========================================================================
    # THEME MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_or_update_theme(
        db: AsyncSession,
        group_id: int,
        primary_color: Optional[str] = None,
        secondary_color: Optional[str] = None,
        accent_color: Optional[str] = None,
        background_color: Optional[str] = None,
        text_color: Optional[str] = None,
        heading_font: Optional[str] = None,
        body_font: Optional[str] = None,
        logo_url: Optional[str] = None,
        banner_url: Optional[str] = None,
        favicon_url: Optional[str] = None,
        custom_css: Optional[str] = None,
        layout_config: Optional[dict] = None,
        is_active: Optional[bool] = True
    ) -> GroupTheme:
        """Create or update group theme."""
        # Check if theme already exists
        result = await db.execute(
            select(GroupTheme).filter(GroupTheme.group_id == group_id)
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
            if logo_url is not None:
                theme.logo_url = logo_url
            if banner_url is not None:
                theme.banner_url = banner_url
            if favicon_url is not None:
                theme.favicon_url = favicon_url
            if custom_css is not None:
                theme.custom_css = custom_css
            if layout_config is not None:
                theme.layout_config = layout_config
            if is_active is not None:
                theme.is_active = is_active
        else:
            # Create new theme
            theme = GroupTheme(
                group_id=group_id,
                primary_color=primary_color or "#B34B0C",
                secondary_color=secondary_color or "#524944",
                accent_color=accent_color or "#D97706",
                background_color=background_color or "#1F1B18",
                text_color=text_color or "#FFFFFF",
                heading_font=heading_font or "Inter",
                body_font=body_font or "Inter",
                logo_url=logo_url,
                banner_url=banner_url,
                favicon_url=favicon_url,
                custom_css=custom_css,
                layout_config=layout_config,
                is_active=is_active
            )
            db.add(theme)
        
        await db.commit()
        await db.refresh(theme)
        return theme
    
    @staticmethod
    async def get_group_theme(
        db: AsyncSession,
        group_id: int
    ) -> Optional[GroupTheme]:
        """Get group theme."""
        result = await db.execute(
            select(GroupTheme).filter(GroupTheme.group_id == group_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_theme(
        db: AsyncSession,
        group_id: int
    ) -> bool:
        """Delete group theme (revert to defaults)."""
        result = await db.execute(
            select(GroupTheme).filter(GroupTheme.group_id == group_id)
        )
        theme = result.scalar_one_or_none()
        
        if theme:
            await db.delete(theme)
            await db.commit()
            return True
        return False
    
    # ========================================================================
    # CUSTOM DOMAIN MANAGEMENT
    # ========================================================================
    
    @staticmethod
    async def create_custom_domain(
        db: AsyncSession,
        group_id: int,
        domain: str
    ) -> GroupCustomDomain:
        """Create a custom domain configuration for group."""
        # Generate verification token
        verification_token = secrets.token_urlsafe(32)
        
        custom_domain = GroupCustomDomain(
            group_id=group_id,
            domain=domain.lower().strip(),
            status="pending",
            dns_verified=False,
            dns_verification_token=verification_token,
            requested_at=datetime.utcnow()
        )
        
        db.add(custom_domain)
        await db.commit()
        await db.refresh(custom_domain)
        return custom_domain
    
    @staticmethod
    async def verify_custom_domain(
        db: AsyncSession,
        domain_id: int
    ) -> GroupCustomDomain:
        """Verify a custom domain (simplified - in production would check DNS)."""
        result = await db.execute(
            select(GroupCustomDomain).filter(GroupCustomDomain.id == domain_id)
        )
        domain = result.scalar_one_or_none()
        
        if not domain:
            return None
        
        # In production, this would check DNS records
        # For now, we'll just mark it as verified
        domain.dns_verified = True
        domain.status = "active"
        domain.ssl_status = "active"
        
        await db.commit()
        await db.refresh(domain)
        return domain
    
    @staticmethod
    async def get_group_domains(
        db: AsyncSession,
        group_id: int
    ) -> List[GroupCustomDomain]:
        """Get all custom domains for a group."""
        result = await db.execute(
            select(GroupCustomDomain).filter(GroupCustomDomain.group_id == group_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def delete_custom_domain(
        db: AsyncSession,
        domain_id: int,
        group_id: int
    ) -> bool:
        """Delete a custom domain."""
        result = await db.execute(
            select(GroupCustomDomain).filter(
                GroupCustomDomain.id == domain_id,
                GroupCustomDomain.group_id == group_id
            )
        )
        domain = result.scalar_one_or_none()
        
        if domain:
            await db.delete(domain)
            await db.commit()
            return True
        return False

