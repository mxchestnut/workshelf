#!/bin/bash
set -e

# TEMPORARILY DISABLED: Alembic migration chain is broken (duplicate revision numbers)
# echo "Running database migrations..."
# alembic upgrade head

echo "Starting application (migrations disabled)..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
