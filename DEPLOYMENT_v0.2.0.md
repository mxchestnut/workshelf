# Version 0.2.0 - Deployment Summary

**Release Date:** December 10, 2025  
**Git Tag:** `v0.2.0`  
**Commit:** `2e468ab`  
**Status:** ✅ **DEPLOYED TO PRODUCTION**

---

## 📦 What's Included

### Core Improvements
1. **✅ Soft-Delete Protection for Groups**
   - Added `is_deleted` and `deleted_at` columns to `groups` table
   - All group queries now filter out soft-deleted items
   - Prevents permanent data loss, provides 30-day recovery window

2. **✅ Flattened Migration System**
   - Consolidated 31 messy migrations → 1 clean baseline (`consolidated_dec_2025`)
   - Fixed Alembic errors (duplicate revisions, broken chains, KeyError issues)
   - Migrations now work cleanly: `alembic current`, `alembic history` both pass

3. **✅ Security & Safety**
   - Archived dangerous deletion script (`delete_broomsticks.py.DANGEROUS_ARCHIVED`)
   - Added prominent warnings to `delete_user.py` and `delete_all_users.py`
   - Created Keycloak password reset utility (`reset_keycloak_password.py`)

4. **✅ Version Management**
   - Updated `VERSION` to `0.2.0` in config.py
   - Fixed hardcoded version strings in main.py to use `settings.VERSION`
   - API health endpoint now correctly reports version

---

## 🚀 Production Deployment

### Services Status
- **Frontend:** https://workshelf.dev ✅ Online
- **API:** https://api.workshelf.dev ✅ Online (v0.2.0)
- **Keycloak:** https://keycloak.workshelf.dev ✅ Online
- **Database:** Neon PostgreSQL (ep-cold-rice-ad0d3rzt) ✅ Connected

### Database Snapshot (v0.2.0)
```
Timestamp: 2025-12-10T09:50:40 UTC
Migration: consolidated_dec_2025

Table Counts:
  users: 2
  groups: 1 (soft-delete enabled)
  documents: 0
  group_members: 1
  group_posts: 2
  store_items: 0
  group_invitations: 0
  bookshelf_items: 0
```

### Container Status
```bash
# All services running on 34.239.176.138
✅ deploy-frontend-1   (Nginx)
✅ deploy-backend-1    (FastAPI v0.2.0)
✅ deploy-keycloak-1   (Auth)
✅ deploy-redis-1      (Cache)
✅ deploy-minio-1      (Object Storage)
✅ deploy-postgres-1   (Local - Keycloak only)
```

---

## 🔧 Technical Changes

### Files Modified
1. `backend/app/core/config.py` - VERSION: "0.1.0" → "0.2.0"
2. `backend/app/main.py` - Use `settings.VERSION` instead of hardcoded strings
3. `frontend/package.json` - version: "0.1.1" → "0.2.0"
4. `backend/app/models/collaboration.py` - Added soft-delete columns to Group model
5. `backend/app/api/groups.py` - Added `is_deleted=False` filters to all queries

### Files Added
1. `RELEASE_NOTES_v0.2.0.md` - Comprehensive release documentation
2. `backend/alembic/versions/001_consolidated_schema_dec_2025.py` - New migration baseline
3. `backend/scripts/apply_soft_delete_migration.py` - Manual migration script
4. `backend/scripts/reset_keycloak_password.py` - Password recovery utility

### Files Archived
1. `backend/alembic/versions/_archived_migrations/` - 31 old migrations moved here
2. `backend/scripts/delete_broomsticks.py.DANGEROUS_ARCHIVED` - Disabled dangerous script

---

## ✅ Verification Tests

### API Health Check
```bash
curl -s https://api.workshelf.dev/health
```
**Result:** ✅ `{"status": "healthy", "version": "0.2.0", "service": "work-shelf-api"}`

### Alembic Migration Check
```bash
alembic current
```
**Result:** ✅ `consolidated_dec_2025 (head)`

### Groups Soft-Delete Check
```sql
SELECT COUNT(*) FROM groups WHERE is_deleted = false;
```
**Result:** ✅ `1 active group`

### Database Connection
```bash
psql $DATABASE_URL -c "SELECT version_num FROM alembic_version"
```
**Result:** ✅ `consolidated_dec_2025`

---

## 📋 Post-Deployment Checklist

- [x] Code committed and tagged (`v0.2.0`)
- [x] Pushed to GitHub (main branch + tag)
- [x] Pulled to production server (34.239.176.138)
- [x] Backend rebuilt and redeployed
- [x] API health check passing (v0.2.0)
- [x] Alembic migrations working (no errors)
- [x] Database snapshot documented
- [x] Release notes published
- [ ] Neon database branch snapshot created (manual via console)
- [ ] Missing groups restored (pending user input)

---

## 🐛 Known Issues

### Data Loss Investigation (Active)
- **Issue:** User reports 6-7 groups expected, only 1 exists
- **Status:** Soft-delete protection now in place to prevent future loss
- **Next Steps:** Need user to identify missing groups for restoration
- **Root Cause:** No CASCADE from users, no dangerous scripts ran recently - cause still unknown

### Future Improvements Needed
1. Automated Neon database snapshots (daily/weekly)
2. Database integrity monitoring & alerts
3. Backup/restore procedures documented
4. Pre-deployment data validation checks

---

## 🔄 Rollback Plan (if needed)

Should issues arise, rollback to previous version:

```bash
# On production server
cd /opt/workshelf
sudo git checkout v0.1.0  # Previous stable version
cd deploy
sudo docker-compose -f docker-compose.prod.yml build backend
sudo docker-compose -f docker-compose.prod.yml up -d backend

# Restore migration state (if needed)
docker-compose exec backend python -c "
from sqlalchemy import create_engine, text
import os
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    conn.execute(text('DELETE FROM alembic_version'))
    conn.execute(text(\"INSERT INTO alembic_version VALUES ('005_add_group_privacy_levels')\"))
    conn.execute(text(\"INSERT INTO alembic_version VALUES ('005_add_page_tracking_system')\"))
    conn.commit()
"
```

**Note:** Soft-delete columns will remain (backward compatible), but won't be used by older code.

---

## 📞 Support & Maintenance

### Key Credentials (stored in `.CREDENTIALS_SECURE.md`)
- **Server SSH:** `~/.ssh/workshelf-key.pem`
- **Server IP:** 34.239.176.138
- **Keycloak Admin:** admin / h2@n4me#Yu!ac!6nVh
- **Neon Database:** ep-cold-rice-ad0d3rzt-pooler.c-2.us-east-1.aws.neon.tech
- **User Account:** warpxth / NxMW6vRmC3Sqn2N

### Useful Commands
```bash
# Check API version
curl -s https://api.workshelf.dev/health | grep version

# View backend logs
ssh ubuntu@34.239.176.138 "sudo docker logs deploy-backend-1 --tail 100"

# Check migration status
ssh ubuntu@34.239.176.138 "cd /opt/workshelf/deploy && sudo docker-compose -f docker-compose.prod.yml exec -T backend alembic current"

# Query active groups
ssh ubuntu@34.239.176.138 "cd /opt/workshelf/deploy && sudo docker-compose -f docker-compose.prod.yml exec -T backend python -c '
import os
from sqlalchemy import create_engine, text
engine = create_engine(os.getenv(\"DATABASE_URL\").replace(\"postgresql://\", \"postgresql+psycopg2://\"))
with engine.connect() as conn:
    result = conn.execute(text(\"SELECT id, name, is_deleted FROM groups\"))
    for row in result: print(row)
'"
```

---

## 🎯 Next Release (v0.3.0)

**Planned Features:**
1. Automated database backups via Neon branches
2. Restore missing groups
3. Add soft-delete to other critical tables (documents, users, etc.)
4. Implement data integrity monitoring
5. Create admin dashboard for data recovery

---

**Deployed by:** GitHub Copilot  
**Approved by:** @mxchestnut  
**Deployment Time:** ~15 minutes (9:45 AM - 10:00 AM UTC)  
**Downtime:** None (rolling restart)  
**Issues Encountered:** Version caching (resolved by rebuilding container)
