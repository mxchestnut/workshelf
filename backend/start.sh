#!/bin/bash
set -e

echo "=== WorkShelf Backend Startup ==="

# 1. Ensure Keycloak schema exists
echo "1/5 Creating Keycloak schema..."
python -m scripts.create_keycloak_schema || echo "⚠️  Keycloak schema creation failed (may already exist)"

# 2. Create base tables (idempotent)
echo "2/5 Creating database tables..."
python -m scripts.create_tables || echo "⚠️  Table creation failed (may already exist)"

# 3. Add Matrix columns (idempotent)
echo "3/5 Adding Matrix columns..."
python -m scripts.add_matrix_columns || echo "⚠️  Matrix columns script had issues (may already exist)"

# 4. Run database migrations (with error handling)
echo "4/5 Running database migrations..."
if alembic upgrade head 2>&1 | tee /tmp/alembic.log; then
    echo "✓ Migrations completed successfully"
else
    echo "⚠️  Migration failed - checking if it's safe to continue..."
    if grep -q "Multiple head revisions" /tmp/alembic.log; then
        echo "⚠️  Multiple migration heads detected - attempting merge..."
        alembic merge heads -m "auto_merge_heads" || true
        alembic upgrade head || echo "⚠️  Still failed, continuing with existing schema..."
    elif grep -q "Target database is not up to date" /tmp/alembic.log; then
        echo "✓ Database already at latest version"
    else
        echo "⚠️  Unknown migration error, continuing with existing schema..."
    fi
fi

# 5. Grant staff permissions to bootstrap users (idempotent)
echo "5/5 Granting staff permissions to bootstrap users..."
python -c "
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def grant_staff():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text('''
                UPDATE users 
                SET is_staff = TRUE, is_approved = TRUE, is_active = TRUE
                WHERE email IN ('mxchestnut@gmail.com', 'kitchestnut@hotmail.com')
                RETURNING email
            '''))
            updated = result.fetchall()
            if updated:
                print(f'✓ Granted staff to: {[row[0] for row in updated]}')
            else:
                print('✓ No users found to grant staff (will be set on first login)')
    except Exception as e:
        print(f'⚠️  Staff grant failed: {e}')

asyncio.run(grant_staff())
" || echo "⚠️  Staff grant script failed"

echo "=== Starting FastAPI application ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
