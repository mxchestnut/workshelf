"""
Role-Based Access Control (RBAC) Models
Permissions are granted through roles
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, TenantMixin


class Permission(Base, TimestampMixin):
    """
    System-wide permissions
    Not tenant-specific - defined at the system level
    """
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Permission details
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "document.create"
    description = Column(Text)
    
    # Grouping
    category = Column(String(50))  # documents, users, studios, system
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Permission(code='{self.code}', name='{self.name}')>"


class Role(Base, TimestampMixin, TenantMixin):
    """
    Roles within a tenant
    Each tenant can define custom roles or use default roles
    """
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Role details
    name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Role type
    is_system_role = Column(Boolean, default=False)  # Default roles: admin, member, guest
    is_default = Column(Boolean, default=False)  # Assigned to new users automatically
    
    # Relationships
    tenant = relationship("Tenant")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', name='uq_tenant_role_name'),
    )
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}', tenant_id={self.tenant_id})>"


class RolePermission(Base, TimestampMixin):
    """
    Association between roles and permissions
    """
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(Integer, ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uq_role_permission'),
    )
    
    def __repr__(self):
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"


class UserRole(Base, TimestampMixin):
    """
    Association between users and roles
    A user can have multiple roles
    """
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    
    # Optional scope (e.g., role only applies to a specific studio)
    scope_type = Column(String(50))  # studio, document, null (tenant-wide)
    scope_id = Column(Integer)  # ID of the scoped resource
    
    # Relationships
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="user_roles")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', 'scope_type', 'scope_id', name='uq_user_role_scope'),
    )
    
    def __repr__(self):
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"
