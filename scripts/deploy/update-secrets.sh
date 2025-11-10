#!/bin/bash
# Update secrets in Azure Container Apps
# Usage: ./update-secrets.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔐 WorkShelf Secrets Update Script${NC}\n"

# Configuration
RESOURCE_GROUP="workshelf-prod-rg"
APP_NAME="workshelf-backend"

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}📝 Logging in to Azure...${NC}"
    az login
fi

echo -e "${GREEN}Current secrets in $APP_NAME:${NC}"
az containerapp show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.secrets[].name" \
    --output table

echo -e "\n${YELLOW}Which secret would you like to update?${NC}"
echo "1) database-url"
echo "2) anthropic-api-key"
echo "3) stripe-secret-key"
echo "4) stripe-publishable-key"
echo "5) stripe-webhook-secret"
echo "6) gptzero-api-key"
echo "7) copyscape-api-key"
echo "8) secret-key (app secret key)"
echo "9) Add a new secret"
echo "0) Exit"
echo ""
read -p "Enter your choice (0-9): " choice

update_secret() {
    local secret_name=$1
    local secret_display=$2
    
    echo -e "\n${YELLOW}Updating: $secret_display${NC}"
    read -sp "Enter new value (input hidden): " secret_value
    echo ""
    
    if [ -z "$secret_value" ]; then
        echo -e "${RED}❌ Empty value. Cancelled.${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}⏳ Updating secret...${NC}"
    
    az containerapp secret set \
        --name "$APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --secrets "$secret_name=$secret_value"
    
    echo -e "${GREEN}✅ Updated $secret_display${NC}"
    echo -e "${YELLOW}⚠️  Note: Restart required for changes to take effect${NC}"
    
    read -p "Restart app now? (yes/no): " restart
    if [ "$restart" = "yes" ]; then
        echo -e "${YELLOW}🔄 Restarting $APP_NAME...${NC}"
        az containerapp revision restart \
            --name "$APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --revision "$(az containerapp revision list --name "$APP_NAME" --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)"
        echo -e "${GREEN}✅ App restarted${NC}"
    fi
}

case $choice in
    1) update_secret "database-url" "Database URL" ;;
    2) update_secret "anthropic-api-key" "Anthropic API Key" ;;
    3) update_secret "stripe-secret-key" "Stripe Secret Key" ;;
    4) update_secret "stripe-publishable-key" "Stripe Publishable Key" ;;
    5) update_secret "stripe-webhook-secret" "Stripe Webhook Secret" ;;
    6) update_secret "gptzero-api-key" "GPTZero API Key" ;;
    7) update_secret "copyscape-api-key" "Copyscape API Key" ;;
    8) update_secret "secret-key" "App Secret Key" ;;
    9) 
        read -p "Enter secret name: " new_secret_name
        read -p "Enter display name: " new_secret_display
        update_secret "$new_secret_name" "$new_secret_display"
        ;;
    0) 
        echo "Exited."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Done!${NC}"
