"""
Delete ALL users from the database
Use with extreme caution!

⚠️  DANGER: This script performs MASS HARD DELETE!
This will permanently delete:
- ALL user accounts (except one placeholder)
- ALL user-created content
- ALL group memberships

This script should NEVER be run on production!
Only use for local development or testing environments.
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

def delete_all_users():
    """Delete ALL users from the database"""
    session = Session()
    
    try:
        # Get all users first
        result = session.execute(
            text("SELECT id, username, email, is_staff FROM users ORDER BY id")
        )
        users = result.fetchall()
        
        if not users:
            print(f"❌ No users found in database")
            return
        
        print(f"\n📋 Found {len(users)} user(s):")
        for user_id, username, email, is_staff in users:
            staff_badge = "👑 STAFF" if is_staff else ""
            print(f"   ID: {user_id} | {username or 'None'} | {email} {staff_badge}")
        
        # Confirm deletion
        print(f"\n⚠️  WARNING: This will delete ALL {len(users)} users!")
        confirm = input("Type 'DELETE ALL' to confirm: ")
        
        if confirm != "DELETE ALL":
            print("❌ Cancelled - no users deleted")
            return
        
        # Keep the first user as placeholder for store items
        # This user will become your new admin account
        first_user_id = users[0][0]
        first_username = users[0][1] or "None"
        first_email = users[0][2]
        
        print(f"\n🔧 Keeping user ID {first_user_id} ({first_username} / {first_email}) as placeholder for store items")
        print(f"   You'll take over this account by updating it with your Keycloak ID after logging in.")
        
        # Reassign all content to this user
        print(f"\n🔧 Reassigning all content to user ID {first_user_id}...")
        
        session.execute(
            text("UPDATE store_items SET seller_id = :placeholder WHERE seller_id != :placeholder"),
            {"placeholder": first_user_id}
        )
        print(f"   ✓ Reassigned store items")
        
        try:
            session.execute(
                text("UPDATE documents SET owner_id = :placeholder WHERE owner_id IS NOT NULL AND owner_id != :placeholder"),
                {"placeholder": first_user_id}
            )
            print(f"   ✓ Reassigned documents")
        except:
            pass
        
        # Delete all OTHER users
        print(f"\n🗑️  Deleting {len(users) - 1} other users...")
        session.execute(
            text("DELETE FROM users WHERE id != :placeholder"),
            {"placeholder": first_user_id}
        )
        
        # Update the remaining user to be staff
        session.execute(
            text("UPDATE users SET is_staff = true, is_verified = true, is_active = true WHERE id = :placeholder"),
            {"placeholder": first_user_id}
        )
        
        session.commit()
        
        print(f"\n✅ Cleanup complete!")
        print(f"\n📝 Remaining user (ID {first_user_id}):")
        print(f"   Email: {first_email}")
        print(f"   Username: {first_username}")
        print(f"   Status: ✅ STAFF")
        print(f"\n   Delete this user in Keycloak, then create your new admin account.")
        print(f"   When you log in, the system will create a new database user for you.")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    delete_all_users()
