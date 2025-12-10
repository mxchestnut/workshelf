#!/usr/bin/env python3
"""
Apply soft-delete migration to groups table
"""
import os
from sqlalchemy import create_engine, text

def main():
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        return
    
    # Convert to psycopg2 if needed
    if 'asyncpg' in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if is_deleted column already exists
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='groups' AND column_name='is_deleted'"
        ))
        exists = result.fetchone() is not None
        
        if not exists:
            print("Adding soft-delete columns to groups table...")
            
            # Add is_deleted column
            conn.execute(text("ALTER TABLE groups ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false"))
            print("✓ Added is_deleted column")
            
            # Add deleted_at column  
            conn.execute(text("ALTER TABLE groups ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE"))
            print("✓ Added deleted_at column")
            
            # Create index
            conn.execute(text("CREATE INDEX ix_groups_is_deleted ON groups(is_deleted)"))
            print("✓ Created index on is_deleted")
            
            # Insert migration record
            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('g1h2i3j4k5l6')"))
            print("✓ Recorded migration")
            
            conn.commit()
            print("\n✅ Successfully added soft-delete protection to groups table!")
        else:
            print("✓ Soft-delete columns already exist on groups table")

if __name__ == '__main__':
    main()
