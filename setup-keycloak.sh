#!/bin/bash
# Keycloak Setup Script for WorkShelf
# This script automates the Keycloak realm and client configuration

set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM_NAME="workshelf"

echo "🔐 Configuring Keycloak at $KEYCLOAK_URL"

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to start..."
for i in {1..30}; do
    if curl -sf "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; then
        echo "✅ Keycloak is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Keycloak did not start in time"
        exit 1
    fi
    sleep 2
done

# Get admin token
echo "🔑 Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$ADMIN_USER" \
    -d "password=$ADMIN_PASS" \
    -d "grant_type=password" \
    -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Failed to get admin token"
    exit 1
fi

echo "✅ Got admin token"

# Create realm
echo "🏗️  Creating realm '$REALM_NAME'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "realm": "'$REALM_NAME'",
        "enabled": true,
        "displayName": "WorkShelf",
        "registrationAllowed": true,
        "loginWithEmailAllowed": true,
        "duplicateEmailsAllowed": false,
        "resetPasswordAllowed": true,
        "editUsernameAllowed": false,
        "bruteForceProtected": true
    }' || echo "Realm might already exist"

echo "✅ Realm created or already exists"

# Create backend client (confidential)
echo "🔧 Creating backend client 'workshelf-api'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "workshelf-api",
        "name": "WorkShelf API",
        "description": "Backend API client",
        "enabled": true,
        "clientAuthenticatorType": "client-secret",
        "secret": "workshelf-api-secret",
        "publicClient": false,
        "standardFlowEnabled": true,
        "directAccessGrantsEnabled": true,
        "serviceAccountsEnabled": true,
        "authorizationServicesEnabled": false,
        "redirectUris": ["*"],
        "webOrigins": ["*"]
    }' || echo "Client might already exist"

echo "✅ Backend client created"

# Create frontend client (public)
echo "🔧 Creating frontend client 'workshelf-frontend'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "clientId": "workshelf-frontend",
        "name": "WorkShelf Frontend",
        "description": "React frontend client",
        "enabled": true,
        "publicClient": true,
        "standardFlowEnabled": true,
        "directAccessGrantsEnabled": true,
        "implicitFlowEnabled": false,
        "redirectUris": [
            "http://localhost:5173/*",
            "http://localhost:3000/*"
        ],
        "webOrigins": [
            "http://localhost:5173",
            "http://localhost:3000"
        ],
        "attributes": {
            "pkce.code.challenge.method": "S256"
        }
    }' || echo "Client might already exist"

echo "✅ Frontend client created"

# Create test user
echo "👤 Creating test user 'testuser'..."
curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM_NAME/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "testuser",
        "email": "test@workshelf.dev",
        "emailVerified": true,
        "enabled": true,
        "credentials": [{
            "type": "password",
            "value": "password123",
            "temporary": false
        }]
    }' || echo "User might already exist"

echo "✅ Test user created"

echo ""
echo "🎉 Keycloak configuration complete!"
echo ""
echo "📝 Configuration summary:"
echo "   Realm: $REALM_NAME"
echo "   Backend Client ID: workshelf-api"
echo "   Backend Client Secret: workshelf-api-secret"
echo "   Frontend Client ID: workshelf-frontend"
echo "   Test User: testuser / password123"
echo ""
echo "🔗 Access Keycloak admin: $KEYCLOAK_URL"
echo ""
