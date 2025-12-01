"""
Create admin user 'warpxth' with staff privileges

This script creates a platform staff user with is_staff=True.
Note: Password must be set in Keycloak separately.
"""
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.user import User

# Get database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/workshelf")


async def create_admin_user():
    """Create warpxth admin user"""
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Check if user already exists
            result = await session.execute(
                select(User).filter(User.username == "warpxth")
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"❌ User 'warpxth' already exists")
                print(f"   ID: {existing_user.id}")
                print(f"   Email: {existing_user.email}")
                print(f"   is_staff: {existing_user.is_staff}")
                
                # Update to staff if not already
                if not existing_user.is_staff:
                    existing_user.is_staff = True
                    existing_user.is_verified = True
                    existing_user.is_active = True
                    await session.commit()
                    print(f"\n✅ Updated warpxth to staff user")
                return
            
            # Check if we have a default tenant
            from sqlalchemy import text
            result = await session.execute(text("SELECT id FROM tenants LIMIT 1"))
            tenant_row = result.fetchone()
            
            if not tenant_row:
                print("❌ No tenants found in database. Creating default tenant...")
                await session.execute(
                    text("""
                        INSERT INTO tenants (name, slug, owner_id, is_active, created_at, updated_at)
                        VALUES ('Default', 'default', 1, true, NOW(), NOW())
                        ON CONFLICT (slug) DO NOTHING
                    """)
                )
                await session.commit()
                result = await session.execute(text("SELECT id FROM tenants WHERE slug = 'default'"))
                tenant_row = result.fetchone()
            
            tenant_id = tenant_row[0]
            
            # Generate a Keycloak ID (this should be updated when user logs in via Keycloak)
            keycloak_id = "admin-warpxth-keycloak-id"
            
            # Create admin user
            admin_user = User(
                keycloak_id=keycloak_id,
                email="warpxth@workshelf.dev",
                username="warpxth",
                display_name="warpxth",
                is_active=True,
                is_verified=True,
                is_staff=True,
                tenant_id=tenant_id
            )
            
            session.add(admin_user)
            await session.commit()
            
            print(f"✅ Created admin user 'warpxth'")
            print(f"   ID: {admin_user.id}")
            print(f"   Email: {admin_user.email}")
            print(f"   Username: {admin_user.username}")
            print(f"   Keycloak ID: {admin_user.keycloak_id}")
            print(f"   is_staff: {admin_user.is_staff}")
            print(f"   Tenant ID: {admin_user.tenant_id}")
            print()
            print(f"⚠️  Note: Password must be set in Keycloak")
            print(f"   The Keycloak ID will be updated on first login")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_admin_user())
