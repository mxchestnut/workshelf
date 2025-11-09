"""
Delete a user from the database by email
Run with: python scripts/delete_user.py <email>
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Get Neon database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL not found in .env file")
    sys.exit(1)

# Convert asyncpg URL to psycopg2 URL if needed
if 'postgresql+asyncpg://' in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')

print(f"🔌 Connecting to Neon database...")

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def delete_user(email):
    """Delete a user by email"""
    session = Session()
    
    try:
        # Find the user
        result = session.execute(
            text("SELECT id, username, email, keycloak_id FROM users WHERE email = :email"),
            {"email": email}
        )
        user = result.fetchone()
        
        if not user:
            print(f"❌ User not found: {email}")
            return
        
        user_id, username, user_email, keycloak_id = user
        
        print(f"\n📋 Found user:")
        print(f"   ID: {user_id}")
        print(f"   Username: {username}")
        print(f"   Email: {user_email}")
        print(f"   Keycloak ID: {keycloak_id}")
        
        # Delete the user (CASCADE should handle related records)
        print(f"\n🗑️  Deleting user...")
        session.execute(
            text("DELETE FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        
        session.commit()
        
        print(f"\n✅ User deleted successfully!")
        print(f"\nYou can now recreate this user in Keycloak.")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/delete_user.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    delete_user(email)
