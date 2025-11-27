#!/usr/bin/env python3
"""
Emergency fix: Add groups.matrix_space_id column directly
This runs as a standalone script that can be executed in ECS
"""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Get DB connection from environment
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://workshelf_admin:YOUR_PASSWORD@workshelf-db.c7nldsfplzvc.us-east-1.rds.amazonaws.com:5432/workshelf"
)

async def fix_groups_column():
    """Add matrix_space_id to groups table"""
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'groups' 
            AND column_name = 'matrix_space_id'
            """
        ))
        has_column = result.first() is not None

        if has_column:
            print("✓ groups.matrix_space_id already exists - no action needed")
            return

        print("Adding matrix_space_id column to groups table...")
        
        # Add column
        await conn.execute(text(
            """
            ALTER TABLE groups 
            ADD COLUMN matrix_space_id VARCHAR(255)
            """
        ))
        print("✓ Added groups.matrix_space_id column")
        
        # Create index
        await conn.execute(text(
            """
            CREATE INDEX IF NOT EXISTS ix_groups_matrix_space_id 
            ON groups(matrix_space_id)
            """
        ))
        print("✓ Created index ix_groups_matrix_space_id")
        
        print("\n✅ Fix completed successfully!")

if __name__ == "__main__":
    asyncio.run(fix_groups_column())
