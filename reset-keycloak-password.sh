#!/bin/bash

# Reset Keycloak Admin Password
# Usage: ./reset-keycloak-password.sh <new-password>

if [ -z "$1" ]; then
  echo "Usage: $0 <new-password>"
  echo "Example: $0 'MyNewSecurePassword123!'"
  exit 1
fi

NEW_PASSWORD="$1"

echo "🔄 Resetting Keycloak admin password..."

# Get the Keycloak container name
KEYCLOAK_CONTAINER=$(ssh workshelf-prod "sudo docker ps --filter 'name=keycloak' --format '{{.Names}}'" | head -1)

if [ -z "$KEYCLOAK_CONTAINER" ]; then
  echo "❌ Keycloak container not found"
  exit 1
fi

echo "Found Keycloak container: $KEYCLOAK_CONTAINER"

# First try to authenticate with current password (will fail if we don't know it, but that's ok)
echo "Attempting to configure kcadm..."
ssh workshelf-prod "sudo docker exec $KEYCLOAK_CONTAINER /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin 2>/dev/null || echo 'Could not authenticate with default password, will try to reset anyway'"

# Reset the password
echo "Setting new password..."
ssh workshelf-prod "sudo docker exec $KEYCLOAK_CONTAINER /opt/keycloak/bin/kcadm.sh set-password \
  --server http://localhost:8080 \
  --realm master \
  --username admin \
  --new-password '$NEW_PASSWORD' 2>&1 || sudo docker exec $KEYCLOAK_CONTAINER bash -c 'export KEYCLOAK_ADMIN=admin && export KEYCLOAK_ADMIN_PASSWORD=\"$NEW_PASSWORD\" && /opt/keycloak/bin/kc.sh start --optimized &'"

# Verify by trying to authenticate
echo "Verifying new password..."
ssh workshelf-prod "sudo docker exec $KEYCLOAK_CONTAINER /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password '$NEW_PASSWORD'"

if [ $? -eq 0 ]; then
  echo "✅ Password reset successfully!"
  echo "You can now log in to https://keycloak.workshelf.dev with:"
  echo "  Username: admin"
  echo "  Password: $NEW_PASSWORD"
else
  echo "⚠️  Password reset completed but verification failed."
  echo "The password may have been set. Try logging in with the new password."
fi
