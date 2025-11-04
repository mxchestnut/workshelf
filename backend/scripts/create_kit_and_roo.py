"""
Create Kit (Platform Staff) and Roo (Hieroscope Group Admin)

This script creates:
1. Kit - Platform staff user with is_staff=True
2. Roo - Admin user for Hieroscope group
3. Hieroscope group with Roo as owner
4. Subdomain request for 'hieroscope'
"""
import asyncio
import secrets
import string
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.user import User
from app.models.collaboration import Group, GroupMember, GroupMemberRole

# Get database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/workshelf")


def generate_password(length=20):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def generate_keycloak_id():
    """Generate a mock Keycloak ID (UUID-like)"""
    return secrets.token_hex(16)


async def create_users_and_group():
    """Create Kit (staff), Roo (admin), and Hieroscope group"""
    
    # Generate passwords
    kit_password = generate_password()
    roo_password = generate_password()
    
    print("🔐 Generated Passwords:")
    print(f"Kit: {kit_password}")
    print(f"Roo: {roo_password}")
    print()
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Check if Kit already exists
            result = await session.execute(
                select(User).filter(User.email == "kit@workshelf.dev")
            )
            kit = result.scalar_one_or_none()
            
            if not kit:
                # Create Kit (Platform Staff)
                kit = User(
                    keycloak_id=generate_keycloak_id(),
                    email="kit@workshelf.dev",
                    username="kit",
                    display_name="Kit",
                    is_active=True,
                    is_verified=True,
                    is_staff=True,  # Platform staff flag
                    tenant_id=1  # Default tenant
                )
                session.add(kit)
                await session.flush()
                print(f"✅ Created Kit (Platform Staff)")
                print(f"   Email: kit@workshelf.dev")
                print(f"   Keycloak ID: {kit.keycloak_id}")
                print(f"   is_staff: True")
                print()
            else:
                # Update existing Kit to be staff
                kit.is_staff = True
                print(f"✅ Updated Kit to Platform Staff")
                print()
            
            # Check if Roo already exists
            result = await session.execute(
                select(User).filter(User.email == "roo@hieroscope.com")
            )
            roo = result.scalar_one_or_none()
            
            if not roo:
                # Create Roo (Hieroscope Admin)
                roo = User(
                    keycloak_id=generate_keycloak_id(),
                    email="roo@hieroscope.com",
                    username="roo",
                    display_name="Roo",
                    is_active=True,
                    is_verified=True,
                    is_staff=False,  # Not platform staff
                    tenant_id=1
                )
                session.add(roo)
                await session.flush()
                print(f"✅ Created Roo (Hieroscope Admin)")
                print(f"   Email: roo@hieroscope.com")
                print(f"   Keycloak ID: {roo.keycloak_id}")
                print()
            else:
                print(f"✅ Roo already exists")
                print()
            
            # Check if Hieroscope group already exists
            result = await session.execute(
                select(Group).filter(Group.slug == "hieroscope")
            )
            hieroscope = result.scalar_one_or_none()
            
            if not hieroscope:
                # Create Hieroscope group
                hieroscope = Group(
                    name="Hieroscope",
                    slug="hieroscope",
                    description="A creative community exploring divination, symbolism, and mystical arts through collaborative writing and storytelling.",
                    is_public=True,
                    is_active=True,
                    subdomain_requested="hieroscope",
                    subdomain_approved=False,  # Pending approval
                    tags=["divination", "mysticism", "symbolism", "creative-writing"]
                )
                session.add(hieroscope)
                await session.flush()
                print(f"✅ Created Hieroscope Group")
                print(f"   Name: {hieroscope.name}")
                print(f"   Slug: {hieroscope.slug}")
                print(f"   Subdomain Requested: hieroscope.workshelf.dev")
                print(f"   Status: Pending Approval")
                print()
            else:
                print(f"✅ Hieroscope group already exists")
                print()
            
            # Check if Roo is already a member
            result = await session.execute(
                select(GroupMember).filter(
                    GroupMember.group_id == hieroscope.id,
                    GroupMember.user_id == roo.id
                )
            )
            membership = result.scalar_one_or_none()
            
            if not membership:
                # Make Roo the owner of Hieroscope
                roo_membership = GroupMember(
                    group_id=hieroscope.id,
                    user_id=roo.id,
                    role=GroupMemberRole.OWNER
                )
                session.add(roo_membership)
                print(f"✅ Made Roo the owner of Hieroscope")
                print()
            else:
                # Update to owner if not already
                if membership.role != GroupMemberRole.OWNER:
                    membership.role = GroupMemberRole.OWNER
                    print(f"✅ Updated Roo to owner of Hieroscope")
                    print()
                else:
                    print(f"✅ Roo is already owner of Hieroscope")
                    print()
            
            # Commit all changes
            await session.commit()
            
            print("=" * 60)
            print("🎉 SUCCESS!")
            print("=" * 60)
            print()
            print("📋 Summary:")
            print()
            print("Platform Staff:")
            print(f"  • Kit (kit@workshelf.dev)")
            print(f"    - is_staff: True")
            print(f"    - Can approve subdomain requests")
            print(f"    - Access: https://kits-macbook-pro.tail41ebb6.ts.net/")
            print()
            print("Group Admin:")
            print(f"  • Roo (roo@hieroscope.com)")
            print(f"    - Owner of Hieroscope group")
            print(f"    - Can manage group members and posts")
            print(f"    - Requested subdomain: hieroscope.workshelf.dev")
            print()
            print("Hieroscope Group:")
            print(f"  • ID: {hieroscope.id}")
            print(f"  • Slug: hieroscope")
            print(f"  • Subdomain: PENDING (awaiting Kit's approval)")
            print()
            print("Next Steps:")
            print("1. Add these credentials to Kit's Notes/Credentials.md")
            print("2. Set up Keycloak users with these emails")
            print("3. Use Kit's account to approve hieroscope subdomain")
            print("4. Roo can then access via hieroscope.workshelf.dev")
            print()
            print("=" * 60)
            
            # Return credentials for file update
            return {
                "kit_email": "kit@workshelf.dev",
                "kit_password": kit_password,
                "kit_keycloak_id": kit.keycloak_id,
                "roo_email": "roo@hieroscope.com",
                "roo_password": roo_password,
                "roo_keycloak_id": roo.keycloak_id,
                "hieroscope_id": hieroscope.id
            }
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {e}")
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    credentials = asyncio.run(create_users_and_group())
    
    # Print credentials for easy copying to Credentials.md
    print()
    print("=" * 60)
    print("📝 ADD TO CREDENTIALS.MD:")
    print("=" * 60)
    print()
    print("## 🎭 Production Users")
    print()
    print("### Kit (Platform Staff)")
    print(f"- **Email**: {credentials['kit_email']}")
    print(f"- **Password**: `{credentials['kit_password']}`")
    print(f"- **Keycloak ID**: `{credentials['kit_keycloak_id']}`")
    print("- **Role**: Platform Staff (is_staff=True)")
    print("- **Admin Dashboard**: https://kits-macbook-pro.tail41ebb6.ts.net/")
    print("- **Permissions**: Approve subdomains, manage all groups, full platform access")
    print()
    print("### Roo (Hieroscope Group Admin)")
    print(f"- **Email**: {credentials['roo_email']}")
    print(f"- **Password**: `{credentials['roo_password']}`")
    print(f"- **Keycloak ID**: `{credentials['roo_keycloak_id']}`")
    print("- **Role**: Group Owner (Hieroscope)")
    print("- **Group Dashboard**: [Will be available after subdomain approval]")
    print("- **Permissions**: Manage Hieroscope group, members, posts")
    print()
    print("### Hieroscope Group")
    print(f"- **Group ID**: {credentials['hieroscope_id']}")
    print("- **Slug**: hieroscope")
    print("- **Subdomain**: hieroscope.workshelf.dev (PENDING)")
    print("- **Owner**: Roo")
    print("- **Description**: Creative community for divination, symbolism, and mystical arts")
    print()
