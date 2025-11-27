#!/bin/bash
# Automated Keycloak setup for local development

set -e

KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin"
REALM="workshelf"

echo "🔐 Setting up Keycloak for local development..."

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to start..."
until curl -s "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; do
  echo "   Still waiting..."
  sleep 3
done
echo "✅ Keycloak is ready!"

# Get admin token
echo "🔑 Getting admin token..."
TOKEN=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token. Check Keycloak admin credentials."
  exit 1
fi
echo "✅ Got admin token"

# Create realm
echo "📦 Creating '$REALM' realm..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"realm\": \"$REALM\",
    \"enabled\": true,
    \"displayName\": \"WorkShelf\",
    \"registrationAllowed\": true,
    \"loginWithEmailAllowed\": true,
    \"duplicateEmailsAllowed\": false,
    \"rememberMe\": true,
    \"verifyEmail\": false,
    \"loginTheme\": \"keycloak\",
    \"emailTheme\": \"keycloak\"
  }" || echo "⚠️  Realm might already exist"

echo "✅ Realm created/verified"

# Create backend client (confidential)
echo "🔧 Creating backend client..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "workshelf-api",
    "name": "WorkShelf API",
    "enabled": true,
    "publicClient": false,
    "standardFlowEnabled": true,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": true,
    "redirectUris": ["*"],
    "webOrigins": ["*"]
  }' || echo "⚠️  Backend client might already exist"

# Get backend client and set secret
echo "🔑 Setting backend client secret..."
BACKEND_CLIENT_ID=$(curl -s "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.clientId=="workshelf-api") | .id')

if [ -n "$BACKEND_CLIENT_ID" ]; then
  BACKEND_SECRET=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients/$BACKEND_CLIENT_ID/client-secret" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.value')
  echo "✅ Backend client secret: $BACKEND_SECRET"
  
  # Update .env file
  if [ -f .env ]; then
    sed -i.bak "s/KEYCLOAK_CLIENT_SECRET=.*/KEYCLOAK_CLIENT_SECRET=$BACKEND_SECRET/" .env
    echo "✅ Updated .env with backend client secret"
  fi
fi

# Create frontend client (public)
echo "🌐 Creating frontend client..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "workshelf-frontend",
    "name": "WorkShelf Frontend",
    "enabled": true,
    "publicClient": true,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": true,
    "redirectUris": [
      "http://localhost:5173/*",
      "http://localhost:5173/auth/callback"
    ],
    "webOrigins": ["+"],
    "attributes": {
      "pkce.code.challenge.method": "S256"
    }
  }' || echo "⚠️  Frontend client might already exist"

echo "✅ Frontend client created/verified"

# Create test user
echo "👤 Creating test user..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@workshelf.local",
    "emailVerified": true,
    "enabled": true,
    "firstName": "Test",
    "lastName": "User",
    "credentials": [{
      "type": "password",
      "value": "test123",
      "temporary": false
    }]
  }' || echo "⚠️  Test user might already exist"

echo "✅ Test user created/verified"

echo ""
echo "✨ Keycloak setup complete!"
echo ""
echo "📋 Summary:"
echo "   Keycloak URL: $KEYCLOAK_URL"
echo "   Admin Console: $KEYCLOAK_URL/admin"
echo "   Admin User: $ADMIN_USER"
echo "   Admin Pass: $ADMIN_PASS"
echo ""
echo "   Realm: $REALM"
echo "   Test User: testuser"
echo "   Test Pass: test123"
echo ""
echo "🚀 You can now login at http://localhost:5173"
