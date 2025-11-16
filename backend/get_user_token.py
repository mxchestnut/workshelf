"""Get a JWT token for a user directly from WorkShelf"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
import jwt

# Add the app directory to the path
sys.path.insert(0, '/app')

from app.core.database import get_db
from sqlalchemy import text

async def get_user_token():
    email = "mxchestnut@gmail.com"
    
    print(f"Looking up user: {email}")
    
    async for db in get_db():
        try:
            # Get user details
            result = await db.execute(
                text("""
                    SELECT id, email, username, is_staff, is_approved, keycloak_id
                    FROM users 
                    WHERE email = :email
                """),
                {"email": email}
            )
            user = result.fetchone()
            
            if not user:
                print(f"ERROR: User {email} not found!")
                
                # List all users
                result = await db.execute(
                    text("SELECT id, email, username, is_staff FROM users ORDER BY id")
                )
                users = result.fetchall()
                print(f"\nAll users in database ({len(users)}):")
                for u in users:
                    print(f"  {u[0]}: {u[1]} ({u[2]}) - staff={u[3]}")
                
                return
            
            print(f"\nUser found:")
            print(f"  ID: {user[0]}")
            print(f"  Email: {user[1]}")
            print(f"  Username: {user[2]}")
            print(f"  Is Staff: {user[3]}")
            print(f"  Is Approved: {user[4]}")
            print(f"  Keycloak ID: {user[5]}")
            
            if not user[3]:
                print("\n⚠️  User is not staff! Granting staff status...")
                await db.execute(
                    text("UPDATE users SET is_staff = true WHERE id = :id"),
                    {"id": user[0]}
                )
                await db.commit()
                print("✅ Staff status granted")
            
            if not user[4]:
                print("\n⚠️  User is not approved! Approving user...")
                await db.execute(
                    text("UPDATE users SET is_approved = true WHERE id = :id"),
                    {"id": user[0]}
                )
                await db.commit()
                print("✅ User approved")
            
            # Generate a simple JWT token for testing
            # This won't work for actual auth (needs Keycloak signature), 
            # but shows the user info
            print(f"\n📋 User ready!")
            print(f"\nTo log in, go to: https://workshelf.dev")
            print(f"And use your regular login method (Google, etc.)")
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            
if __name__ == "__main__":
    asyncio.run(get_user_token())
