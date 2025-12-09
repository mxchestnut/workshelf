#!/bin/bash
# Reset Keycloak Admin Password
# Usage: ./reset-keycloak-admin.sh <new-password>

NEW_PASSWORD="${1}"

if [ -z "$NEW_PASSWORD" ]; then
  echo "Usage: $0 <new-password>"
  exit 1
fi

echo "🔄 Resetting Keycloak admin password..."
echo "Note: This requires SSH access to the production server"
echo ""

# You'll need to run these commands on your EC2 server:
cat << 'INSTRUCTIONS'
Run these commands on your production server:

# 1. Find the Keycloak container
KEYCLOAK_CONTAINER=$(sudo docker ps --filter "name=keycloak" --format "{{.Names}}" | head -1)

# 2. Reset admin password using kcadm tool
sudo docker exec $KEYCLOAK_CONTAINER /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

sudo docker exec $KEYCLOAK_CONTAINER /opt/keycloak/bin/kcadm.sh set-password \
  --server http://localhost:8080 \
  --realm master \
  --username admin \
  --new-password "YOUR_NEW_PASSWORD"

INSTRUCTIONS
