# Database Safety & Protection Guide

## Current Risk: Single Database
⚠️ **CRITICAL**: Currently using ONE Neon database for development/testing AND production. This is dangerous!

## Recommended Architecture

### 1. Three-Database Setup
```
┌─────────────────┐
│   Development   │  ← Local PostgreSQL (Docker)
│   (your laptop) │  ← Disposable, can be wiped anytime
└─────────────────┘

┌─────────────────┐
│     Staging     │  ← Neon DB (separate from prod)
│  (workshelf.dev)│  ← For testing deployments
└─────────────────┘

┌─────────────────┐
│   Production    │  ← Neon DB (separate, protected)
│ (workshelf.com) │  ← Real user data, NEVER touch directly
└─────────────────┘
```

### 2. Immediate Actions Required

#### A. Create Separate Neon Databases
1. Go to https://console.neon.tech
2. Create TWO new databases:
   - `workshelf-staging` (for testing)
   - `workshelf-production` (for real users)
3. Update `.env` files accordingly

#### B. Enable Neon Backups
Neon automatically provides:
- **Point-in-Time Recovery (PITR)**: Restore to any point in last 7 days (Free tier) or 30 days (paid)
- **Branch Protection**: Create database branches for testing

To enable:
```bash
# In Neon console, go to your database → Settings → Backups
# Enable automatic backups with desired retention period
```

#### C. Never Run Destructive Operations
**NEVER DO THIS IN PRODUCTION:**
```python
# ❌ BAD - drops all tables
Base.metadata.drop_all()

# ❌ BAD - deletes data
db.query(User).delete()

# ❌ BAD - alters columns without migration
ALTER TABLE users DROP COLUMN important_data;
```

**ALWAYS DO THIS:**
```python
# ✅ GOOD - soft deletes
user.is_deleted = True

# ✅ GOOD - versioned migrations
alembic revision --autogenerate -m "add new column"
alembic upgrade head

# ✅ GOOD - test in staging first
# Deploy to staging → verify → then deploy to production
```

### 3. Migration Safety Rules

#### Rule 1: Never Drop Columns Immediately
```python
# WRONG - immediate column drop
def upgrade():
    op.drop_column('users', 'old_column')

# RIGHT - deprecate first, drop later
def upgrade():
    # Migration 1: Add new column, mark old as deprecated
    op.add_column('users', sa.Column('new_column', sa.String))
    
    # Migration 2 (weeks later, after code updated): Drop old column
    op.drop_column('users', 'old_column')
```

#### Rule 2: Always Test Migrations
```bash
# Test migration up AND down
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

#### Rule 3: Backup Before Every Migration
```bash
# In Neon console, create a branch before running migrations
# This gives you instant rollback capability
```

### 4. Deployment Safety Checklist

Before EVERY deployment:
- [ ] Create Neon database branch (instant backup)
- [ ] Run migrations in staging first
- [ ] Verify application works in staging
- [ ] Monitor logs for errors
- [ ] Have rollback plan ready
- [ ] Deploy during low-traffic hours

### 5. Database Branching Workflow (Neon Feature)

Neon allows database "branches" - instant copies of your database:

```bash
# Create a branch for testing
neonctl branches create --name test-migration-123

# Test your changes
# If it works: merge changes to main
# If it fails: delete branch, no harm done
```

### 6. Monitoring & Alerts

Set up alerts for:
- Database connection failures
- Query errors
- Slow queries (> 1 second)
- High error rates in Sentry

### 7. User Data Separation (Advanced)

For maximum protection, consider:

**Option A: Separate Document Storage Database**
```
Main DB (Neon)          Document DB (Neon)
├── users               ├── documents
├── projects            ├── document_versions
├── groups              ├── document_content
└── store               └── document_metadata
```

**Option B: S3 for Documents**
- Store actual document content in S3/MinIO
- Only store metadata in database
- This protects against database corruption affecting user files

### 8. Disaster Recovery Plan

If something goes wrong:

1. **Immediate Response**
   ```bash
   # Stop all deployments
   # Roll back to last known good state
   alembic downgrade <revision>
   ```

2. **Restore from Backup**
   - Neon: Use point-in-time recovery in console
   - Restore to exact timestamp before issue

3. **Communicate**
   - Alert users immediately
   - Provide timeline for restoration
   - Offer compensation if data lost

## Current Status

### What's Protected
- ✅ Neon automatic backups (7-day retention)
- ✅ Alembic migrations in place
- ✅ Soft deletes implemented (is_deleted flag)

### What's At Risk
- ❌ Using single database for dev + prod
- ❌ No pre-deployment database branching
- ❌ No automated migration testing
- ❌ No backup verification process

## Next Steps (Priority Order)

1. **TODAY**: Create separate staging database in Neon
2. **THIS WEEK**: 
   - Set up automated backups with 30-day retention
   - Create deployment checklist
   - Test restore process
3. **THIS MONTH**:
   - Move to separate production database
   - Implement database branching for all deployments
   - Set up monitoring alerts
4. **BEFORE LAUNCH**:
   - Full disaster recovery drill
   - Document all procedures
   - Train team on safety protocols

## Resources

- [Neon Point-in-Time Recovery](https://neon.tech/docs/guides/branch-restore)
- [Neon Database Branching](https://neon.tech/docs/guides/branching)
- [Alembic Best Practices](https://alembic.sqlalchemy.org/en/latest/cookbook.html)
