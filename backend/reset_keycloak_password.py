"""
Temporary script to reset Keycloak admin password
Run via ECS task with database access
"""
import asyncio
import os
import sys
import bcrypt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def reset_password():
    # Get DB connection from environment
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    # Get new password from args or use default
    new_password = sys.argv[1] if len(sys.argv) > 1 else "Admin123!"
    username = sys.argv[2] if len(sys.argv) > 2 else "admin"
    
    print(f"Resetting password for Keycloak user: {username}")
    print(f"New password: {new_password}")
    
    # Keycloak uses a separate PostgreSQL database
    # We need to connect to the Keycloak DB, not the workshelf DB
    keycloak_db_url = db_url.replace("/workshelf", "/keycloak")
    
    engine = create_async_engine(keycloak_db_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Keycloak stores users in the user_entity table
            # Password credentials are in the credential table
            
            # First, find the user
            result = await session.execute(
                text("SELECT id, username, realm_id FROM user_entity WHERE username = :username"),
                {"username": username}
            )
            user = result.fetchone()
            
            if not user:
                print(f"ERROR: User {username} not found in Keycloak database")
                
                # List available users
                result = await session.execute(
                    text("SELECT username, email FROM user_entity LIMIT 10")
                )
                users = result.fetchall()
                print("\nAvailable users:")
                for u in users:
                    print(f"  - {u[0]} ({u[1]})")
                
                sys.exit(1)
            
            user_id = user[0]
            print(f"Found user: {user[1]} (ID: {user_id}, Realm: {user[2]})")
            
            # Hash the new password using bcrypt (Keycloak's default)
            # Keycloak uses a specific format: {bcrypt}$2a$10$...
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(rounds=10))
            keycloak_hash = password_hash.decode('utf-8')
            
            # Update or insert credential
            # First check if password credential exists
            result = await session.execute(
                text("""
                    SELECT id FROM credential 
                    WHERE user_id = :user_id AND type = 'password'
                """),
                {"user_id": user_id}
            )
            existing = result.fetchone()
            
            if existing:
                # Update existing credential
                await session.execute(
                    text("""
                        UPDATE credential 
                        SET secret_data = :secret_data,
                            credential_data = :credential_data,
                            created_date = extract(epoch from now()) * 1000
                        WHERE id = :credential_id
                    """),
                    {
                        "credential_id": existing[0],
                        "secret_data": f'{{"value":"{keycloak_hash}","salt":""}}',
                        "credential_data": '{"hashIterations":27500,"algorithm":"bcrypt"}'
                    }
                )
                print(f"Updated existing password credential")
            else:
                # Insert new credential
                await session.execute(
                    text("""
                        INSERT INTO credential (id, user_id, type, secret_data, credential_data, created_date)
                        VALUES (
                            gen_random_uuid()::text,
                            :user_id,
                            'password',
                            :secret_data,
                            :credential_data,
                            extract(epoch from now()) * 1000
                        )
                    """),
                    {
                        "user_id": user_id,
                        "secret_data": f'{{"value":"{keycloak_hash}","salt":""}}',
                        "credential_data": '{"hashIterations":27500,"algorithm":"bcrypt"}'
                    }
                )
                print(f"Created new password credential")
            
            await session.commit()
            print(f"\n✅ Password reset successful!")
            print(f"Username: {username}")
            print(f"Password: {new_password}")
            print(f"\nYou can now log in at: https://auth.workshelf.dev/admin/")
            
        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(reset_password())
