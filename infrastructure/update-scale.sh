#!/bin/bash
# Update Container App Scale Settings
# This ensures your frontend app always has at least 1 replica running

set -e

# Configuration
RESOURCE_GROUP="workshelf-rg"
FRONTEND_APP_NAME="workshelf-frontend-dev"  # Update if different
MIN_REPLICAS=1
MAX_REPLICAS=5

echo "🔧 Updating scale settings for $FRONTEND_APP_NAME..."

# Check if logged in to Azure
if ! az account show &>/dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

# Update scale configuration
az containerapp update \
    --name "$FRONTEND_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --min-replicas $MIN_REPLICAS \
    --max-replicas $MAX_REPLICAS

echo "✅ Scale settings updated!"
echo "   Min replicas: $MIN_REPLICAS"
echo "   Max replicas: $MAX_REPLICAS"
echo ""
echo "Your frontend app will now always have at least 1 instance running."
