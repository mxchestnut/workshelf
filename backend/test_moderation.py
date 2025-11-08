"""
Test script to demonstrate the moderation flow for author edits.
This creates a test author edit that you can then approve/reject from the moderation panel.
"""
import asyncio
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.authors import Author, AuthorEdit
from app.models.user import User
from datetime import datetime


def create_test_edit():
    """Create a test author edit for moderation."""
    db: Session = SessionLocal()
    
    try:
        # Find or create a test user
        test_user = db.query(User).filter(User.email == "test@workshelf.dev").first()
        if not test_user:
            print("⚠️  No test user found. Please create a user with email test@workshelf.dev")
            print("   Or update this script to use your actual user email.")
            return
        
        # Find an author (let's grab the first one)
        author = db.query(Author).first()
        if not author:
            print("⚠️  No authors found in database. Please add some authors first.")
            return
        
        print(f"✅ Found author: {author.name} (ID: {author.id})")
        print(f"✅ Using user: {test_user.email} (ID: {test_user.id})")
        
        # Create a test edit to the biography
        old_bio = author.bio or "No biography yet."
        new_bio = """Stephen King is an American author of horror, supernatural fiction, suspense, crime, science-fiction, and fantasy novels. 

Described by many as the 'Master of Horror', King has written over 60 novels and 200 short stories, many of which have been adapted into films, television series, and comic books.

His books have sold more than 350 million copies worldwide, and many have been adapted into films, television series, miniseries, and comic books. He has won numerous awards including the Bram Stoker Award, World Fantasy Award, and British Fantasy Society Award."""
        
        test_edit = AuthorEdit(
            author_id=author.id,
            user_id=test_user.id,
            field_name="bio",
            old_value=old_bio,
            new_value=new_bio,
            edit_summary="Updated biography with more comprehensive information about his career and achievements",
            status="pending",
            created_at=datetime.utcnow()
        )
        
        db.add(test_edit)
        db.commit()
        db.refresh(test_edit)
        
        print(f"\n🎉 Test edit created successfully!")
        print(f"   Edit ID: {test_edit.id}")
        print(f"   Author: {author.name}")
        print(f"   Field: {test_edit.field_name}")
        print(f"   Status: {test_edit.status}")
        print(f"\n📝 To view and moderate this edit:")
        print(f"   1. Make sure the backend is running (uvicorn app.main:app --reload)")
        print(f"   2. Navigate to: http://localhost:5173/admin/moderation")
        print(f"   3. Log in with an admin account")
        print(f"   4. You'll see the pending edit in the queue!")
        
    except Exception as e:
        print(f"❌ Error creating test edit: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_test_edit()
