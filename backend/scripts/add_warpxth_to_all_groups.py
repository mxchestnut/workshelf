"""
Add warpxth as ADMIN to all existing groups
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.collaboration import Group, GroupMember, GroupMemberRole
from app.models.user import User
from app.models.tags import PostTag  # Ensure PostTag is imported for relationships


async def add_warpxth_to_all_groups():
    """Add warpxth as ADMIN to all existing groups"""
    async with AsyncSessionLocal() as session:
        try:
            # Get warpxth user
            result = await session.execute(
                select(User).where(User.username == "warpxth")
            )
            warpxth = result.scalar_one_or_none()
            
            if not warpxth:
                print("❌ User 'warpxth' not found")
                return
            
            print(f"✅ Found warpxth (ID: {warpxth.id})")
            print()
            
            # Get all groups
            result = await session.execute(select(Group))
            groups = result.scalars().all()
            
            print(f"📋 Found {len(groups)} groups")
            print()
            
            added_count = 0
            already_member_count = 0
            
            for group in groups:
                # Check if warpxth is already a member
                result = await session.execute(
                    select(GroupMember).where(
                        GroupMember.group_id == group.id,
                        GroupMember.user_id == warpxth.id
                    )
                )
                existing_membership = result.scalar_one_or_none()
                
                if existing_membership:
                    # Update role to ADMIN if not already
                    if existing_membership.role != GroupMemberRole.ADMIN and existing_membership.role != GroupMemberRole.OWNER:
                        old_role = existing_membership.role.value
                        existing_membership.role = GroupMemberRole.ADMIN
                        print(f"   ✓ {group.name} - Updated role from {old_role} to ADMIN")
                        added_count += 1
                    else:
                        print(f"   • {group.name} - Already {existing_membership.role.value}")
                        already_member_count += 1
                else:
                    # Add as ADMIN
                    membership = GroupMember(
                        group_id=group.id,
                        user_id=warpxth.id,
                        role=GroupMemberRole.ADMIN
                    )
                    session.add(membership)
                    print(f"   ✓ {group.name} - Added as ADMIN")
                    added_count += 1
            
            await session.commit()
            
            print()
            print("=" * 60)
            print("🎉 SUCCESS!")
            print("=" * 60)
            print()
            print(f"📊 Summary:")
            print(f"   • Added/Updated: {added_count}")
            print(f"   • Already Admin/Owner: {already_member_count}")
            print(f"   • Total Groups: {len(groups)}")
            print()
            print("✅ warpxth now has ADMIN role in all groups!")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            await session.rollback()


if __name__ == "__main__":
    asyncio.run(add_warpxth_to_all_groups())
