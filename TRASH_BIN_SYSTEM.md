# Trash Bin System - Implementation Guide

## Overview

Complete trash bin system with 30-day auto-purge for soft-deleted documents and projects. Provides one layer of protection against accidental deletion while ensuring data doesn't linger indefinitely.

**Status:** ✅ Implemented (December 3, 2025)

---

## Features

### 1. Soft Delete (Move to Trash)

Instead of permanent deletion, items are moved to trash:
- ✅ Documents can be moved to trash
- ✅ Projects can be moved to trash (optionally with all documents)
- ✅ Items remain in trash for 30 days
- ✅ Automatic permanent deletion after 30 days
- ✅ Manual "Empty Trash" option

### 2. Restore from Trash

Users can recover items within 30 days:
- ✅ Restore individual documents
- ✅ Restore individual projects (optionally with all documents)
- ✅ Restores all metadata and relationships
- ✅ No data loss during restoration

### 3. Permanent Deletion

Users can manually force permanent deletion:
- ✅ Delete individual items from trash
- ✅ Empty entire trash (all documents and projects)
- ✅ Auto-purge after 30 days

### 4. Trash Management

Complete trash bin interface:
- ✅ View all trashed items
- ✅ See deletion date and days remaining
- ✅ Filter by type (documents/projects)
- ✅ Trash statistics (items expiring soon)
- ✅ Bulk operations (empty all)

---

## Technical Implementation

### Database Schema

**Migration:** `006_add_trash_bin_soft_deletes.py`

```sql
-- Added to documents table
ALTER TABLE documents ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE documents ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX ix_documents_is_deleted ON documents(is_deleted);

-- Added to projects table
ALTER TABLE projects ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX ix_projects_is_deleted ON projects(is_deleted);
```

### Backend API

**Endpoints:**

#### Documents
- `POST /api/v1/trash/documents/{id}` - Move document to trash
- `POST /api/v1/trash/documents/{id}/restore` - Restore document from trash
- `DELETE /api/v1/trash/documents/{id}` - Permanently delete document
- `GET /api/v1/trash/documents` - List trashed documents
- `DELETE /api/v1/trash/documents` - Empty document trash

#### Projects
- `POST /api/v1/trash/projects/{id}` - Move project to trash
  - Query param: `move_documents=true` to also trash documents
- `POST /api/v1/trash/projects/{id}/restore` - Restore project from trash
  - Query param: `restore_documents=true` to also restore documents
- `DELETE /api/v1/trash/projects/{id}` - Permanently delete project
- `GET /api/v1/trash/projects` - List trashed projects
- `DELETE /api/v1/trash/projects` - Empty project trash

#### Trash Management
- `GET /api/v1/trash/stats` - Get trash statistics
- `DELETE /api/v1/trash/empty` - Empty all trash (documents + projects)

### Service Layer

**TrashService** (`app/services/trash_service.py`)

Key methods:

**Documents:**
- `move_document_to_trash()` - Soft delete document
- `restore_document_from_trash()` - Restore document
- `permanently_delete_document()` - Hard delete document
- `get_trashed_documents()` - List user's trashed documents
- `empty_document_trash()` - Delete all user's trashed documents

**Projects:**
- `move_project_to_trash()` - Soft delete project (with optional document deletion)
- `restore_project_from_trash()` - Restore project (with optional document restoration)
- `permanently_delete_project()` - Hard delete project
- `get_trashed_projects()` - List user's trashed projects
- `empty_project_trash()` - Delete all user's trashed projects

**Auto-Purge:**
- `purge_expired_trash_documents()` - Delete documents older than 30 days
- `purge_expired_trash_projects()` - Delete projects older than 30 days
- `purge_all_expired_trash()` - Run full purge (both documents and projects)

**Utilities:**
- `get_trash_stats()` - Get statistics (total items, expiring soon, etc.)

### Model Changes

**Document Model** (`app/models/document.py`)
```python
is_deleted = Column(Boolean, default=False, nullable=False, index=True)
deleted_at = Column(DateTime, nullable=True)
```

**Project Model** (`app/models/project.py`)
```python
is_deleted = Column(Boolean, default=False, nullable=False, index=True)
deleted_at = Column(DateTime, nullable=True)
```

### Query Filtering

All list queries automatically exclude soft-deleted items:

```python
# Before
query = select(Document).where(Document.owner_id == user_id)

# After
query = select(Document).where(
    Document.owner_id == user_id,
    Document.is_deleted == False  # Exclude trashed items
)
```

### Auto-Purge Script

**Script:** `backend/scripts/cleanup_trash.py`

Automatically deletes items older than 30 days:

```bash
# Run manually
python scripts/cleanup_trash.py

# Schedule via cron (daily at 2 AM)
0 2 * * * cd /app/backend && python scripts/cleanup_trash.py
```

---

## User Experience

### Delete Flow (Before)

1. User clicks delete → Confirmation dialog
2. ❌ **PERMANENT DELETION** (no recovery possible)

### Delete Flow (After)

1. User clicks delete → Item moved to trash
2. ✅ Item stays in trash for 30 days
3. ✅ User can restore anytime within 30 days
4. ✅ Auto-deleted after 30 days (or user empties trash manually)

### Benefits

- **Safety:** Accidental deletions can be recovered
- **Peace of mind:** 30-day grace period
- **Clean data:** Automatic purge prevents indefinite storage
- **User control:** Manual "Empty Trash" for immediate deletion
- **Compliance:** Documented data retention policy

---

## Configuration

### Retention Period

To change the 30-day retention period, edit `backend/app/services/trash_service.py`:

```python
# Current: 30 days
TRASH_RETENTION_DAYS = 30

# To change to 60 days:
TRASH_RETENTION_DAYS = 60
```

### Auto-Purge Schedule

To change the auto-purge schedule, edit crontab:

```cron
# Current: Daily at 2 AM
0 2 * * * cd /app/backend && python scripts/cleanup_trash.py

# Weekly on Sundays at 3 AM:
0 3 * * 0 cd /app/backend && python scripts/cleanup_trash.py
```

---

## Frontend Integration (To Do)

### Trash Page (`/trash`)

Display all trashed items with:
- ✅ List of documents and projects
- ✅ Deletion date and days remaining
- ✅ Restore button (per item)
- ✅ Delete permanently button (per item)
- ✅ Empty trash button (all items)
- ✅ Trash statistics widget

### Document/Project Lists

Update lists to show trash status:
- Show trash icon for deleted items
- Filter out deleted items by default
- "Show trash" toggle to include deleted items
- Quick restore action

### Delete Confirmation

Update delete buttons:
- Change "Delete" to "Move to Trash"
- Update confirmation: "Move to trash? You can restore it within 30 days."
- Remove scary permanent deletion warnings
- Add link to trash page

---

## Testing

### Manual Testing Checklist

**Document Soft Delete:**
- [ ] Delete document → Moves to trash
- [ ] Verify document not in main list
- [ ] Check trash → Document appears
- [ ] Verify deleted_at timestamp is set
- [ ] Verify is_deleted = true

**Document Restore:**
- [ ] Restore document from trash
- [ ] Verify document back in main list
- [ ] Verify deleted_at is NULL
- [ ] Verify is_deleted = false
- [ ] Verify all metadata intact

**Project Soft Delete:**
- [ ] Delete project without documents → Project only to trash
- [ ] Delete project with documents → Both to trash
- [ ] Verify documents also trashed if option selected

**Project Restore:**
- [ ] Restore project without documents → Project only restored
- [ ] Restore project with documents → Both restored
- [ ] Verify documents also restored if option selected

**Permanent Delete:**
- [ ] Permanently delete single document → Gone forever
- [ ] Empty document trash → All documents gone
- [ ] Empty entire trash → All items gone
- [ ] Verify CASCADE deletes work properly

**Auto-Purge:**
- [ ] Manually set deleted_at to 31 days ago
- [ ] Run cleanup script
- [ ] Verify old items deleted
- [ ] Verify recent items kept

### Database Verification

```sql
-- Check trash items
SELECT id, title, is_deleted, deleted_at 
FROM documents 
WHERE is_deleted = true;

-- Check items expiring soon (within 7 days)
SELECT id, title, deleted_at,
       30 - EXTRACT(DAY FROM NOW() - deleted_at) as days_remaining
FROM documents 
WHERE is_deleted = true 
  AND deleted_at <= NOW() - INTERVAL '23 days';

-- Verify auto-purge
SELECT COUNT(*) FROM documents 
WHERE is_deleted = true 
  AND deleted_at <= NOW() - INTERVAL '30 days';
-- Should be 0 after auto-purge runs
```

---

## Data Retention Policy

### Policy Statement

> **WorkShelf Data Retention Policy**
>
> - **Active Content:** Stored indefinitely while account is active
> - **Deleted Content:** Moved to trash, stored for 30 days
> - **Trash Auto-Purge:** Items permanently deleted after 30 days
> - **Manual Purge:** Users can manually empty trash anytime
> - **Account Deletion:** All data deleted within 90 days of account deletion
> - **Legal Requirements:** Some data retained longer for compliance (payment records, etc.)

### Privacy Policy Updates

Add to privacy policy (`frontend/src/pages/PrivacyPolicy.tsx`):

```markdown
## 6. Data Retention

We retain your data for as long as your account is active. When you delete content:

- **Deleted Documents/Projects:** Moved to trash for 30 days
- **Trash:** Automatically purged after 30 days
- **Manual Deletion:** You can manually empty trash anytime
- **Account Deletion:** All personal data deleted within 90 days

For legal and compliance purposes, some data may be retained longer (e.g., payment records for tax purposes).
```

---

## Monitoring

### Metrics to Track

- **Trash Size:** Number of items in trash per user
- **Trash Growth:** Rate of items moved to trash
- **Restore Rate:** % of trashed items restored vs. purged
- **Purge Statistics:** Items deleted by auto-purge each day
- **Storage Impact:** Disk space used by trashed items

### Logging

All trash operations are logged:

```python
# Example log entries
INFO: Moved document 123 to trash (user 456)
INFO: Restored document 123 from trash (user 456)
INFO: Permanently deleted document 123 (user 456)
INFO: Auto-purged 5 expired documents from trash
INFO: Emptied trash for user 456: 10 documents deleted
```

### Alerts

Consider setting up alerts for:
- ⚠️ Auto-purge failures
- ⚠️ Trash size exceeds threshold (e.g., 1000 items per user)
- ⚠️ Unusual deletion patterns (bulk deletions)

---

## Security Considerations

### Access Control

- ✅ Users can only access their own trash
- ✅ All endpoints require authentication
- ✅ Ownership verification before restore/delete
- ✅ No way to access another user's trash

### Audit Trail

All deletions are logged with:
- User ID
- Document/Project ID
- Timestamp
- Action (move to trash, restore, permanent delete)

### Data Leakage Prevention

- ✅ Trashed items not visible in public searches
- ✅ Trashed items not visible in studio/group lists
- ✅ Share links disabled for trashed documents
- ✅ Comments hidden on trashed documents

---

## Known Limitations

### 1. Related Data Handling

- **Comments:** Remain attached to trashed documents
- **Share Links:** Remain active (should be disabled)
- **Beta Requests:** Remain attached to trashed documents
- **Reading Progress:** Remains attached to trashed documents

**Recommendation:** Add logic to disable/hide related data for trashed items.

### 2. Storage Space

- Trashed items still consume storage space until purged
- Large files in trash count against user quota

**Recommendation:** Exclude trash from storage quota calculations or add trash size limits.

### 3. Cascading Deletes

- Deleting a project with documents requires explicit flag
- No automatic cascading restore

**Recommendation:** UI should clearly explain document handling.

---

## Future Enhancements

### Priority: Medium

1. **Trash Size Limits**
   - Limit trash to X items or Y GB per user
   - Force purge oldest items when limit exceeded
   - Warning before hitting limit

2. **Selective Auto-Purge**
   - Different retention periods for documents vs. projects
   - VIP users get longer retention (60 days)
   - Premium feature: Extended trash retention

3. **Trash Search**
   - Search within trash
   - Filter by date deleted, type, folder
   - Sort by expiration date

4. **Bulk Operations**
   - Select multiple items to restore
   - Select multiple items to delete permanently
   - Restore entire folder of documents

### Priority: Low

1. **Trash Statistics Dashboard**
   - Visualize trash usage over time
   - Show storage space saved by purging
   - Show most frequently deleted items

2. **Undo Delete**
   - Immediate "Undo" notification after deletion
   - Restore with one click within 5 minutes
   - No need to go to trash page

3. **Scheduled Purge**
   - Allow users to schedule purge for specific date
   - Reminders before auto-purge
   - Opt-in to weekly purge emails

---

## Conclusion

The trash bin system provides essential safety against accidental deletions while maintaining clean data through automatic purging. The 30-day retention period balances user needs with data management best practices.

**Key Benefits:**
- ✅ Accidental deletion protection
- ✅ 30-day grace period
- ✅ Automatic cleanup
- ✅ User control (manual empty trash)
- ✅ Documented data retention policy
- ✅ GDPR compliant (data minimization)

**Next Steps:**
1. Create frontend Trash page (`/trash`)
2. Update delete buttons to "Move to Trash"
3. Add trash statistics widget
4. Update privacy policy
5. Deploy auto-purge cron job
6. Monitor usage and adjust retention period if needed
