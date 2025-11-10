#!/usr/bin/env python3
"""Clear placeholder books and seed with real Project Gutenberg classics"""
import psycopg2

conn_str = "postgresql://neondb_owner:npg_c2ZCF0THgyzS@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # Delete all placeholder books (example.com URLs)
    print("🗑️  Deleting placeholder books...")
    cur.execute("DELETE FROM store_items WHERE epub_blob_url LIKE '%example.com%'")
    deleted = cur.rowcount
    print(f"   Deleted {deleted} placeholder items")
    
    # Get seller
    cur.execute('SELECT id FROM users LIMIT 1')
    seller_id = cur.fetchone()[0]
    print(f"\n📚 Using seller_id: {seller_id}")
    
    # Insert 10 real Project Gutenberg classics
    classics = [
        ('Pride and Prejudice', 'Jane Austen', 'A witty tale of love, marriage, and social class in Regency England.', 1342, 122000, 488, True, True, ['romance', 'classic', 'literary-fiction', 'public-domain']),
        ('Frankenstein', 'Mary Shelley', 'The original science fiction horror novel about creation and responsibility.', 84, 75000, 300, True, False, ['horror', 'sci-fi', 'classic', 'public-domain']),
        ('Dracula', 'Bram Stoker', 'The definitive vampire novel that shaped horror literature forever.', 345, 164000, 656, True, False, ['horror', 'gothic', 'classic', 'public-domain']),
        ('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'Twelve brilliant detective stories featuring the legendary Sherlock Holmes.', 1661, 110000, 440, True, True, ['mystery', 'detective', 'classic', 'public-domain']),
        ('A Tale of Two Cities', 'Charles Dickens', 'Set during the French Revolution, a story of sacrifice, resurrection, and love.', 98, 135000, 540, True, False, ['historical-fiction', 'classic', 'public-domain']),
        ('The Picture of Dorian Gray', 'Oscar Wilde', 'A philosophical novel about beauty, morality, and the consequences of hedonism.', 174, 78000, 312, True, False, ['classic', 'philosophical-fiction', 'public-domain']),
        ('Alice\'s Adventures in Wonderland', 'Lewis Carroll', 'A whimsical journey through a fantastical underground world.', 11, 27000, 108, True, True, ['fantasy', 'classic', 'children', 'public-domain']),
        ('The Great Gatsby', 'F. Scott Fitzgerald', 'The quintessential American novel of jazz age excess and tragedy.', 64317, 48000, 192, True, True, ['american-literature', 'classic', 'public-domain']),
        ('Wuthering Heights', 'Emily Brontë', 'A dark, passionate tale of love and revenge on the Yorkshire moors.', 768, 107000, 428, True, False, ['romance', 'gothic', 'classic', 'public-domain']),
        ('Jane Eyre', 'Charlotte Brontë', 'An orphan girl becomes a governess and finds independence, love, and mystery.', 1260, 189000, 756, True, True, ['romance', 'classic', 'gothic', 'public-domain']),
    ]
    
    print("\n📖 Adding 10 real classics...\n")
    
    for title, author, desc, gid, wc, pc, featured, bestseller, tags in classics:
        epub_url = f'https://www.gutenberg.org/ebooks/{gid}.epub.images'
        cover_url = f'https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.cover.medium.jpg'
        
        # Generate unique hash from gutenberg ID
        import hashlib
        file_hash = hashlib.sha256(f'gutenberg_{gid}'.encode()).hexdigest()[:40]
        
        # Use actual schema columns matching deployed model
        cur.execute('''
            INSERT INTO store_items (
                seller_id, title, author_name, description, price_usd,
                epub_blob_url, cover_blob_url, page_count,
                language, status, is_featured, is_bestseller, is_new_release,
                has_audiobook, audiobook_price_usd,
                file_hash, file_size_bytes, total_sales, total_revenue,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        ''', (seller_id, title, author, desc, 2.99, epub_url, cover_url, pc, 'en', 'active', featured, bestseller, False, False, None, file_hash, 0, 0, 0))
        print(f'   ✅ {title} by {author}')
    
    conn.commit()
    
    print()
    print('=' * 70)
    print('🎉 Store updated!')
    print(f'   Removed: {deleted} placeholder books')
    print(f'   Added: 10 real Project Gutenberg classics at $2.99 each')
    print('=' * 70)
    print()
    print('📍 Next steps:')
    print('   1. Visit https://workshelf.dev/store to see real books')
    print('   2. Check https://workshelf.dev/staff/store for analytics')
    print('   3. Test purchase flow with real EPUB downloads')
    print('   4. Track revenue toward $120 audiobook threshold')
    
finally:
    if conn:
        conn.close()
