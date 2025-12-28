#!/usr/bin/env python3
"""
Apply migration to add store_item_id to vault_articles
"""
import psycopg2
import sys
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/workshelf")

SQL = """
-- Add store_item_id to vault_articles table for published WorkShelf books
-- This allows users to save published store items to their bookshelf

-- Add store_item_id column
ALTER TABLE vault_articles 
ADD COLUMN IF NOT EXISTS store_item_id INTEGER;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_vault_articles_store_item_id'
    ) THEN
        ALTER TABLE vault_articles 
        ADD CONSTRAINT fk_vault_articles_store_item_id 
        FOREIGN KEY (store_item_id) 
        REFERENCES store_items(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS ix_vault_articles_store_item_id 
ON vault_articles(store_item_id);
"""

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    print("Applying migration...")
    cur.execute(SQL)
    conn.commit()
    
    print("✓ Migration applied successfully!")
    print("  - Added store_item_id column to vault_articles")
    print("  - Added foreign key constraint to store_items")
    print("  - Added index for faster lookups")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error applying migration: {e}", file=sys.stderr)
        sys.exit(1)
