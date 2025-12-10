-- Add store_item_id to bookshelf_items table for published WorkShelf books
-- This allows users to save published store items to their bookshelf

-- Add store_item_id column
ALTER TABLE bookshelf_items 
ADD COLUMN IF NOT EXISTS store_item_id INTEGER;

-- Add foreign key constraint
ALTER TABLE bookshelf_items 
ADD CONSTRAINT fk_bookshelf_items_store_item_id 
FOREIGN KEY (store_item_id) 
REFERENCES store_items(id) 
ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS ix_bookshelf_items_store_item_id 
ON bookshelf_items(store_item_id);
