# Build & Deployment Consolidation Improvements

## Completed ✅

### 1. Alembic Migrations
- ✅ Consolidated 35 broken migrations into single `001_consolidated` baseline
- ✅ Clean migration chain for future updates
- ✅ Migrations run automatically on deployment

## Recommended Improvements

### 2. Environment Variables Management (HIGH PRIORITY)

**Problem:** Environment variables are defined in multiple places:
- GitHub Actions deploy.yml (2 locations: update + create)
- docker-compose.yml
- backend/app/core/config.py
- Manual Azure CLI commands

**Solution:** Single source of truth with `.env.example` (created)

**Action Items:**
```bash
# 1. Update GitHub Actions to use reusable workflow
# 2. Create .env from .env.example for local dev
cp .env.example .env
# 3. Edit .env with your actual keys
```

### 3. GitHub Actions Simplification (MEDIUM PRIORITY)

**Current Issues:**
- Environment variables duplicated between `update` and `create` commands
- 166 lines for a simple build+deploy workflow
- Hard to add new environment variables (must update 2+ places)

**Recommended Changes:**

**Option A: Use YAML anchors** (cleaner but still in one file)
```yaml
x-backend-env: &backend-env
  DATABASE_URL: secretref:database-url
  ANTHROPIC_API_KEY: secretref:anthropic-api-key
  # ... rest of env vars

- name: Deploy backend
  run: |
    az containerapp update ... \
      --set-env-vars <<: *backend-env
```

**Option B: Composite Actions** (best for reusability)
Create `.github/actions/deploy-backend/action.yml`:
```yaml
name: Deploy Backend
inputs:
  image:
    required: true
runs:
  steps:
    - run: az containerapp update ...
```

**Recommendation:** Start with Option A (5 min fix), move to Option B if you deploy multiple apps.

### 4. Dependency Management (LOW PRIORITY)

**Current:** Manual version management in `requirements.txt`

**Options:**
- Keep current approach (simple, works well)
- Add `requirements-dev.txt` for testing dependencies
- Use `poetry` or `pipenv` (overkill for this project)

**Recommendation:** Add `requirements-dev.txt`:
```txt
# Development Dependencies
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
black==23.12.1
ruff==0.1.8
mypy==1.7.1
```

### 5. Makefile Enhancement (QUICK WIN)

**Add these targets to Makefile:**
```makefile
.PHONY: env setup-dev migrate-create migrate-up

env: ## Copy .env.example to .env
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env from .env.example"; \
		echo "⚠️  Edit .env with your actual credentials"; \
	else \
		echo "⚠️  .env already exists"; \
	fi

setup-dev: env ## Setup complete dev environment
	@echo "🚀 Setting up development environment..."
	cd backend && pip install -r requirements.txt
	cd frontend && npm install
	make up
	@echo "✅ Development environment ready!"

migrate-create: ## Create new migration: make migrate-create MSG="description"
	@if [ -z "$(MSG)" ]; then \
		echo "❌ Usage: make migrate-create MSG='description'"; \
		exit 1; \
	fi
	cd backend && alembic revision -m "$(MSG)"
	@echo "✅ Created migration: $(MSG)"

migrate-up: ## Run pending migrations locally
	cd backend && alembic upgrade head
	@echo "✅ Migrations applied"

migrate-status: ## Show current migration status
	cd backend && alembic current
```

### 6. Secrets Management (SECURITY)

**Current:** GitHub Secrets (good!)

**Enhancement:** Use Azure Key Vault references
```bash
# Instead of storing secrets in GitHub Actions
# Reference them from Azure Key Vault
az containerapp update \
  --name workshelf-backend \
  --set-env-vars \
    "DATABASE_URL=secretref:database-url,keyvault=workshelf-vault" \
    "STRIPE_SECRET_KEY=secretref:stripe-key,keyvault=workshelf-vault"
```

**Benefits:**
- Single source of truth for secrets
- Automatic rotation support
- Better audit logs
- No need to update GitHub Secrets when rotating

**Setup:**
```bash
# 1. Create Key Vault
az keyvault create \
  --name workshelf-vault \
  --resource-group workshelf-prod-rg \
  --location centralus

# 2. Add secrets
az keyvault secret set \
  --vault-name workshelf-vault \
  --name database-url \
  --value "postgresql://..."

# 3. Grant Container App access
az containerapp identity assign \
  --name workshelf-backend \
  --resource-group workshelf-prod-rg \
  --system-assigned
```

### 7. Deployment Scripts Directory

**Create:** `scripts/deploy/` directory
```
scripts/
  deploy/
    deploy-backend.sh     # Backend deployment logic
    deploy-frontend.sh    # Frontend deployment logic
    update-secrets.sh     # Batch update secrets
    rollback.sh           # Quick rollback script
```

### 8. Health Check Improvements

**Add:** Dedicated health check endpoints
```python
# backend/app/api/health.py
@router.get("/health/live")
async def liveness():
    """Kubernetes/Container Apps liveness probe"""
    return {"status": "alive"}

@router.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Kubernetes/Container Apps readiness probe"""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        raise HTTPException(503, f"Not ready: {e}")
```

## Priority Summary

### Do Now (30 minutes):
1. ✅ Created `.env.example` - Copy and configure
2. 🔄 Add Makefile targets (copy from section 5)
3. 🔄 Create `requirements-dev.txt`

### Do This Week (2-3 hours):
1. Simplify GitHub Actions with YAML anchors
2. Set up Azure Key Vault for secrets
3. Add health check endpoints

### Do Eventually (nice to have):
1. Create deployment scripts directory
2. Add monitoring/alerting setup
3. Implement blue/green deployments

## Quick Start After These Changes

```bash
# First time setup
make setup-dev

# Daily development
make up              # Start all services
make logs-backend    # Watch backend logs
make migrate-create MSG="add new feature"
make migrate-up      # Apply migrations

# Deployment (automated via GitHub Actions)
git push origin main  # Triggers deploy.yml
```

## Files Created
- ✅ `.env.example` - Environment variables template
- ✅ `.github/deploy-config.sh` - Deployment configuration (optional)
- 📝 This improvement guide

## Next Steps
1. Review this document
2. Decide which improvements to implement
3. Create issues/tasks for tracking
4. Implement in priority order
