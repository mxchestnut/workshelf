#!/bin/bash
# View logs from Azure Container Apps
# Usage: ./logs.sh [backend|frontend] [lines]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
RESOURCE_GROUP="workshelf-prod-rg"
BACKEND_APP="workshelf-backend"
FRONTEND_APP="workshelf-frontend"

# Parse arguments
APP_NAME="${1:-backend}"
LINES="${2:-50}"

if [ "$APP_NAME" = "backend" ]; then
    APP="$BACKEND_APP"
elif [ "$APP_NAME" = "frontend" ]; then
    APP="$FRONTEND_APP"
else
    echo "Usage: $0 [backend|frontend] [lines]"
    echo "Example: $0 backend 100"
    exit 1
fi

echo -e "${YELLOW}📋 Fetching last $LINES lines from $APP...${NC}\n"

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}📝 Logging in to Azure...${NC}"
    az login
fi

# Fetch logs
az containerapp logs show \
    --name "$APP" \
    --resource-group "$RESOURCE_GROUP" \
    --tail "$LINES" \
    --follow false \
    2>&1 | grep '"Log"' | sed 's/.*"Log": "\(.*\)".*/\1/' | sed 's/\\n/\n/g'

echo -e "\n${GREEN}✅ Done${NC}"
echo -e "${YELLOW}💡 Tip: Use './logs.sh backend 100' for more lines${NC}"
echo -e "${YELLOW}💡 Tip: Add '--follow true' in the script for live tail${NC}"
