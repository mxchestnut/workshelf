#!/bin/bash
# Start backend with mock authentication for local development

echo "🚀 Starting backend with mock authentication..."

cd "$(dirname "$0")"

# Set only the required environment variables
export PYTHONPATH=/Users/kit/Code/workshelf/backend
export MOCK_AUTH=true
export DATABASE_URL="postgresql://neondb_owner:npg_JQ0XKyGhZ5RO@ep-cold-rice-ad0d3rzt-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
export KEYCLOAK_SERVER_URL="https://keycloak.workshelf.dev"
export KEYCLOAK_REALM="workshelf"
export KEYCLOAK_CLIENT_ID="workshelf-backend"

# Start uvicorn
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
