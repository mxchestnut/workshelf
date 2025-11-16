#!/bin/bash
set -e

# Get database credentials
DB_URL=$(aws secretsmanager get-secret-value --secret-id workshelf/database/url --query SecretString --output text 2>/dev/null)

if [ -z "$DB_URL" ]; then
  echo "❌ Could not retrieve database URL from secrets manager"
  exit 1
fi

# Export for alembic
export DATABASE_URL="$DB_URL"

echo "Running migration: add_user_approval"
alembic upgrade head

echo "✅ Migration complete"
