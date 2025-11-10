#!/bin/bash
# Setup Azure Key Vault for WorkShelf secrets management
# This script creates a Key Vault and migrates secrets from GitHub/Container Apps

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔐 Azure Key Vault Setup for WorkShelf${NC}\n"

# Configuration
RESOURCE_GROUP="workshelf-prod-rg"
LOCATION="centralus"
KEY_VAULT_NAME="workshelf-vault"
BACKEND_APP="workshelf-backend"

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}📝 Logging in to Azure...${NC}"
    az login
fi

echo -e "${GREEN}Step 1: Creating Key Vault${NC}"
az keyvault create \
    --name "$KEY_VAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-rbac-authorization false \
    --enabled-for-deployment true \
    --enabled-for-disk-encryption true \
    --enabled-for-template-deployment true

echo -e "\n${GREEN}Step 2: Adding secrets to Key Vault${NC}"
echo -e "${YELLOW}⚠️  You'll need to enter each secret value${NC}\n"

# Function to add secret
add_secret() {
    local secret_name=$1
    local secret_display=$2
    
    echo -e "${YELLOW}Enter $secret_display:${NC}"
    read -sp "(input hidden): " secret_value
    echo ""
    
    if [ -n "$secret_value" ]; then
        az keyvault secret set \
            --vault-name "$KEY_VAULT_NAME" \
            --name "$secret_name" \
            --value "$secret_value" > /dev/null
        echo -e "${GREEN}✅ Added $secret_display${NC}"
    else
        echo -e "${RED}⚠️  Skipped $secret_display (empty)${NC}"
    fi
}

# Add all secrets
add_secret "database-url" "Database URL"
add_secret "anthropic-api-key" "Anthropic API Key"
add_secret "stripe-secret-key" "Stripe Secret Key"
add_secret "stripe-publishable-key" "Stripe Publishable Key"
add_secret "stripe-webhook-secret" "Stripe Webhook Secret"
add_secret "gptzero-api-key" "GPTZero API Key"
add_secret "copyscape-api-key" "Copyscape API Key"
add_secret "secret-key" "App Secret Key"

echo -e "\n${GREEN}Step 3: Enable Managed Identity for Container App${NC}"
PRINCIPAL_ID=$(az containerapp identity assign \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --system-assigned \
    --query "principalId" \
    --output tsv)

echo "Managed Identity Principal ID: $PRINCIPAL_ID"

echo -e "\n${GREEN}Step 4: Grant Container App access to Key Vault${NC}"
az keyvault set-policy \
    --name "$KEY_VAULT_NAME" \
    --object-id "$PRINCIPAL_ID" \
    --secret-permissions get list

echo -e "\n${GREEN}Step 5: Update Container App to use Key Vault references${NC}"
echo -e "${YELLOW}⚠️  Manual step required!${NC}"
echo -e "Update your GitHub Actions workflow (.github/workflows/deploy.yml):"
echo ""
echo "Replace:"
echo "  --set-env-vars DATABASE_URL=secretref:database-url \\"
echo ""
echo "With:"
echo "  --set-env-vars DATABASE_URL=secretref:database-url,keyvaultref:https://$KEY_VAULT_NAME.vault.azure.net/secrets/database-url \\"
echo ""
echo -e "${YELLOW}Or use the Azure Portal:${NC}"
echo "1. Go to Container Apps → workshelf-backend → Secrets"
echo "2. Edit each secret to reference Key Vault:"
echo "   Type: Key Vault"
echo "   Key Vault Secret URL: https://$KEY_VAULT_NAME.vault.azure.net/secrets/[secret-name]"

echo -e "\n${GREEN}✅ Key Vault setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "• Key Vault: $KEY_VAULT_NAME"
echo "• Secrets added: 8"
echo "• Managed Identity: Enabled"
echo "• Access Policy: Configured"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update GitHub Actions workflow to reference Key Vault"
echo "2. Test deployment"
echo "3. Remove secrets from GitHub Secrets (keep as backup initially)"
echo ""
echo -e "${YELLOW}💡 Benefits:${NC}"
echo "• Centralized secret management"
echo "• Automatic rotation support"
echo "• Better audit logging"
echo "• No need to update GitHub Secrets"
