# WorkShelf Operations Guide

## Quick Health Check

```bash
# Check all container apps status
az containerapp list \
  --resource-group workshelf-prod-rg \
  --query "[].{name:name,status:properties.runningStatus,health:properties.latestRevisionName}" \
  -o table

# Check specific app health
az containerapp revision show \
  --name <app-name> \
  --resource-group workshelf-prod-rg \
  --revision <revision-name> \
  --query "{health:properties.healthState,running:properties.runningState}"
```

## Common Issues & Fixes

### 1. Database Connection Errors

**Symptom:** Container logs show `password authentication failed` or `channel_binding` errors

**Fix:**
```bash
# The Neon database password is: npg_STVUfh8MQ4sx
# Connection string format (asyncpg compatible):
# postgresql+asyncpg://neondb_owner:npg_STVUfh8MQ4sx@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/keycloak_prod?sslmode=require

# Update backend database secret
gh secret set DATABASE_URL --body "postgresql+asyncpg://neondb_owner:npg_STVUfh8MQ4sx@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/keycloak_prod?sslmode=require"

# Update Azure secret
az containerapp secret set \
  --name workshelf-backend \
  --resource-group workshelf-prod-rg \
  --secrets database-url="postgresql+asyncpg://neondb_owner:npg_STVUfh8MQ4sx@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/keycloak_prod?sslmode=require"

# For Keycloak
az containerapp secret set \
  --name workshelf-keycloak \
  --resource-group workshelf-prod-rg \
  --secrets db-password="npg_STVUfh8MQ4sx"

# Force restart
az containerapp update \
  --name <app-name> \
  --resource-group workshelf-prod-rg \
  --set-env-vars "RESTART_TRIGGER=$(date +%s)"
```

**Important:** 
- Never use `channel_binding=require` with asyncpg
- Always use `postgresql+asyncpg://` prefix for backend
- Keycloak uses plain postgres driver (no +asyncpg)

### 2. Custom Domain Not Working

**Symptom:** API/frontend accessible via Azure URL but not custom domain

**Fix:**
```bash
# Check DNS
dig api.workshelf.dev +short  # Should show 172.168.64.36
dig auth.workshelf.dev +short # Should show 172.168.64.36

# Check if domain is bound
az containerapp hostname list \
  --name workshelf-backend \
  --resource-group workshelf-prod-rg

# Bind if missing
az containerapp hostname bind \
  --hostname api.workshelf.dev \
  --name workshelf-backend \
  --resource-group workshelf-prod-rg \
  --environment workshelf-env-prod \
  --validation-method HTTP
```

**DNS Records Required:**
```
asuid.api.workshelf.dev TXT "4F6B1F31281E8034DF7DFE64964E185B7730F699BA1CE3000AA72FEAF8607E3C"
asuid.auth.workshelf.dev TXT "4F6B1F31281E8034DF7DFE64964E185B7730F699BA1CE3000AA72FEAF8607E3C"
asuid.workshelf.dev TXT "4F6B1F31281E8034DF7DFE64964E185B7730F699BA1CE3000AA72FEAF8607E3C"
api.workshelf.dev A 172.168.64.36
```

### 3. Container Unhealthy for Extended Period

**Symptom:** Container shows "Unhealthy" state for hours/days

**Diagnosis:**
```bash
# Get logs
az containerapp logs show \
  --name <app-name> \
  --resource-group workshelf-prod-rg \
  --follow false \
  --tail 100

# Check revision history
az containerapp revision list \
  --name <app-name> \
  --resource-group workshelf-prod-rg \
  --query "[].{name:name,created:properties.createdTime,state:properties.runningState,health:properties.healthState}"
```

**Fix:**
1. Check logs for specific error (usually database connection)
2. Fix the underlying issue (see sections above)
3. Force new revision with restart trigger
4. Monitor logs until "Application startup complete" or "Keycloak started"

### 4. Keycloak Data Loss

**Symptom:** Users need to re-onboard, groups missing

**Root Cause:** Keycloak restarted with database connection issues, created fresh schema

**Prevention:**
- Ensure Keycloak database password is always correct in secrets
- Monitor Keycloak health status (should never stay "Unhealthy")
- The deployment workflow now auto-updates Keycloak secrets on every deploy

**Recovery:** Unfortunately, Keycloak data cannot be recovered if the database schema was reset. Users must re-onboard.

## Monitoring Commands

```bash
# Watch all apps
watch -n 30 'az containerapp list \
  --resource-group workshelf-prod-rg \
  --query "[].{name:name,status:properties.runningStatus}" \
  -o table'

# Test endpoints
curl https://workshelf.dev  # Frontend
curl https://api.workshelf.dev/health  # Backend
curl https://auth.workshelf.dev  # Keycloak (might timeout, that's ok)

# Get latest logs
az containerapp logs show \
  --name workshelf-backend \
  --resource-group workshelf-prod-rg \
  --tail 20 | jq -r '.Log'
```

## Critical Secrets

Stored in GitHub Secrets and Azure Container App secrets:

- `DATABASE_URL` - Neon PostgreSQL connection (backend)
- `NEON_DB_PASSWORD` - Database password (Keycloak)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - SES email
- `STRIPE_SECRET_KEY` - Payment processing
- `ANTHROPIC_API_KEY` - AI features

## Deployment Workflow

The GitHub Actions workflow (`deploy.yml`) automatically:
1. Builds Docker images for backend and frontend
2. Pushes to Azure Container Registry
3. Updates backend container app
4. Updates Azure secrets (backend AWS keys, Keycloak DB password)
5. Binds custom domains (api.workshelf.dev, auth.workshelf.dev)
6. Updates frontend container app

**Manual intervention only needed if:**
- First-time DNS setup
- Changing database connection strings
- Major infrastructure changes

## Emergency Contacts

- Azure Subscription: kitchestnut@hotmail.com
- Neon Database: workshelf-prod database, keycloak_prod schema
- Domain Registrar: Route 53 (workshelf.dev)
- GitHub Repo: mxchestnut/workshelf
