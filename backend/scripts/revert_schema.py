#!/usr/bin/env python3
"""Revert schema changes to match deployed model"""
import psycopg2

conn_str = 'postgresql://neondb_owner:npg_c2ZCF0THgyzS@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

print('📝 Reverting schema to match deployed model...\n')

# Rename back to cover_blob_url
try:
    cur.execute('ALTER TABLE store_items RENAME COLUMN cover_image_url TO cover_blob_url')
    print('✅ Renamed cover_image_url → cover_blob_url')
    conn.commit()
except Exception as e:
    print(f'⚠️  {e}')
    conn.rollback()

# Drop word_count and tags (they don't exist in the deployed model)
try:
    cur.execute('ALTER TABLE store_items DROP COLUMN IF EXISTS word_count')
    cur.execute('ALTER TABLE store_items DROP COLUMN IF EXISTS tags')
    print('✅ Dropped word_count and tags')
    conn.commit()
except Exception as e:
    print(f'⚠️  {e}')
    conn.rollback()

print('\n✅ Schema now matches deployed model!')
conn.close()
