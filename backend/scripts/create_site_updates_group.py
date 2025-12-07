"""
Create Site Updates group
Quick script to create the official Site Updates group
"""
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from app.core.database import engine


async def create_site_updates_group():
    """Create the Site Updates group"""
    
    async with engine.begin() as conn:
        # Get first user (should be you)
        result = await conn.execute(text("SELECT id, username, email FROM users ORDER BY id LIMIT 1"))
        user = result.fetchone()
        
        if not user:
            print("❌ No users found! Please create your account first.")
            return
        
        user_id, username, email = user
        print(f"✅ Using user: {username} ({email})")
        
        # Check if group exists
        result = await conn.execute(
            text("SELECT id FROM groups WHERE slug = 'site-updates' AND is_deleted = false")
        )
        existing = result.fetchone()
        
        if existing:
            print(f"ℹ️  Site Updates group already exists (ID: {existing[0]})")
            return
        
        # Create group
        now = datetime.now(timezone.utc)
        result = await conn.execute(
            text("""
                INSERT INTO groups (
                    name, slug, description, visibility, owner_id,
                    created_at, updated_at, is_deleted, tenant_id
                ) VALUES (
                    :name, :slug, :description, :visibility, :owner_id,
                    :created_at, :updated_at, false, 1
                )
                RETURNING id
            """),
            {
                "name": "Site Updates",
                "slug": "site-updates",
                "description": "Official announcements and updates from the WorkShelf team",
                "visibility": "public",
                "owner_id": user_id,
                "created_at": now,
                "updated_at": now
            }
        )
        group_id = result.fetchone()[0]
        
        # Add owner as admin
        await conn.execute(
            text("""
                INSERT INTO group_members (
                    group_id, user_id, role, is_active, is_approved, joined_at, tenant_id
                ) VALUES (
                    :group_id, :user_id, 'admin', true, true, :joined_at, 1
                )
            """),
            {
                "group_id": group_id,
                "user_id": user_id,
                "joined_at": now
            }
        )
        
        print(f"✅ Created 'Site Updates' group! (ID: {group_id})")
        print(f"   Visit: https://workshelf.dev/group/site-updates")


if __name__ == "__main__":
    asyncio.run(create_site_updates_group())
