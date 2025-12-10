# Bookshelf Integration with Published EPUBs

## Overview
This feature allows users to save published WorkShelf books to their bookshelf and read them using the Readium EPUB reader.

## Complete Workflow

### 1. Publishing a Document
1. Writer opens document in StudioV2
2. Changes status to "Published"
3. PublishModal opens with 3-step wizard:
   - **Preview**: See Readium features, word count, reading time
   - **Pricing**: Set free or paid ($0.99+ minimum), add description and genres
   - **Confirm**: Review details and publish
4. Backend creates EPUB from TipTap JSON
5. EPUB uploaded to S3: `s3://bucket/published-books/{hash}.epub`
6. StoreItem created with pricing and epub_blob_url
7. Document status changed to "published"

### 2. Reading a Published Book
1. Reader visits `/read/{store_item_id}`
2. ReadPage shows:
   - Book cover, title, author
   - Description and pricing
   - "Start Reading" or "Purchase" button (if paid)
3. Access control checks:
   - Free books: immediate access
   - Paid books: requires purchase
4. EpubReader opens with full Readium functionality
5. Reading progress tracked and saved

### 3. Saving to Bookshelf
1. On ReadPage, user clicks "Save to Bookshelf"
2. BookshelfItem created with:
   - `store_item_id`: Links to published work
   - `epub_url`: S3 URL for EPUB file
   - `status`: Default "want-to-read"
   - Book metadata (title, author, cover)
3. Button changes to "In your bookshelf"

### 4. Reading from Bookshelf
1. User visits `/bookshelf`
2. Books with `epub_url` or `store_item_id` show "Read" button
3. Button shows reading progress if exists: "Continue (45%)"
4. Clicking "Read" navigates to `/read/{store_item_id}`
5. Opens EpubReader with saved reading position

## Database Schema

### bookshelf_items Table
```sql
ALTER TABLE bookshelf_items 
ADD COLUMN store_item_id INTEGER REFERENCES store_items(id) ON DELETE CASCADE;

CREATE INDEX ix_bookshelf_items_store_item_id ON bookshelf_items(store_item_id);
```

### Key Columns
- `item_type`: 'document' or 'book'
- `store_item_id`: Links to published WorkShelf books
- `epub_url`: S3 URL for EPUB file
- `reading_progress`: Percentage (0-100)
- `last_location`: EPUB CFI for resuming
- `status`: reading, read, want-to-read, favorites, dnf

## API Endpoints

### Publishing
- `POST /api/v1/documents/{id}/publish`
  - Body: `{price_usd, description, genres}`
  - Creates EPUB, uploads to S3, creates StoreItem

### Store Access
- `GET /api/v1/store/{item_id}`
  - Returns: StoreItemResponse with epub_blob_url
- `GET /api/v1/store/{item_id}/access`
  - Returns: `{has_access, reason, epub_url}`

### Bookshelf
- `POST /api/v1/bookshelf`
  - Body: `{item_type, store_item_id, epub_url, title, author, ...}`
  - Adds published book to user's bookshelf
- `GET /api/v1/bookshelf`
  - Returns: List of bookshelf items with epub_url
- `POST /api/v1/bookshelf/{id}/progress`
  - Body: `{last_location, reading_progress}`
  - Updates reading position

## Frontend Components

### ReadPage.tsx (`/read/{itemId}`)
- Displays book details and pricing
- Access control (free/purchased)
- "Save to Bookshelf" button
- Opens EpubReader for reading
- Tracks reading progress

### Bookshelf.tsx (`/bookshelf`)
- Shows all bookshelf items with tabs
- "Read" button for items with epub_url
- Shows reading progress
- Navigates to ReadPage on click

### EpubReader.tsx
- Full Readium EPUB reader
- Progress tracking with CFI locations
- Saves progress to backend

### PublishModal.tsx
- 3-step publishing wizard
- Preview → Pricing → Confirm
- Integrates with StudioV2

## Storage Architecture

### AWS S3 Buckets
- **Published Books**: `s3://bucket/published-books/{hash}.epub`
  - Public-readable EPUBs for published works
  - Permanent storage
  - CDN-friendly
  
- **EPUB Submissions**: `s3://bucket/epub-submissions/{hash}.epub`
  - User-uploaded EPUBs for moderation
  - Private access
  - Moderation workflow

### S3 Configuration
```env
S3_ACCESS_KEY_ID_CLEAN=<aws-access-key>
S3_SECRET_ACCESS_KEY_CLEAN=<aws-secret>
S3_BUCKET_NAME=<bucket-name>
S3_REGION=us-east-1
S3_ENDPOINT_URL=<optional-minio-endpoint>
```

## User Experience Flow

### For Writers
1. Write document in editor
2. Click "Published" status
3. Set pricing and metadata
4. Publish → Document converts to EPUB
5. Share published work with readers

### For Readers
1. Discover published book
2. Click "Read" (if free) or "Purchase"
3. Save to bookshelf for later
4. Access from bookshelf anytime
5. Reading progress synced
6. Rate and review when finished

## Technical Implementation

### EPUB Generation
- Converts TipTap JSON → HTML → EPUB
- Handles all node types (paragraphs, headings, lists, tables, images, links)
- Applies text marks (bold, italic, code, strike)
- Creates proper EPUB structure (NCX, OPF, spine)
- Uses ebooklib library

### Reading Progress Tracking
- EPUB CFI (Canonical Fragment Identifier) for precise location
- Percentage-based progress (0-100)
- Saved to both:
  - `reading_progress` table (store items)
  - `bookshelf_items.last_location` (bookshelf)

### Access Control
- Free books: Immediate access
- Paid books: Requires purchase
- Access checked via `/store/{id}/access` endpoint
- JWT token authentication

## Benefits

1. **For Writers**
   - Easy publishing workflow
   - Professional EPUB format
   - Flexible pricing options
   - Distribution through WorkShelf

2. **For Readers**
   - Save books to personal library
   - Read anywhere with Readium
   - Progress automatically saved
   - Organize reading lists
   - Rate and review books

3. **For Platform**
   - Complete publishing pipeline
   - Professional reading experience
   - Engaged user community
   - Monetization through sales
   - Reading analytics

## Future Enhancements

- Automatic bookshelf add on purchase
- Reading streaks and goals
- Social features (share reading progress)
- Reading lists and collections
- Recommendations based on bookshelf
- Offline reading support
- Mobile app integration
- Advanced analytics dashboard
