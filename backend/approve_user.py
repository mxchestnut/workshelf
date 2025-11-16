import sys
from app.database import SessionLocal
from app.models.user import User

def approve_user(email: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.is_approved = True
            user.is_staff = True
            db.commit()
            print(f"✅ Approved: {user.email}, staff: {user.is_staff}")
        else:
            print(f"❌ User not found: {email}")
    finally:
        db.close()

if __name__ == "__main__":
    approve_user("kitchestnut@hotmail.com")
