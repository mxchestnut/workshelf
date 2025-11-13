#!/bin/bash
# Fix Keycloak issuer to use HTTPS

KEYCLOAK_URL="https://auth.workshelf.dev"
ADMIN_USER="admin"
ADMIN_PASS=$(aws secretsmanager get-secret-value --secret-id workshelf/keycloak-admin-password --query SecretString --output text 2>/dev/null || echo "Workshop2024")
REALM="workshelf"

echo "Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASS}" \
  -d 'grant_type=password' \
  -d 'client_id=admin-cli')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get admin token"
  echo "$TOKEN_RESPONSE"
  exit 1
fi

echo "Updating realm frontend URL..."
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "frontendUrl": "https://auth.workshelf.dev"
    }
  }'

echo ""
echo "Verifying issuer..."
curl -s "${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration" | jq -r '.issuer'
