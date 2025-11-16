#!/usr/bin/env python3
"""Clear Matrix credentials for user to force re-registration"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import select, update
from app.models.user import User
from app.database import get_db, engine

async def clear_matrix_credentials():
    async with engine.begin() as conn:
        # Clear Matrix credentials for user 1
        await conn.execute(
            update(User)
            .where(User.id == 1)
            .values(matrix_user_id=None, matrix_access_token=None)
        )
        
        # Verify the update
        result = await conn.execute(
            select(User.id, User.email, User.matrix_user_id)
            .where(User.id == 1)
        )
        user = result.first()
        
        print(f"✅ Cleared Matrix credentials for user {user.id} ({user.email})")
        print(f"   matrix_user_id: {user.matrix_user_id}")
        print(f"\nNext login will create new Matrix account with stored password.")

if __name__ == "__main__":
    asyncio.run(clear_matrix_credentials())
