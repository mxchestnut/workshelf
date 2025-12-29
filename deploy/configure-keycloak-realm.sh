#!/bin/bash
set -e

# Keycloak Realm Configuration Script
# Run this after initial Keycloak setup to create realm and clients

echo "=========================================="
echo "Keycloak Realm Configuration"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
KEYCLOAK_URL="https://keycloak.workshelf.dev"
REALM="workshelf"
FRONTEND_CLIENT="workshelf-frontend"
BACKEND_CLIENT="workshelf-api"

# Get admin credentials
echo -e "${YELLOW}Enter Keycloak admin username (default: admin):${NC}"
read -r ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

echo -e "${YELLOW}Enter Keycloak admin password:${NC}"
read -rs ADMIN_PASSWORD
echo ""

# Get access token
echo -e "${GREEN}Getting admin access token...${NC}"
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "Failed to get access token. Check your credentials."
    exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}"

# Create realm
echo ""
echo -e "${GREEN}Creating realm: $REALM${NC}"
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "'"$REALM"'",
    "enabled": true,
    "displayName": "WorkShelf",
    "registrationAllowed": true,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": true,
    "permanentLockout": false,
    "maxFailureWaitSeconds": 900,
    "minimumQuickLoginWaitSeconds": 60,
    "waitIncrementSeconds": 60,
    "quickLoginCheckMilliSeconds": 1000,
    "maxDeltaTimeSeconds": 43200,
    "failureFactor": 5,
    "accessTokenLifespan": 300,
    "accessTokenLifespanForImplicitFlow": 900,
    "ssoSessionIdleTimeout": 1800,
    "ssoSessionMaxLifespan": 36000,
    "offlineSessionIdleTimeout": 2592000,
    "accessCodeLifespan": 60,
    "accessCodeLifespanUserAction": 300,
    "accessCodeLifespanLogin": 1800,
    "actionTokenGeneratedByAdminLifespan": 43200,
    "actionTokenGeneratedByUserLifespan": 300
  }' || echo -e "${YELLOW}Realm may already exist${NC}"

echo -e "${GREEN}✓ Realm created${NC}"

# Create frontend client
echo ""
echo -e "${GREEN}Creating frontend client: $FRONTEND_CLIENT${NC}"
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'"$FRONTEND_CLIENT"'",
    "enabled": true,
    "publicClient": true,
    "directAccessGrantsEnabled": true,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "serviceAccountsEnabled": false,
    "protocol": "openid-connect",
    "redirectUris": [
      "https://workshelf.dev/*",
      "https://workshelf.dev/callback",
      "http://localhost:5173/*",
      "http://localhost:5173/callback"
    ],
    "webOrigins": [
      "https://workshelf.dev",
      "http://localhost:5173"
    ],
    "attributes": {
      "pkce.code.challenge.method": "S256"
    }
  }' || echo -e "${YELLOW}Client may already exist${NC}"

echo -e "${GREEN}✓ Frontend client created${NC}"

# Create backend client
echo ""
echo -e "${GREEN}Creating backend client: $BACKEND_CLIENT${NC}"
BACKEND_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'"$BACKEND_CLIENT"'",
    "enabled": true,
    "publicClient": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "protocol": "openid-connect",
    "attributes": {
      "access.token.lifespan": "300"
    }
  }')

echo -e "${GREEN}✓ Backend client created${NC}"

# Get backend client secret
echo ""
echo -e "${GREEN}Getting backend client secret...${NC}"
sleep 2

CLIENT_UUID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.clientId=="'"$BACKEND_CLIENT"'") | .id')

if [ -z "$CLIENT_UUID" ]; then
    echo -e "${YELLOW}Could not retrieve client UUID. Get the secret manually from Keycloak console.${NC}"
else
    CLIENT_SECRET=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID/client-secret" \
      -H "Authorization: Bearer $TOKEN" | jq -r '.value')
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Backend Client Secret:${NC}"
    echo "$CLIENT_SECRET"
    echo "=========================================="
    echo ""
    echo "Add this to your backend .env file:"
    echo "KEYCLOAK_CLIENT_SECRET=$CLIENT_SECRET"
    echo ""
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Realm Configuration Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  Realm: $REALM"
echo "  Frontend Client: $FRONTEND_CLIENT (public)"
echo "  Backend Client: $BACKEND_CLIENT (confidential)"
echo ""
echo "Next steps:"
echo "1. Update your .env files with the client secret"
echo "2. Create test users in Keycloak"
echo "3. Test login flow at https://workshelf.dev"
echo ""
