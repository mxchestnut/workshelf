"""
Give staff access to a user by email
Run with: python scripts/make_user_staff.py <email>
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

def make_staff(email):
    """Make a user staff by email"""
    session = Session()
    
    try:
        # Find the user
        result = session.execute(
            text("SELECT id, username, email, keycloak_id, is_staff FROM users WHERE email = :email"),
            {"email": email}
        )
        user = result.fetchone()
        
        if not user:
            print(f"❌ User not found: {email}")
            print(f"\n   Make sure you've logged in at least once so the user is created in the database.")
            return
        
        user_id, username, user_email, keycloak_id, is_staff = user
        
        print(f"\n📋 Found user:")
        print(f"   ID: {user_id}")
        print(f"   Username: {username}")
        print(f"   Email: {user_email}")
        print(f"   Keycloak ID: {keycloak_id}")
        print(f"   Current is_staff: {is_staff}")
        
        if is_staff:
            print(f"\n✅ User is already staff!")
            return
        
        # Update to staff
        session.execute(
            text("""
                UPDATE users 
                SET is_staff = true,
                    is_verified = true,
                    is_active = true
                WHERE id = :user_id
            """),
            {"user_id": user_id}
        )
        
        session.commit()
        
        print(f"\n🎉 SUCCESS! User is now staff!")
        print(f"\n   You can now access the staff page at https://workshelf.dev/staff")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/make_user_staff.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    make_staff(email)
