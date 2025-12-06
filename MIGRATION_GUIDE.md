# Migration Guide - Document Modes & Versioning

## Overview
This migration adds Git-style versioning and document modes to WorkShelf.

## What's New
- **4 Document Modes**: alpha (Draft Room), beta (Workshop), publish (Print Queue), read (Bookshelf)
- **Enhanced Versioning**: Full Git-style version history with mode tracking
- **5 New API Endpoints**: Version listing, viewing, restoring, manual commits, and mode transitions

## Running the Migration

### Prerequisites
1. Docker must be running
2. Database must be accessible

### Step 1: Start Docker Services
```bash
cd /Users/kit/Code/workshelf
docker-compose up -d
```

### Step 2: Run the Migration
```bash
cd backend
docker-compose exec backend alembic upgrade head
```

Or if running locally:
```bash
cd backend
alembic upgrade head
```

### Step 3: Verify Migration
```bash
# Check that migration ran successfully
docker-compose exec backend alembic current

# Should show: 005_add_document_modes_and_versioning (head)
```

### Step 4: Test the API
```bash
# Create a test document
curl -X POST http://localhost:8000/api/v1/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "Test Document", "content": "Hello World"}'

# Change mode (should auto-create version)
curl -X POST "http://localhost:8000/api/v1/documents/1/mode?new_mode=beta" \
  -H "Authorization: Bearer YOUR_TOKEN"

# List versions (Git log style)
curl http://localhost:8000/api/v1/documents/1/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## What Changed in the Database

### New Columns in `documents` table:
- `mode` (enum): Current document mode (alpha/beta/publish/read)

### New Columns in `document_versions` table:
- `mode` (enum): Mode at time of version creation
- `previous_mode` (enum): Previous mode (for transitions)
- `is_mode_transition` (boolean): Whether this version was created during mode change

### New Enum Type:
- `documentmode`: PostgreSQL enum with values: 'alpha', 'beta', 'publish', 'read'

## Rollback (if needed)
```bash
# Rollback the migration
alembic downgrade -1

# This will:
# - Drop the mode column from documents
# - Drop mode tracking columns from document_versions
# - Drop the documentmode enum type
```

## API Endpoints Added

1. **GET /api/v1/documents/{id}/versions**
   - List all versions (like `git log`)

2. **GET /api/v1/documents/{id}/versions/{version}**
   - View specific version (like `git show`)

3. **POST /api/v1/documents/{id}/versions/{version}/restore**
   - Restore to previous version (like `git checkout`)

4. **POST /api/v1/documents/{id}/versions?change_summary=...**
   - Create manual version (like `git commit`)

5. **POST /api/v1/documents/{id}/mode?new_mode=beta**
   - Change document mode (auto-creates version)

## Next Steps

After migration:
1. Build frontend mode switcher UI
2. Add version history viewer component
3. Implement mode-specific permissions
4. Test end-to-end workflow

## Troubleshooting

### Migration fails with "relation already exists"
The migration may have partially run. Check current state:
```bash
alembic current
psql workshelf_dev -c "\d documents"  # Check if mode column exists
```

### Event loop warnings in tests
These are cleanup warnings and can be ignored. Tests still pass.

### Mode enum not found
Ensure PostgreSQL enum was created:
```sql
SELECT typname FROM pg_type WHERE typname = 'documentmode';
```

## Questions?
See backend code:
- Models: `backend/app/models/document.py`
- API: `backend/app/api/documents.py`
- Services: `backend/app/services/document_service.py`
- Migration: `backend/alembic/versions/005_add_document_modes_and_versioning.py`
