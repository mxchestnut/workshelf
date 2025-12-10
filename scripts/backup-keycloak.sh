#!/bin/bash
# Backup Keycloak schema before any deployment
# Run this BEFORE deploying changes to production

set -e

BACKUP_DIR="./backups/keycloak"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/keycloak_${TIMESTAMP}.sql"

# Production database details from .env.prod
PROD_USER="ubuntu"
PROD_HOST="34.239.176.138"
KEY_PATH="$HOME/.ssh/workshelf-key.pem"

echo "🔐 Keycloak Schema Backup"
echo "========================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup: $BACKUP_FILE"

# SSH to production and dump Keycloak schema
ssh -i "$KEY_PATH" "${PROD_USER}@${PROD_HOST}" << 'EOF'
    # Get database credentials from .env.prod
    cd /home/ubuntu/workshelf
    source <(grep DATABASE_URL .env.prod | head -1 | sed 's/^/export /')
    
    # Extract connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
    
    # Dump only the keycloak schema
    export PGPASSWORD="$DB_PASS"
    pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -n keycloak --clean --if-exists
EOF > "$BACKUP_FILE"

echo "✅ Backup saved to: $BACKUP_FILE"
echo "📊 Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo "💡 To restore this backup:"
echo "   cat $BACKUP_FILE | psql <connection_string>"
