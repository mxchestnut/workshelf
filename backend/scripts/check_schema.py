#!/usr/bin/env python3
"""Check store_items table schema"""
import psycopg2

conn_str = "postgresql://neondb_owner:npg_c2ZCF0THgyzS@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'store_items'
        ORDER BY ordinal_position
    """)
    
    print("📋 store_items table columns:\n")
    for col, dtype, nullable in cur.fetchall():
        null_mark = "NULL" if nullable == "YES" else "NOT NULL"
        print(f"  {col:<30} {dtype:<20} {null_mark}")
    
finally:
    if conn:
        conn.close()
