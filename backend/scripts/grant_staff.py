"""
Grant staff privileges to a user by email
Usage: python scripts/grant_staff.py <email>
"""
import sys
import asyncio
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models import User


async def grant_staff(email: str):
    """Grant staff privileges to a user"""
    async with AsyncSessionLocal() as db:
        # Find user
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User not found: {email}")
            return False
        
        if user.is_staff:
            print(f"✅ User {email} already has staff privileges")
            return True
        
        # Grant staff
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(is_staff=True)
        )
        await db.commit()
        
        print(f"✅ Granted staff privileges to: {email}")
        print(f"   User ID: {user.id}")
        print(f"   Display Name: {user.display_name}")
        return True


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/grant_staff.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(grant_staff(email))
