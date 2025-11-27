"""
Grant staff privileges to a user by email - simple SQL version
Usage: python scripts/grant_staff_simple.py <email>
"""
import sys
import asyncio
import asyncpg
from app.core.config import settings


async def grant_staff(email: str):
    """Grant staff privileges to a user"""
    # Extract connection details from DATABASE_URL
    db_url = settings.DATABASE_URL_CLEAN.replace('postgresql+asyncpg://', 'postgresql://')
    
    try:
        conn = await asyncpg.connect(db_url)
        
        # Check if user exists
        user = await conn.fetchrow(
            'SELECT id, email, display_name, is_staff FROM users WHERE email = $1',
            email
        )
        
        if not user:
            print(f"❌ User not found: {email}")
            await conn.close()
            return False
        
        if user['is_staff']:
            print(f"✅ User {email} already has staff privileges")
            await conn.close()
            return True
        
        # Grant staff
        await conn.execute(
            'UPDATE users SET is_staff = TRUE WHERE email = $1',
            email
        )
        
        print(f"✅ Granted staff privileges to: {email}")
        print(f"   User ID: {user['id']}")
        print(f"   Display Name: {user['display_name']}")
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/grant_staff_simple.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(grant_staff(email))
