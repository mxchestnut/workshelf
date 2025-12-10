# WorkShelf Deployment Guide

## The Golden Rule

**🛑 NEVER manually deploy containers to production**

Always follow this workflow:

```
1. Make code changes
2. Git commit (security audit runs automatically)
3. Test locally (docker-compose.local.yml)
4. Run pre-deployment checklist
5. Deploy to production (deploy-prod.sh)
```

## Automated Safety Checks

### Security Audit (runs on every commit)
A pre-commit hook automatically scans for:
- 🔒 Credentials, passwords, API keys
- 🔒 `.env` files, `.pem` files
- 🔒 Database connection strings
- 🔒 Hardcoded tokens and secrets
- 🔒 Previously exposed credentials

**The commit will be BLOCKED if security issues are found.**

### Pre-Deployment Checklist (run before deploying)
```bash
./scripts/pre-deploy-checklist.sh
```
This interactive checklist verifies:
- ✅ All tests passed locally
- ✅ No uncommitted changes
- ✅ Backups created (if needed)
- ✅ Environment variables updated
- ✅ Rollback plan documented

---

## Local Development & Testing

### First-time Setup

```bash
# 1. Start local environment
./scripts/test-local.sh

# 2. Set up Keycloak (if needed)
./setup-keycloak-local.sh

# 3. Run tests
cd backend && pytest tests/
```

### Daily Development

```bash
# Start services
docker-compose -f docker-compose.local.yml up -d

# Watch logs
docker-compose -f docker-compose.local.yml logs -f backend

# Stop services
docker-compose -f docker-compose.local.yml down
```

### Testing Changes

Before deploying ANY change:

```bash
# 1. Build with your changes
docker-compose -f docker-compose.local.yml build backend

# 2. Restart the service
docker-compose -f docker-compose.local.yml up -d backend

# 3. Test the specific feature
curl http://localhost:8000/api/documents  # or whatever endpoint

# 4. Run automated tests
cd backend && pytest tests/

# 5. If ALL tests pass, proceed to deploy
```

---

## Production Deployment

### Pre-deployment Checklist

**Run the automated checklist:**
```bash
./scripts/pre-deploy-checklist.sh
```

This will verify:
- [ ] Changes tested locally with `docker-compose.local.yml`
- [ ] All tests passing (`pytest tests/`)
- [ ] Changes committed to git (`git commit`)
- [ ] Security audit passed (automatic on commit)
- [ ] Backup created (if touching Keycloak/database)
- [ ] Environment variables updated (if new ones added)
- [ ] Rollback plan documented

### Deploy to Production

**After checklist passes:**

```bash
# Deploy
./deploy-prod.sh

# Verify deployment
curl https://workshelf.dev/health
curl https://api.workshelf.dev/health
```

### What deploy-prod.sh Does

1. SSH to production server
2. `git pull origin main` - Get latest code
3. `docker-compose build` - Build new images
4. `docker-compose up -d` - Deploy containers
5. Shows service status

**This ensures:**
- ✅ All containers use the same docker-compose configuration
- ✅ Environment variables from `.env.prod` are applied
- ✅ Services restart together in correct order
- ✅ No manual container recreation needed

---

## Rollback Procedure

If deployment breaks production:

```bash
# 1. SSH to production
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138

# 2. Revert to previous commit
cd /home/ubuntu/workshelf
git log --oneline -5  # Find last working commit
git reset --hard <commit-sha>

# 3. Redeploy old version
docker-compose -f docker-compose.prod.yml --env-file .env.prod build
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Verify
curl http://localhost:8000/health
```

---

## Backup & Recovery

### Backup Keycloak Schema

```bash
# Before any Keycloak changes
./scripts/backup-keycloak.sh

# Backups saved to: ./backups/keycloak/keycloak_YYYYMMDD_HHMMSS.sql
```

### Restore Keycloak

```bash
# 1. Copy backup to production
scp -i ~/.ssh/workshelf-key.pem \
    backups/keycloak/keycloak_20251210_140530.sql \
    ubuntu@34.239.176.138:/tmp/

# 2. SSH to production
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138

# 3. Restore
cd /home/ubuntu/workshelf
source <(grep DATABASE_URL .env.prod | head -1 | sed 's/^/export /')
export PGPASSWORD=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

psql "$DATABASE_URL" -f /tmp/keycloak_20251210_140530.sql
```

---

## Troubleshooting

### "But I just need to restart one container!"

**NO.** Use docker-compose:

```bash
# Restart single service
cd /home/ubuntu/workshelf
docker-compose -f docker-compose.prod.yml --env-file .env.prod restart backend

# Rebuild and restart single service
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build backend
```

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check if ports are already in use
sudo ss -tlnp | grep ':8000'

# Remove orphaned containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database connection errors after deployment

Check if credentials in `.env.prod` match the database:

```bash
# Test connection
docker exec workshelf-backend python -c "
from sqlalchemy import create_engine
import os
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    print('✅ Connected')
"
```

---

## Why This Workflow?

### ❌ Old Way (Manual Deployment)
```bash
# Build image
docker build -t workshelf-backend backend/

# Manually recreate container with 20+ environment variables
docker stop workshelf-backend
docker rm workshelf-backend
docker run -d --name workshelf-backend \
  -e DATABASE_URL=... \
  -e SECRET_KEY=... \
  -e KEYCLOAK_URL=... \
  # ... 15 more variables ...
  workshelf-backend
```

**Problems:**
- Easy to forget environment variables
- No service dependencies
- Containers can get out of sync
- Changing one thing breaks another (cascading failures)

### ✅ New Way (docker-compose)
```bash
# Everything in one command
./deploy-prod.sh
```

**Benefits:**
- ✅ All config in docker-compose.prod.yml
- ✅ All secrets in .env.prod (not in command history)
- ✅ Services start in correct order with dependencies
- ✅ Consistent environment every time
- ✅ Easy rollback (git reset + redeploy)
- ✅ Test locally with same config (docker-compose.local.yml)

---

## Best Practices

1. **Always test locally first** - Use `docker-compose.local.yml`
2. **Always backup before Keycloak changes** - Use `scripts/backup-keycloak.sh`
## Quick Reference

```bash
# Local testing
./scripts/test-local.sh

# Pre-deployment checklist (ALWAYS RUN BEFORE DEPLOY)
./scripts/pre-deploy-checklist.sh

# Deploy to production
./deploy-prod.sh

# Backup Keycloak
./scripts/backup-keycloak.sh
# Local testing
./scripts/test-local.sh

# Deploy to production
./deploy-prod.sh

# Backup Keycloak
./scripts/backup-keycloak.sh

# View production logs
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138 \
  "cd /home/ubuntu/workshelf && docker-compose -f docker-compose.prod.yml logs -f backend"

# Restart production service
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138 \
  "cd /home/ubuntu/workshelf && docker-compose -f docker-compose.prod.yml restart backend"
```
