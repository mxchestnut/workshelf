#!/bin/bash
# Quick rollback script for WorkShelf deployments
# Rolls back to the previous Docker image tag

set -e

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 WorkShelf Rollback Script${NC}\n"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found. Install it first.${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}📝 Not logged in to Azure. Logging in...${NC}"
    az login
fi

# Configuration
RESOURCE_GROUP="workshelf-prod-rg"
BACKEND_APP="workshelf-backend"
FRONTEND_APP="workshelf-frontend"

# Function to get current and previous images
get_images() {
    local app_name=$1
    echo -e "${YELLOW}📋 Fetching revision history for $app_name...${NC}"
    
    az containerapp revision list \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[].{name:name,image:properties.template.containers[0].image,created:properties.createdTime,active:properties.active}" \
        --output table
}

# Function to rollback an app
rollback_app() {
    local app_name=$1
    
    echo -e "\n${YELLOW}🔄 Rolling back $app_name...${NC}"
    
    # Get the previous revision (second most recent)
    previous_revision=$(az containerapp revision list \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[1].name" \
        --output tsv)
    
    if [ -z "$previous_revision" ]; then
        echo -e "${RED}❌ No previous revision found for $app_name${NC}"
        return 1
    fi
    
    echo -e "Rolling back to revision: $previous_revision"
    
    # Activate the previous revision
    az containerapp revision activate \
        --name "$app_name" \
        --resource-group "$RESOURCE_GROUP" \
        --revision "$previous_revision"
    
    echo -e "${GREEN}✅ Rolled back $app_name to $previous_revision${NC}"
}

# Main menu
echo -e "What would you like to rollback?\n"
echo "1) Backend only"
echo "2) Frontend only"
echo "3) Both backend and frontend"
echo "4) Show current revisions and exit"
echo -e "\n"
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        get_images "$BACKEND_APP"
        echo ""
        read -p "Confirm rollback of backend? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            rollback_app "$BACKEND_APP"
        else
            echo "Rollback cancelled."
        fi
        ;;
    2)
        get_images "$FRONTEND_APP"
        echo ""
        read -p "Confirm rollback of frontend? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            rollback_app "$FRONTEND_APP"
        else
            echo "Rollback cancelled."
        fi
        ;;
    3)
        get_images "$BACKEND_APP"
        echo ""
        get_images "$FRONTEND_APP"
        echo ""
        read -p "Confirm rollback of BOTH backend and frontend? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            rollback_app "$BACKEND_APP"
            rollback_app "$FRONTEND_APP"
        else
            echo "Rollback cancelled."
        fi
        ;;
    4)
        get_images "$BACKEND_APP"
        echo ""
        get_images "$FRONTEND_APP"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}✅ Done!${NC}"
echo -e "\n${YELLOW}🔍 Quick Tests:${NC}"
echo "curl https://api.workshelf.dev/health"
echo "curl https://workshelf.dev"
