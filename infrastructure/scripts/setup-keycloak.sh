#!/bin/bash
set -e

# Keycloak configuration script for WorkShelf
KEYCLOAK_URL="https://auth.workshelf.dev"
ADMIN_USER="admin"
ADMIN_PASSWORD="e00NiIf26fJzdkdBt1kw"
REALM_NAME="workshelf"
CLIENT_ID="workshelf-frontend"
FRONTEND_URL="https://workshelf.dev"

echo "🔑 Configuring Keycloak at ${KEYCLOAK_URL}"

# Get admin access token
echo "📝 Getting admin access token..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

echo "✅ Got admin token"

# Create realm
echo "🌍 Creating realm: ${REALM_NAME}"
curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"realm\": \"${REALM_NAME}\",
    \"enabled\": true,
    \"displayName\": \"WorkShelf\",
    \"registrationAllowed\": true,
    \"registrationEmailAsUsername\": true,
    \"rememberMe\": true,
    \"verifyEmail\": false,
    \"loginWithEmailAllowed\": true,
    \"duplicateEmailsAllowed\": false,
    \"resetPasswordAllowed\": true,
    \"editUsernameAllowed\": false
  }"

echo "✅ Realm created"

# Create client
echo "🔐 Creating client: ${CLIENT_ID}"
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM_NAME}/clients" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"${CLIENT_ID}\",
    \"name\": \"WorkShelf Frontend\",
    \"description\": \"Public client for WorkShelf frontend application\",
    \"enabled\": true,
    \"publicClient\": true,
    \"standardFlowEnabled\": true,
    \"implicitFlowEnabled\": false,
    \"directAccessGrantsEnabled\": true,
    \"serviceAccountsEnabled\": false,
    \"protocol\": \"openid-connect\",
    \"rootUrl\": \"${FRONTEND_URL}\",
    \"baseUrl\": \"${FRONTEND_URL}\",
    \"redirectUris\": [
      \"${FRONTEND_URL}/*\",
      \"http://localhost:5173/*\"
    ],
    \"webOrigins\": [
      \"${FRONTEND_URL}\",
      \"http://localhost:5173\"
    ],
    \"attributes\": {
      \"pkce.code.challenge.method\": \"S256\"
    }
  }"

echo "✅ Client created"

# Test the configuration
echo "🧪 Testing realm configuration..."
REALM_INFO=$(curl -s "${KEYCLOAK_URL}/realms/${REALM_NAME}/.well-known/openid-configuration" | jq -r '.issuer')

if [ "$REALM_INFO" == "null" ] || [ -z "$REALM_INFO" ]; then
  echo "❌ Realm configuration test failed"
  exit 1
fi

echo "✅ Realm is accessible at: ${REALM_INFO}"

echo ""
echo "==========================================="
echo "🎉 Keycloak Configuration Complete!"
echo "==========================================="
echo ""
echo "Realm: ${REALM_NAME}"
echo "Client ID: ${CLIENT_ID}"
echo "Login URL: ${KEYCLOAK_URL}/realms/${REALM_NAME}/account"
echo "Admin Console: ${KEYCLOAK_URL}/admin"
echo ""
echo "Admin Credentials:"
echo "  Username: ${ADMIN_USER}"
echo "  Password: ${ADMIN_PASSWORD}"
echo ""
echo "==========================================="
