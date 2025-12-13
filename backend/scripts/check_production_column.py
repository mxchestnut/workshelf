#!/usr/bin/env python3
"""
Check if store_item_id column exists in production
"""
import psycopg2
import sys
import os

# Use production DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'bookshelf_items' 
        AND column_name = 'store_item_id'
    """)
    
    result = cur.fetchone()
    
    if result:
        print(f"✅ store_item_id column EXISTS in production")
        print(f"   Column: {result[0]}")
        print(f"   Type: {result[1]}")
    else:
        print("❌ store_item_id column DOES NOT EXIST in production")
        print("   Migration needs to be run!")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error checking column: {e}")
    sys.exit(1)
