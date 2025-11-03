# GitHub Actions Setup Guide

This guide will help you set up GitHub Actions secrets for automated deployment to Azure.

## Required GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

### Azure Configuration

1. **AZURE_CREDENTIALS**
   ```bash
   # Create Azure service principal with contributor access
   az ad sp create-for-rbac \
     --name "github-actions-workshelf" \
     --role contributor \
     --scopes /subscriptions/e19c81a6-2a7c-4b15-8037-18feab6b8d53/resourceGroups/workshelf-prod-rg \
     --sdk-auth
   ```
   Copy the entire JSON output as the secret value.

2. **AZURE_RESOURCE_GROUP**
   ```
   workshelf-prod-rg
   ```

3. **AZURE_CONTAINER_ENV**
   ```
   workshelf-env-prod
   ```

### Azure Container Registry

4. **ACR_LOGIN_SERVER**
   - Value: Your ACR login server (e.g., `yourregistry.azurecr.io`)
   - Get it from: Azure Portal → Container Registry → Overview

5. **ACR_USERNAME**
   - Value: Your ACR username (usually same as registry name)
   - Get it from: Azure Portal → Container Registry → Access keys

6. **ACR_PASSWORD**
   - Value: Your ACR password
   - Get it from: Azure Portal → Container Registry → Access keys → password

### Database

7. **DATABASE_URL**
   - Value: Your database connection string
   - Format: `postgresql+asyncpg://username:password@host/database?sslmode=require`
   - For Neon: Get from Neon dashboard → Connection String

### API Keys

8. **ANTHROPIC_API_KEY**
   - Value: Your Anthropic API key (starts with `sk-ant-`)
   - Get it from: https://console.anthropic.com/

9. **STRIPE_SECRET_KEY**
   - Value: Your Stripe secret key (starts with `sk_live_` or `sk_test_`)
   - Get it from: https://dashboard.stripe.com/apikeys

10. **STRIPE_PUBLISHABLE_KEY**
    - Value: Your Stripe publishable key (starts with `pk_live_` or `pk_test_`)
    - Get it from: https://dashboard.stripe.com/apikeys

11. **STRIPE_WEBHOOK_SECRET**
    - Value: Your Stripe webhook signing secret (starts with `whsec_`)
    - Get it from: https://dashboard.stripe.com/webhooks

12. **GPTZERO_API_KEY**
    - Value: Your GPTZero API key
    - Get it from: https://gptzero.me/

13. **COPYSCAPE_API_KEY**
    - Value: Your Copyscape API key
    - Get it from: https://www.copyscape.com/

14. **COPYSCAPE_USERNAME**
    - Value: Your Copyscape username

15. **SECRET_KEY** (generate a new one for production)
    ```bash
    # Generate a secure random key
    python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

## How to Add Secrets

1. Go to https://github.com/mxchestnut/workshelf/settings/secrets/actions
2. Click "New repository secret"
3. Enter the name (exactly as shown above)
4. Paste the value
5. Click "Add secret"
6. Repeat for all 15 secrets

## Verify Setup

After adding all secrets:

1. Go to Actions tab
2. Click "Deploy to Azure" workflow
3. Click "Run workflow" → Run workflow
4. Watch the deployment progress
5. Check the summary for deployment URLs

## First Deployment

The first time you deploy, the Container Apps will be created automatically. Subsequent pushes to `main` will update the existing apps.

## Troubleshooting

### "AZURE_CREDENTIALS secret not found"
- Make sure you created the service principal and added the JSON output as a secret

### "ACR login failed"
- Verify ACR_LOGIN_SERVER, ACR_USERNAME, and ACR_PASSWORD are correct
- Check that the ACR password hasn't expired

### "Container App creation failed"
- Ensure all secrets are added correctly
- Check that the resource group and environment exist in Azure
- Verify the service principal has contributor access

### "Database connection failed"
- Verify DATABASE_URL is correct
- Check that Neon database is accessible from Azure
- Ensure SSL is properly configured

## Security Notes

- ✅ All secrets are encrypted by GitHub
- ✅ Secrets are never exposed in logs
- ✅ Only workflows can access secrets
- ⚠️ Rotate secrets regularly
- ⚠️ Use separate keys for production vs staging
- ⚠️ Monitor API usage and costs

## Next Steps

After setting up secrets:

1. Push this workflow to GitHub
2. Manually trigger the workflow to test
3. Fix any deployment issues
4. Enable automatic deployment on push to main
5. Set up branch protection rules
6. Add status checks

---

**Last Updated**: November 3, 2025
