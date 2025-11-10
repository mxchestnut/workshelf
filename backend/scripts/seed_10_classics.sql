-- Seed 10 classic ebooks to store
-- Run this manually with: psql $DATABASE_URL -f seed_10_classics.sql

-- First get a seller_id (assumes at least one user exists)
DO $$
DECLARE
    v_seller_id INT;
BEGIN
    -- Get first user as seller
    SELECT id INTO v_seller_id FROM users LIMIT 1;
    
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'No users found. Create a user first.';
    END IF;
    
    -- Insert 10 classics if store is empty
    IF (SELECT COUNT(*) FROM store_items) = 0 THEN
        INSERT INTO store_items (
            seller_id, title, author_name, description, price_usd,
            epub_blob_url, cover_image_url, word_count, page_count,
            language, status, is_featured, is_bestseller, is_new_release,
            tags, has_audiobook, created_at, updated_at
        ) VALUES
        (v_seller_id, 'Pride and Prejudice', 'Jane Austen', 
         'A witty tale of love, marriage, and social class in Regency England.',
         2.99, 'https://www.gutenberg.org/ebooks/1342.epub.images',
         'https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg',
         122000, 488, 'en', 'active', true, true, false,
         ARRAY['romance', 'classic', 'literary-fiction', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'Frankenstein', 'Mary Shelley',
         'The original science fiction horror novel about creation and responsibility.',
         2.99, 'https://www.gutenberg.org/ebooks/84.epub.images',
         'https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg',
         75000, 300, 'en', 'active', true, false, false,
         ARRAY['horror', 'sci-fi', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'Dracula', 'Bram Stoker',
         'The definitive vampire novel that shaped horror literature forever.',
         2.99, 'https://www.gutenberg.org/ebooks/345.epub.images',
         'https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg',
         164000, 656, 'en', 'active', true, false, false,
         ARRAY['horror', 'gothic', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle',
         'Twelve brilliant detective stories featuring the legendary Sherlock Holmes.',
         2.99, 'https://www.gutenberg.org/ebooks/1661.epub.images',
         'https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg',
         110000, 440, 'en', 'active', true, true, false,
         ARRAY['mystery', 'detective', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'A Tale of Two Cities', 'Charles Dickens',
         'Set during the French Revolution, a story of sacrifice, resurrection, and love.',
         2.99, 'https://www.gutenberg.org/ebooks/98.epub.images',
         'https://www.gutenberg.org/cache/epub/98/pg98.cover.medium.jpg',
         135000, 540, 'en', 'active', true, false, false,
         ARRAY['historical-fiction', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'The Picture of Dorian Gray', 'Oscar Wilde',
         'A philosophical novel about beauty, morality, and the consequences of hedonism.',
         2.99, 'https://www.gutenberg.org/ebooks/174.epub.images',
         'https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg',
         78000, 312, 'en', 'active', true, false, false,
         ARRAY['classic', 'philosophical-fiction', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'Alice''s Adventures in Wonderland', 'Lewis Carroll',
         'A whimsical journey through a fantastical underground world.',
         2.99, 'https://www.gutenberg.org/ebooks/11.epub.images',
         'https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg',
         27000, 108, 'en', 'active', true, true, false,
         ARRAY['fantasy', 'classic', 'children', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'The Great Gatsby', 'F. Scott Fitzgerald',
         'The quintessential American novel of jazz age excess and tragedy.',
         2.99, 'https://www.gutenberg.org/ebooks/64317.epub.images',
         'https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg',
         48000, 192, 'en', 'active', true, true, false,
         ARRAY['american-literature', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'Wuthering Heights', 'Emily Brontë',
         'A dark, passionate tale of love and revenge on the Yorkshire moors.',
         2.99, 'https://www.gutenberg.org/ebooks/768.epub.images',
         'https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg',
         107000, 428, 'en', 'active', true, false, false,
         ARRAY['romance', 'gothic', 'classic', 'public-domain'],
         false, NOW(), NOW()),
        
        (v_seller_id, 'Jane Eyre', 'Charlotte Brontë',
         'An orphan girl becomes a governess and finds independence, love, and mystery.',
         2.99, 'https://www.gutenberg.org/ebooks/1260.epub.images',
         'https://www.gutenberg.org/cache/epub/1260/pg1260.cover.medium.jpg',
         189000, 756, 'en', 'active', true, true, false,
         ARRAY['romance', 'classic', 'gothic', 'public-domain'],
         false, NOW(), NOW());
        
        RAISE NOTICE '✅ Successfully seeded 10 public domain classics at $2.99 each';
    ELSE
        RAISE NOTICE '⚠️  Store already has items. Skipping seed.';
    END IF;
END $$;
