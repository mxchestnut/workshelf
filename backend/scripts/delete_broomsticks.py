"""
Delete Broomsticks Collective group so it can be recreated properly
"""
import asyncio
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.collaboration import Group, GroupMember

async def delete_group():
    async with AsyncSessionLocal() as db:
        # Find the group
        result = await db.execute(
            select(Group).where(Group.name == 'Broomsticks Collective')
        )
        group = result.scalar_one_or_none()
        
        if group:
            print(f'Found group: {group.name} (ID: {group.id})')
            
            # Delete all group members first (cascade should handle this, but being explicit)
            members_result = await db.execute(
                select(GroupMember).where(GroupMember.group_id == group.id)
            )
            members = members_result.scalars().all()
            print(f'Found {len(members)} members to delete')
            
            for member in members:
                await db.delete(member)
            
            # Delete the group
            await db.delete(group)
            await db.commit()
            print(f'✅ Successfully deleted Broomsticks Collective and its members')
        else:
            print('❌ Group "Broomsticks Collective" not found')

if __name__ == '__main__':
    asyncio.run(delete_group())
