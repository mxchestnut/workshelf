#!/bin/bash
set -e

KEYCLOAK_URL="https://auth.workshelf.dev"
ADMIN_PASSWORD="e00NiIf26fJzdkdBt1kw"
REALM_NAME="workshelf"
CLIENT_ID="workshelf-frontend"

echo "🔧 Updating Keycloak client configuration..."

# Get admin token
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Got admin token"

# Get client UUID
CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r ".[] | select(.clientId==\"${CLIENT_ID}\") | .id")

if [ -z "$CLIENT_UUID" ]; then
  echo "❌ Client not found"
  exit 1
fi

echo "✅ Found client: ${CLIENT_UUID}"

# Update client with proper configuration
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "workshelf-frontend",
    "enabled": true,
    "publicClient": true,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": true,
    "protocol": "openid-connect",
    "rootUrl": "https://workshelf.dev",
    "baseUrl": "https://workshelf.dev",
    "redirectUris": [
      "https://workshelf.dev/*",
      "https://workshelf.dev/auth/callback",
      "http://localhost:5173/*",
      "http://localhost:5173/auth/callback"
    ],
    "webOrigins": [
      "https://workshelf.dev",
      "http://localhost:5173",
      "+"
    ],
    "attributes": {
      "pkce.code.challenge.method": "S256",
      "post.logout.redirect.uris": "+"
    }
  }'

echo ""
echo "✅ Client configuration updated"

# Verify configuration
echo ""
echo "📋 Current configuration:"
curl -s "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients/${CLIENT_UUID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '{
    clientId,
    publicClient,
    redirectUris,
    webOrigins
  }'

echo ""
echo "🎉 Done! Try logging in again."
