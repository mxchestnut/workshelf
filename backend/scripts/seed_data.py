"""
Seed database with default permissions, roles, and test data
Run after initial migration: python scripts/seed_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models import (
    Permission, Role, RolePermission,
    Tenant, TenantSettings, User, UserProfile, UserRole
)


async def create_permissions(session):
    """Create system-wide permissions"""
    permissions_data = [
        # Tenant Management
        {"name": "View Tenant", "code": "tenant.view", "category": "tenant", "description": "View tenant information"},
        {"name": "Manage Tenant", "code": "tenant.manage", "category": "tenant", "description": "Manage tenant settings and configuration"},
        
        # User Management
        {"name": "View Users", "code": "user.view", "category": "user", "description": "View user list and profiles"},
        {"name": "Invite Users", "code": "user.invite", "category": "user", "description": "Invite new users to tenant"},
        {"name": "Manage Users", "code": "user.manage", "category": "user", "description": "Manage user accounts and roles"},
        
        # Document Permissions
        {"name": "Create Document", "code": "document.create", "category": "document", "description": "Create new documents"},
        {"name": "View Document", "code": "document.view", "category": "document", "description": "View documents"},
        {"name": "Edit Document", "code": "document.edit", "category": "document", "description": "Edit document content"},
        {"name": "Delete Document", "code": "document.delete", "category": "document", "description": "Delete documents"},
        {"name": "Publish Document", "code": "document.publish", "category": "document", "description": "Publish documents"},
        {"name": "Share Document", "code": "document.share", "category": "document", "description": "Share documents with others"},
        {"name": "Comment on Document", "code": "document.comment", "category": "document", "description": "Add comments to documents"},
        
        # Studio Permissions
        {"name": "Create Studio", "code": "studio.create", "category": "studio", "description": "Create new studios"},
        {"name": "View Studio", "code": "studio.view", "category": "studio", "description": "View studio information"},
        {"name": "Manage Studio", "code": "studio.manage", "category": "studio", "description": "Manage studio settings"},
        {"name": "Invite Studio Members", "code": "studio.invite", "category": "studio", "description": "Invite members to studio"},
        {"name": "Approve Submissions", "code": "studio.approve", "category": "studio", "description": "Approve studio submissions"},
    ]
    
    permissions = []
    for perm_data in permissions_data:
        # Check if permission already exists
        result = await session.execute(
            select(Permission).where(Permission.code == perm_data["code"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            perm = Permission(**perm_data)
            session.add(perm)
            permissions.append(perm)
    
    await session.commit()
    print(f"✅ Created {len(permissions)} permissions")
    
    # Return all permissions for role assignment
    result = await session.execute(select(Permission))
    return {p.code: p for p in result.scalars().all()}


async def create_default_roles(session, tenant_id, permissions_map):
    """Create default roles for a tenant"""
    
    # Admin role - all permissions
    admin_role_data = {
        "tenant_id": tenant_id,
        "name": "Admin",
        "description": "Full access to all features",
        "is_system_role": True,
        "is_default": False
    }
    
    result = await session.execute(
        select(Role).where(
            Role.tenant_id == tenant_id,
            Role.name == "Admin"
        )
    )
    admin_role = result.scalar_one_or_none()
    
    if not admin_role:
        admin_role = Role(**admin_role_data)
        session.add(admin_role)
        await session.flush()
        
        # Add all permissions to admin role
        for permission in permissions_map.values():
            role_perm = RolePermission(role_id=admin_role.id, permission_id=permission.id)
            session.add(role_perm)
    
    # Member role - basic permissions
    member_role_data = {
        "tenant_id": tenant_id,
        "name": "Member",
        "description": "Standard member access",
        "is_system_role": True,
        "is_default": True
    }
    
    result = await session.execute(
        select(Role).where(
            Role.tenant_id == tenant_id,
            Role.name == "Member"
        )
    )
    member_role = result.scalar_one_or_none()
    
    if not member_role:
        member_role = Role(**member_role_data)
        session.add(member_role)
        await session.flush()
        
        # Add member permissions
        member_perms = [
            "tenant.view",
            "user.view",
            "document.create",
            "document.view",
            "document.edit",
            "document.comment",
            "document.share",
            "studio.view",
            "studio.create",
        ]
        
        for perm_code in member_perms:
            if perm_code in permissions_map:
                role_perm = RolePermission(
                    role_id=member_role.id,
                    permission_id=permissions_map[perm_code].id
                )
                session.add(role_perm)
    
    # Guest/Viewer role - read-only
    guest_role_data = {
        "tenant_id": tenant_id,
        "name": "Guest",
        "description": "Read-only access",
        "is_system_role": True,
        "is_default": False
    }
    
    result = await session.execute(
        select(Role).where(
            Role.tenant_id == tenant_id,
            Role.name == "Guest"
        )
    )
    guest_role = result.scalar_one_or_none()
    
    if not guest_role:
        guest_role = Role(**guest_role_data)
        session.add(guest_role)
        await session.flush()
        
        # Add guest permissions
        guest_perms = [
            "tenant.view",
            "user.view",
            "document.view",
            "document.comment",
            "studio.view",
        ]
        
        for perm_code in guest_perms:
            if perm_code in permissions_map:
                role_perm = RolePermission(
                    role_id=guest_role.id,
                    permission_id=permissions_map[perm_code].id
                )
                session.add(role_perm)
    
    await session.commit()
    print(f"✅ Created default roles for tenant {tenant_id}")
    
    return admin_role, member_role, guest_role


async def create_test_tenant(session):
    """Create a test tenant with settings"""
    
    # Check if test tenant exists
    result = await session.execute(
        select(Tenant).where(Tenant.slug == "test-tenant")
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        tenant = Tenant(
            name="Test Tenant",
            slug="test-tenant",
            type="organization",
            is_active=True,
            is_verified=True,
            contact_email="admin@test-tenant.com",
            contact_name="Test Admin",
            plan="free",
            max_users=10,
            max_storage_gb=5
        )
        session.add(tenant)
        await session.flush()
        
        # Create tenant settings
        settings = TenantSettings(
            tenant_id=tenant.id,
            primary_color="#3b82f6",
            secondary_color="#8b5cf6",
            features={
                "studios": True,
                "versioning": True,
                "collaboration": True,
                "public_profiles": True
            },
            settings={
                "default_visibility": "private",
                "require_email_verification": True,
                "allow_self_registration": True
            }
        )
        session.add(settings)
        
        await session.commit()
        print(f"✅ Created test tenant: {tenant.name}")
    else:
        print(f"ℹ️  Test tenant already exists: {tenant.name}")
    
    return tenant


async def create_test_user(session, tenant_id, admin_role_id):
    """Create a test admin user"""
    
    # Check if test user exists
    result = await session.execute(
        select(User).where(User.email == "admin@test-tenant.com")
    )
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            tenant_id=tenant_id,
            keycloak_id="test-admin-keycloak-id",
            email="admin@test-tenant.com",
            username="admin",
            display_name="Test Admin",
            is_active=True,
            is_verified=True,
            is_staff=True
        )
        session.add(user)
        await session.flush()
        
        # Create user profile
        profile = UserProfile(
            user_id=user.id,
            bio="Test administrator account",
            timezone="UTC",
            language="en",
            theme="dark",
            profile_visibility="public",
            show_email=False,
            email_notifications=True
        )
        session.add(profile)
        
        # Assign admin role
        user_role = UserRole(
            user_id=user.id,
            role_id=admin_role_id,
            scope_type="tenant",
            scope_id=tenant_id
        )
        session.add(user_role)
        
        await session.commit()
        print(f"✅ Created test admin user: {user.email}")
    else:
        print(f"ℹ️  Test user already exists: {user.email}")
    
    return user


async def seed_database():
    """Main seed function"""
    print("\n🌱 Seeding database...\n")
    
    async with AsyncSessionLocal() as session:
        try:
            # Create permissions
            permissions_map = await create_permissions(session)
            
            # Create test tenant
            tenant = await create_test_tenant(session)
            
            # Create default roles for tenant
            admin_role, member_role, guest_role = await create_default_roles(
                session, tenant.id, permissions_map
            )
            
            # Create test admin user
            user = await create_test_user(session, tenant.id, admin_role.id)
            
            print("\n✨ Database seeding completed!\n")
            print(f"Test Tenant: {tenant.slug}")
            print(f"Test User: {user.email}")
            print(f"Keycloak ID: {user.keycloak_id}")
            print(f"\nRoles created: Admin, Member, Guest")
            print(f"Permissions created: {len(permissions_map)}")
            
        except Exception as e:
            print(f"\n❌ Error seeding database: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_database())
