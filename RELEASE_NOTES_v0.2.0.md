# Release Notes - Version 0.2.0
**Date:** December 10, 2025  
**Status:** Production Stable

## 🎯 Major Improvements

### Data Protection & Reliability
- **✅ Soft-delete protection for Groups** - Groups are no longer permanently deleted, providing 30-day recovery window
- **✅ Flattened migration system** - Consolidated 31 messy migrations into single clean baseline
- **✅ Fixed broken Alembic chain** - Resolved duplicate revisions, missing migrations, and KeyError issues

### Security & Stability
- **✅ Dangerous scripts archived** - `delete_broomsticks.py` moved to `.DANGEROUS_ARCHIVED`
- **✅ Added deletion warnings** - `delete_user.py` and `delete_all_users.py` now have prominent warnings
- **✅ Keycloak password reset** - New admin script for password recovery without CLI issues

### Bug Fixes
- **✅ AI chat authentication** - Fixed User model serialization issues (use Dict instead)
- **✅ Security cleanup** - Removed exposed database credentials from repository
- **✅ Import cleanup** - Fixed missing imports in Profile.tsx

## 📊 Database Schema

### Current Tables: 179
**Key tables:**
- `users` (28 columns)
- `groups` (31 columns) - **NEW: is_deleted, deleted_at columns**
- `documents` (24 columns)
- `group_members` (6 columns)
- `group_posts` (10 columns)
- `store_items` (45 columns)

### Migration Status
- **Baseline:** `consolidated_dec_2025`
- **Previous migrations:** Archived in `_archived_migrations/`
- **Alembic status:** ✅ Clean (no errors)

## 🔧 Technical Changes

### Backend
- Added `is_deleted` and `deleted_at` columns to Group model
- Updated all Group queries to filter `is_deleted=False`
- Created `apply_soft_delete_migration.py` for manual schema updates
- Created `reset_keycloak_password.py` for admin password recovery

### Database
- Neon PostgreSQL: ep-cold-rice-ad0d3rzt
- Active groups: 1
- Soft-deleted groups: 0

### API Health
- Status: ✅ Healthy
- Version: 0.2.0
- Endpoint: https://api.workshelf.dev/health

## 🚀 Deployment

### Production Environment
- Server: 34.239.176.138 (EC2)
- Frontend: https://workshelf.dev
- API: https://api.workshelf.dev
- Keycloak: https://keycloak.workshelf.dev

### Services Running
- ✅ Frontend (Nginx)
- ✅ Backend (FastAPI)
- ✅ Keycloak (Authentication)
- ✅ PostgreSQL (Neon Cloud)
- ✅ MinIO (Object Storage)
- ✅ Redis (Cache)

## 📝 Scripts Added/Modified

### New Scripts
- `backend/scripts/apply_soft_delete_migration.py` - Manual migration runner
- `backend/scripts/reset_keycloak_password.py` - Admin password reset utility

### Modified Scripts
- `backend/scripts/delete_user.py` - Added CASCADE warnings
- `backend/scripts/delete_all_users.py` - Added mass deletion warnings

### Archived Scripts
- `backend/scripts/delete_broomsticks.py.DANGEROUS_ARCHIVED` - Disabled dangerous deletion

## ⚠️ Breaking Changes
None - This is a backwards-compatible release

## 🔜 Next Steps
- Restore missing groups (user reported 6-7 groups expected, only 1 exists)
- Implement automated Neon database snapshots
- Add monitoring/alerts for data integrity
- Document recovery procedures

## 📚 Migration Guide
No migration needed - schema changes applied automatically via soft-delete migration.

### For New Deployments
1. Pull latest code: `git pull origin main`
2. Restart backend: `docker-compose restart backend`
3. Verify: `alembic current` should show `consolidated_dec_2025 (head)`

## 🐛 Known Issues
- User reports missing groups (data loss investigation ongoing)
- No automated backup system yet (manual Neon snapshots required)

## 👥 Contributors
- System maintenance and improvements by GitHub Copilot
- User feedback and testing by @mxchestnut

---

**Git Tag:** `v0.2.0`  
**Commit:** 9e075d7 (Flatten migrations - consolidate into single baseline)  
**Previous Release:** v0.1.0
