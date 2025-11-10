# Deployment Scripts

Helper scripts for managing WorkShelf deployments on Azure Container Apps.

## Scripts

### `rollback.sh`
Quickly rollback to a previous deployment if something goes wrong.

```bash
./rollback.sh
```

Interactive menu lets you:
- Rollback backend only
- Rollback frontend only  
- Rollback both
- View current revisions

### `update-secrets.sh`
Update secrets in Azure Container Apps without redeploying.

```bash
./update-secrets.sh
```

Supports updating:
- Database URL
- API keys (Anthropic, Stripe, GPTZero, Copyscape)
- App secret key
- Custom secrets

### `logs.sh`
View logs from production containers.

```bash
# View last 50 lines from backend
./logs.sh backend

# View last 100 lines from frontend
./logs.sh frontend 100
```

## Setup

Make scripts executable:
```bash
chmod +x scripts/deploy/*.sh
```

## Azure CLI Required

All scripts require Azure CLI:
```bash
# macOS
brew install azure-cli

# Login
az login
```

## Quick Reference

```bash
# Check deployment status
az containerapp show -n workshelf-backend -g workshelf-prod-rg --query "properties.runningStatus"

# List all revisions
az containerapp revision list -n workshelf-backend -g workshelf-prod-rg -o table

# Restart app
az containerapp revision restart -n workshelf-backend -g workshelf-prod-rg

# View current image
az containerapp show -n workshelf-backend -g workshelf-prod-rg --query "properties.template.containers[0].image"
```
