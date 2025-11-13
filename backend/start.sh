#!/bin/bash
set -e

echo "Creating Keycloak schema..."
python -m scripts.create_keycloak_schema

echo "Creating database tables..."
python -m scripts.create_tables

echo "Stamping database to latest migration version..."
alembic stamp head

echo "Running any new database migrations..."
alembic upgrade head

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
