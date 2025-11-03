# Work Shelf - Azure Deployment Guide

## 🎯 Minimal Cost Deployment (~$12-17/month)

This guide helps you deploy Work Shelf to Azure with the lowest possible cost while maintaining production-readiness.

## Prerequisites

- Azure CLI installed (`az --version`)
- Azure subscription (logged in: `az login`)
- Docker installed (for building containers)

## Cost Breakdown

**Option 1: Full Azure (~$12-17/month)**
- PostgreSQL Flexible Server (B1ms): ~$12/month
- Container Apps (Consumption): ~$0-5/month (generous free tier)
- Storage Account (LRS): ~$1-2/month
- Container Registry (Basic): ~$5/month
- **Total: ~$18-24/month**

**Option 2: Hybrid (External DB) (~$5-10/month)**
- PostgreSQL on Neon.tech or Supabase: **FREE** (with limits)
- Container Apps: ~$0-5/month
- Storage Account: ~$1-2/month
- Container Registry: ~$5/month
- **Total: ~$6-12/month**

## Quick Start Deployment

### 1. Set Your Azure Subscription

```bash
# List subscriptions
az account list --output table

# Set active subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### 2. Deploy Infrastructure

```bash
cd infrastructure/bicep

# Option A: With Azure PostgreSQL (recommended for production)
az deployment sub create \
  --location centralus \
  --template-file main.bicep \
  --parameters environment=dev \
               resourceGroupName=workshelf-dev-rg \
               postgresAdminUser=workshelfadmin \
               postgresAdminPassword='YOUR_STRONG_PASSWORD_HERE' \
               useExternalDatabase=false

# Option B: With external database (Neon/Supabase - cheapest!)
az deployment sub create \
  --location centralus \
  --template-file main.bicep \
  --parameters environment=dev \
               resourceGroupName=workshelf-dev-rg \
               useExternalDatabase=true
```

### 3. Get Deployment Outputs

```bash
# Get connection strings and endpoints
az deployment sub show \
  --name workshelf-infrastructure \
  --query properties.outputs
```

### 4. Build and Push Docker Images

```bash
# Get registry credentials
REGISTRY_NAME=$(az deployment sub show --name workshelf-infrastructure --query properties.outputs.registryLoginServer.value -o tsv)
az acr login --name $REGISTRY_NAME

# Build and push backend
cd ../../backend
docker build -t $REGISTRY_NAME/workshelf-backend:latest .
docker push $REGISTRY_NAME/workshelf-backend:latest

# Build and push frontend
cd ../frontend
docker build -t $REGISTRY_NAME/workshelf-frontend:latest .
docker push $REGISTRY_NAME/workshelf-frontend:latest
```

### 5. Deploy Container Apps

```bash
# Deploy backend container app
az containerapp create \
  --name workshelf-backend \
  --resource-group workshelf-dev-rg \
  --environment workshelf-env-dev \
  --image $REGISTRY_NAME/workshelf-backend:latest \
  --target-port 8000 \
  --ingress external \
  --env-vars \
    DATABASE_URL="postgresql+asyncpg://user:pass@host/workshelf" \
    SECRET_KEY="your-secret-key" \
  --registry-server $REGISTRY_NAME \
  --cpu 0.25 --memory 0.5Gi \
  --min-replicas 0 --max-replicas 1

# Deploy frontend container app
az containerapp create \
  --name workshelf-frontend \
  --resource-group workshelf-dev-rg \
  --environment workshelf-env-dev \
  --image $REGISTRY_NAME/workshelf-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server $REGISTRY_NAME \
  --cpu 0.25 --memory 0.5Gi \
  --min-replicas 0 --max-replicas 1
```

### 6. Access Your Application

```bash
# Get frontend URL
az containerapp show \
  --name workshelf-frontend \
  --resource-group workshelf-dev-rg \
  --query properties.configuration.ingress.fqdn \
  -o tsv
```

## Using External Database (Neon/Supabase) - RECOMMENDED FOR COST

### Neon.tech Setup (FREE tier)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Use it in your Container App environment variables

### Supabase Setup (FREE tier)

1. Sign up at https://supabase.com
2. Create a new project
3. Get PostgreSQL connection string from Settings > Database
4. Use it in your Container App environment variables

## Cost Optimization Tips

1. **Scale to Zero**: Container Apps can scale to 0 replicas when idle (saves money!)
2. **Pause Database**: Azure PostgreSQL can be paused when not in use
3. **Use Consumption Tier**: Only pay for what you use
4. **External Database**: Use Neon/Supabase free tier for development
5. **Delete When Not Using**: Delete the resource group when testing is done

## Useful Commands

```bash
# View all resources
az resource list --resource-group workshelf-dev-rg --output table

# Check costs
az consumption usage list --output table

# Delete everything (CAREFUL!)
az group delete --name workshelf-dev-rg --yes --no-wait

# View container app logs
az containerapp logs show \
  --name workshelf-backend \
  --resource-group workshelf-dev-rg \
  --follow
```

## Next Steps

1. ✅ Infrastructure deployed
2. 🔲 Set up Keycloak for authentication
3. 🔲 Configure custom domain
4. 🔲 Set up CI/CD with GitHub Actions
5. 🔲 Configure Tailscale for admin access

## Troubleshooting

**Container won't start?**
```bash
az containerapp logs show --name workshelf-backend --resource-group workshelf-dev-rg --tail 50
```

**Database connection issues?**
- Check firewall rules in Azure Portal
- Verify connection string format
- Test connection locally first

**Need to update container?**
```bash
az containerapp update \
  --name workshelf-backend \
  --resource-group workshelf-dev-rg \
  --image $REGISTRY_NAME/workshelf-backend:latest
```

## Support

See main project README or open an issue for help!
