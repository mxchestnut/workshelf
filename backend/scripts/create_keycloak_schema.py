"""Create Keycloak schema if it doesn't exist."""
import asyncio
import asyncpg
import os
from urllib.parse import urlparse

async def create_keycloak_schema():
    """Create the keycloak schema in the workshelf database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("⚠️  DATABASE_URL not set, skipping keycloak schema creation")
        return
    
    # Parse the database URL
    # Convert from asyncpg format to standard postgresql
    db_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = await asyncpg.connect(db_url)
        try:
            # Create keycloak schema if it doesn't exist
            await conn.execute("CREATE SCHEMA IF NOT EXISTS keycloak")
            # Grant permissions to the actual database user (workshelf, not workshelf_admin)
            await conn.execute("GRANT ALL ON SCHEMA keycloak TO workshelf")
            print("✅ Keycloak schema created/verified")
        finally:
            await conn.close()
    except Exception as e:
        print(f"⚠️  Could not create keycloak schema: {e}")
        # Don't fail the startup if this doesn't work
        pass

if __name__ == "__main__":
    asyncio.run(create_keycloak_schema())
