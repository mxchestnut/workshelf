import asyncio
import asyncpg

async def create_keycloak_database():
    # Connect to default postgres database
    conn = await asyncpg.connect(
        host='workshelf-db.c47iwe0is948.us-east-1.rds.amazonaws.com',
        port=5432,
        user='workshelfadmin',
        password='vm3APbMkZ0V+5S6EpDqpYqzsqJ6sH6PiOE3ij8bNGQ4=',
        database='postgres'
    )
    
    try:
        # Check if keycloak database exists
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname='keycloak'"
        )
        
        if not exists:
            # Create keycloak database
            await conn.execute('CREATE DATABASE keycloak')
            print("✅ Created keycloak database")
        else:
            print("ℹ️  Keycloak database already exists")
            
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(create_keycloak_database())
