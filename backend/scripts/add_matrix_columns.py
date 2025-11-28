"""
Manually add Matrix columns to users table
This is needed because create_tables.py doesn't ALTER existing tables
"""
import asyncio
import os
from sqlalchemy import text
from app.core.database import engine


async def add_matrix_columns():
    """Add Matrix-related columns to users and groups tables if they don't exist"""
    async with engine.begin() as conn:
        # Check if user columns exist
        result = await conn.execute(text(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN (
                'matrix_user_id', 'matrix_access_token', 'matrix_homeserver', 'matrix_onboarding_seen', 'matrix_password'
            )
            """
        ))
        existing_columns = [row[0] for row in result.fetchall()]

        if all(col in existing_columns for col in [
            'matrix_user_id', 'matrix_access_token', 'matrix_homeserver', 'matrix_onboarding_seen', 'matrix_password']):
            print("✓ All Matrix user columns already exist")
        else:
            print(f"Adding Matrix columns to users table... (found {len(existing_columns)}/5)")

            # Add matrix_user_id if missing
            if 'matrix_user_id' not in existing_columns:
                await conn.execute(text(
                    """
                    ALTER TABLE users 
                    ADD COLUMN matrix_user_id VARCHAR(255)
                    """
                ))
                print("✓ Added matrix_user_id column")

            # Add matrix_access_token if missing
            if 'matrix_access_token' not in existing_columns:
                await conn.execute(text(
                    """
                    ALTER TABLE users 
                    ADD COLUMN matrix_access_token TEXT
                    """
                ))
                print("✓ Added matrix_access_token column")

            # Add matrix_homeserver if missing
            if 'matrix_homeserver' not in existing_columns:
                await conn.execute(text(
                    """
                    ALTER TABLE users 
                    ADD COLUMN matrix_homeserver VARCHAR(255)
                    """
                ))
                print("✓ Added matrix_homeserver column")

            # Add matrix_onboarding_seen if missing
            if 'matrix_onboarding_seen' not in existing_columns:
                await conn.execute(text(
                    """
                    ALTER TABLE users 
                    ADD COLUMN matrix_onboarding_seen BOOLEAN NOT NULL DEFAULT false
                    """
                ))
                print("✓ Added matrix_onboarding_seen column")

            # Add matrix_password if missing
            if 'matrix_password' not in existing_columns:
                await conn.execute(text(
                    """
                    ALTER TABLE users 
                    ADD COLUMN matrix_password VARCHAR(255)
                    """
                ))
                print("✓ Added matrix_password column")

            # Create unique index on matrix_user_id
            try:
                await conn.execute(text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_matrix_user_id 
                    ON users(matrix_user_id)
                    """
                ))
                print("✓ Created unique index on matrix_user_id")
            except Exception as e:
                print(f"Index may already exist: {e}")

        # Ensure groups.matrix_space_id exists
        result_groups = await conn.execute(text(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'groups' 
            AND column_name = 'matrix_space_id'
            """
        ))
        has_matrix_space_id = result_groups.first() is not None

        if has_matrix_space_id:
            print("✓ groups.matrix_space_id column already exists")
        else:
            print("Adding matrix_space_id column to groups table...")
            # Add column
            await conn.execute(text(
                """
                ALTER TABLE groups 
                ADD COLUMN matrix_space_id VARCHAR(255)
                """
            ))
            print("✓ Added groups.matrix_space_id column")
            # Create index (non-unique)
            try:
                await conn.execute(text(
                    """
                    CREATE INDEX IF NOT EXISTS ix_groups_matrix_space_id 
                    ON groups(matrix_space_id)
                    """
                ))
                print("✓ Created index ix_groups_matrix_space_id on groups(matrix_space_id)")
            except Exception as e:
                print(f"Index creation skipped/failed (likely exists): {e}")

        print("✓ Matrix schema checks completed")


if __name__ == "__main__":
    asyncio.run(add_matrix_columns())
