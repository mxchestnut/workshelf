#!/usr/bin/env python3
"""Check what's actually in the Neon database"""
import psycopg2

conn_str = "postgresql://neondb_owner:npg_c2ZCF0THgyzS@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # Check store items
    cur.execute('''
        SELECT id, title, author_name, price_usd, epub_blob_url, 
               total_sales, total_revenue, created_at, status
        FROM store_items 
        ORDER BY id 
        LIMIT 10
    ''')
    
    print("📚 First 10 store items in database:\n")
    print(f"{'ID':<5} {'Title':<40} {'Author':<25} {'Price':<8} {'Sales':<7} {'Revenue':<10} {'Status':<10}")
    print("=" * 120)
    
    for row in cur.fetchall():
        item_id, title, author, price, epub_url, sales, revenue, created, status = row
        title_short = title[:37] + "..." if len(title) > 40 else title
        author_short = author[:22] + "..." if len(author) > 25 else author
        epub_preview = epub_url[:50] if epub_url else "None"
        print(f"{item_id:<5} {title_short:<40} {author_short:<25} ${price:<7} {sales:<7} ${revenue or 0:<9} {status:<10}")
    
    print()
    
    # Check if these are real or placeholder
    cur.execute('''
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE epub_blob_url LIKE '%gutenberg%') as gutenberg,
            COUNT(*) FILTER (WHERE epub_blob_url LIKE '%placeholder%' OR epub_blob_url LIKE '%example%') as placeholder,
            COUNT(*) FILTER (WHERE total_sales > 0) as with_sales,
            SUM(total_revenue) as total_revenue
        FROM store_items
    ''')
    
    stats = cur.fetchone()
    print("📊 Store Statistics:")
    print(f"  Total items: {stats[0]}")
    print(f"  Gutenberg (free): {stats[1]}")
    print(f"  Placeholder/Example: {stats[2]}")
    print(f"  Items with sales: {stats[3]}")
    print(f"  Total revenue: ${stats[4] or 0}")
    
    print()
    
    # Check epub URLs to see if they're real
    cur.execute('''
        SELECT epub_blob_url, COUNT(*) 
        FROM store_items 
        GROUP BY epub_blob_url 
        LIMIT 5
    ''')
    
    print("📎 Sample EPUB URLs:")
    for url, count in cur.fetchall():
        print(f"  {url} ({count} books)")
    
finally:
    if conn:
        conn.close()
