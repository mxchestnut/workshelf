"""
Studio Models
Studios are branded spaces within a tenant where creators can publish and collaborate
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base, TimestampMixin, TenantMixin


class StudioMemberRole(str, enum.Enum):
    """Studio membership roles"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


class Studio(Base, TimestampMixin, TenantMixin):
    """
    Studio - A branded creative space within a tenant
    Multiple users can be members of a studio
    """
    __tablename__ = "studios"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Studio identity
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    
    # Branding
    logo_url = Column(String(500))
    banner_url = Column(String(500))
    primary_color = Column(String(7))  # Hex color
    
    # Domain
    custom_domain = Column(String(255), unique=True)
    subdomain = Column(String(100), unique=True)  # e.g., mystudio.workshelf.dev
    
    # Settings
    is_public = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    allow_public_submissions = Column(Boolean, default=False)
    require_approval = Column(Boolean, default=True)  # For new members
    
    # SEO
    meta_description = Column(String(500))
    meta_keywords = Column(String(500))
    
    # Social
    twitter_handle = Column(String(100))
    website_url = Column(String(500))
    
    # Template tracking (optional - which template was used to create this)
    template_id = Column(Integer, ForeignKey('project_templates.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="studios")
    members = relationship("StudioMember", back_populates="studio", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="studio")
    template = relationship("ProjectTemplate", back_populates="studios")
    
    # Phase 5: Studio Customization
    theme = relationship("StudioTheme", back_populates="studio", uselist=False, cascade="all, delete-orphan")
    custom_domains = relationship("StudioCustomDomain", back_populates="studio", cascade="all, delete-orphan")
    analytics = relationship("StudioAnalytics", back_populates="studio", cascade="all, delete-orphan")
    
    # Phase 7: Advanced Features
    export_jobs = relationship("ExportJob", foreign_keys="ExportJob.studio_id", back_populates="studio", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'slug', name='uq_tenant_studio_slug'),
    )
    
    def __repr__(self):
        return f"<Studio(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class StudioMember(Base, TimestampMixin):
    """
    Studio membership
    Links users to studios with specific roles
    """
    __tablename__ = "studio_members"
    
    id = Column(Integer, primary_key=True, index=True)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Role
    role = Column(SQLEnum(StudioMemberRole), default=StudioMemberRole.MEMBER, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # For studios requiring approval
    
    # Display
    display_name = Column(String(255))  # How they appear in this studio
    bio = Column(Text)  # Studio-specific bio
    
    # Invitation
    invited_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    
    # Relationships
    studio = relationship("Studio", back_populates="members")
    user = relationship("User", back_populates="studio_memberships", foreign_keys=[user_id])
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    
    __table_args__ = (
        UniqueConstraint('studio_id', 'user_id', name='uq_studio_user'),
    )
    
    def __repr__(self):
        return f"<StudioMember(studio_id={self.studio_id}, user_id={self.user_id}, role='{self.role}')>"
