#!/bin/bash
# Start backend with mock authentication for local development

echo "🚀 Starting backend with mock authentication..."

cd "$(dirname "$0")"

# Set only the required environment variables
export PYTHONPATH=/Users/kit/Code/workshelf/backend
export MOCK_AUTH=true
# DATABASE_URL should be set via environment or .env file
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set. Please set it in your environment or create backend/.env.local"
  exit 1
fi
export KEYCLOAK_SERVER_URL="https://keycloak.workshelf.dev"
export KEYCLOAK_REALM="workshelf"
export KEYCLOAK_CLIENT_ID="workshelf-backend"

# Start uvicorn
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
