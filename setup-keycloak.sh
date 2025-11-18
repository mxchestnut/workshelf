#!/bin/bash
set -e

echo "🔐 Configuring Keycloak for WorkShelf"
echo "===================================="

# Wait for Keycloak to be fully ready
echo "⏳ Waiting for Keycloak..."
sleep 5

# Get admin token
echo "📝 Getting admin access token..."
TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=warpxth" \
  -d "password=PXGSmFqwT3w68hA" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Got admin token"

# Create WorkShelf realm
echo "🏢 Creating WorkShelf realm..."
curl -s -X POST http://localhost:8080/admin/realms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "workshelf",
    "enabled": true,
    "displayName": "WorkShelf",
    "registrationAllowed": true,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false,
    "bruteForceProtected": true
  }' && echo "✅ WorkShelf realm created" || echo "⚠️  Realm might already exist"

# Create Synapse OIDC client
echo "🔗 Creating Synapse OIDC client..."
CLIENT_ID=$(curl -s -X POST http://localhost:8080/admin/realms/workshelf/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "synapse",
    "name": "Matrix Synapse",
    "description": "WorkShelf Chat Server",
    "enabled": true,
    "publicClient": false,
    "protocol": "openid-connect",
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": false,
    "authorizationServicesEnabled": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "redirectUris": [
      "http://localhost:8008/_synapse/client/oidc/callback",
      "https://chat.workshelf.dev/_synapse/client/oidc/callback"
    ],
    "webOrigins": [
      "http://localhost:8008",
      "http://localhost:8009",
      "https://chat.workshelf.dev"
    ],
    "attributes": {
      "access.token.lifespan": "300",
      "pkce.code.challenge.method": "S256"
    }
  }' \
  -w "%{http_code}" \
  -o /tmp/client_response.json)

if [ "$CLIENT_ID" == "201" ] || [ "$CLIENT_ID" == "409" ]; then
  echo "✅ Synapse client created/exists"
else
  echo "⚠️  Client creation returned: $CLIENT_ID"
fi

# Get client secret
echo "🔑 Retrieving client secret..."
CLIENTS=$(curl -s -X GET "http://localhost:8080/admin/realms/workshelf/clients?clientId=synapse" \
  -H "Authorization: Bearer $TOKEN")

CLIENT_UUID=$(echo $CLIENTS | jq -r '.[0].id')

if [ "$CLIENT_UUID" != "null" ] && [ ! -z "$CLIENT_UUID" ]; then
  SECRET=$(curl -s -X GET "http://localhost:8080/admin/realms/workshelf/clients/$CLIENT_UUID/client-secret" \
    -H "Authorization: Bearer $TOKEN" \
    | jq -r '.value')
  
  echo ""
  echo "✅ Configuration Complete!"
  echo "=========================="
  echo ""
  echo "📋 Keycloak Details:"
  echo "  - Realm: workshelf"
  echo "  - URL: http://localhost:8080/realms/workshelf"
  echo "  - Admin Console: http://localhost:8080/admin"
  echo ""
  echo "🔐 Synapse OIDC Client:"
  echo "  - Client ID: synapse"
  echo "  - Client Secret: $SECRET"
  echo ""
  echo "📝 Update synapse-homeserver.yaml with this secret!"
  echo "   client_secret: \"$SECRET\""
  echo ""
else
  echo "⚠️  Could not retrieve client secret. Please check Keycloak admin console."
fi
