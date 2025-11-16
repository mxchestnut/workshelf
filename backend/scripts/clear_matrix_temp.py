#!/usr/bin/env python3
"""Clear Matrix credentials for user 1 (warpxth)"""
import sys
import os
sys.path.insert(0, '/app')

import asyncio
from sqlalchemy import text
from app.core.database import engine

async def main():
    async with engine.begin() as conn:
        # Clear credentials
        await conn.execute(text(
            "UPDATE users SET matrix_user_id=NULL, matrix_access_token=NULL WHERE id=1"
        ))
        
        # Verify
        result = await conn.execute(text(
            "SELECT id, email, matrix_user_id, matrix_access_token FROM users WHERE id=1"
        ))
        row = result.fetchone()
        
        print(f"✅ Cleared Matrix credentials for user {row[0]} ({row[1]})")
        print(f"   matrix_user_id: {row[2]}")
        print(f"   matrix_access_token: {'SET' if row[3] else 'NULL'}")

if __name__ == "__main__":
    asyncio.run(main())
