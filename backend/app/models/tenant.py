"""
Tenant (Organization) Models
Tenants are the top-level container for all data in the system
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    """
    Tenant/Organization - Top level entity for multi-tenancy
    Each tenant is completely isolated from others
    """
    __tablename__ = "tenants"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    
    # Tenant type
    type = Column(String(50), default="standard")  # standard, enterprise, nonprofit
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Contact info
    contact_email = Column(String(255))
    contact_name = Column(String(255))
    
    # Subscription/Plan
    plan = Column(String(50), default="free")  # free, basic, professional, enterprise
    max_users = Column(Integer, default=5)
    max_storage_gb = Column(Integer, default=1)
    
    # Relationships
    settings = relationship("TenantSettings", back_populates="tenant", uselist=False, cascade="all, delete-orphan")
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    studios = relationship("Studio", back_populates="tenant", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="tenant", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="tenant", cascade="all, delete-orphan")
    folders = relationship("Folder", back_populates="tenant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', slug='{self.slug}')>"


class TenantSettings(Base, TimestampMixin):
    """
    Tenant-specific settings and customization
    """
    __tablename__ = "tenant_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id', ondelete='CASCADE'), unique=True, nullable=False)
    
    # Branding
    logo_url = Column(String(500))
    primary_color = Column(String(7))  # Hex color
    secondary_color = Column(String(7))
    
    # Custom domain
    custom_domain = Column(String(255), unique=True)
    
    # Features enabled
    features = Column(JSON, default=dict)  # {"beta_reading": true, "ai_detection": false, ...}
    
    # Additional settings
    settings = Column(JSON, default=dict)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="settings")
    
    def __repr__(self):
        return f"<TenantSettings(tenant_id={self.tenant_id})>"
