#!/bin/bash
set -e

echo "Creating database tables..."
python -m scripts.create_tables

echo "Running database migrations..."
alembic upgrade head

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
