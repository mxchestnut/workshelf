"""
Create test data for admin dashboard testing
Adds sample groups with pending subdomain requests
"""
import asyncio
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os

# Add parent directory to path
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.collaboration import Group, GroupMember, GroupMemberRole, GroupPrivacyType
from app.models.user import User
from app.models.tenant import Tenant
from app.core.config import settings


def create_test_data():
    """Create test groups with pending subdomain requests"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://'))
    
    with Session(engine) as db:
        # Get or create default tenant
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(
                name="WorkShelf",
                slug="workshelf",
                is_active=True
            )
            db.add(tenant)
            db.flush()
            print(f"✅ Created default tenant: {tenant.name}")
        
        # Get or create a test user
        test_user = db.query(User).filter(User.email == "admin@workshelf.dev").first()
        if not test_user:
            test_user = User(
                keycloak_id=f"test-admin-{datetime.now(timezone.utc).timestamp()}",
                email="admin@workshelf.dev",
                username="admin",
                display_name="Admin User",
                is_active=True,
                tenant_id=tenant.id
            )
            db.add(test_user)
            db.flush()
            print(f"✅ Created test user: {test_user.email}")
        
        # Create test groups with subdomain requests
        test_groups = [
            {
                "name": "Science Fiction Writers Guild",
                "slug": "scifi-writers",
                "description": "A community for science fiction authors",
                "subdomain_requested": "scifi",
                "member_count": 45
            },
            {
                "name": "Poetry Corner",
                "slug": "poetry-corner",
                "description": "Share and discuss poetry",
                "subdomain_requested": "poetry",
                "member_count": 23
            },
            {
                "name": "NaNoWriMo 2025",
                "slug": "nanowrimo-2025",
                "description": "National Novel Writing Month participants",
                "subdomain_requested": "nano2025",
                "member_count": 156
            },
            {
                "name": "Beta Reading Exchange",
                "slug": "beta-readers",
                "description": "Find beta readers for your work",
                "subdomain_requested": "betareaders",
                "member_count": 89
            }
        ]
        
        for group_data in test_groups:
            # Check if group already exists
            existing = db.query(Group).filter(Group.slug == group_data["slug"]).first()
            if existing:
                print(f"Group '{group_data['name']}' already exists, skipping...")
                continue
            
            # Create group
            group = Group(
                name=group_data["name"],
                slug=group_data["slug"],
                description=group_data["description"],
                subdomain_requested=group_data["subdomain_requested"],
                subdomain_approved=False,
                privacy=GroupPrivacyType.PUBLIC,
                is_active=True,
                member_count=group_data["member_count"]
            )
            db.add(group)
            db.flush()
            
            # Add owner membership
            membership = GroupMember(
                group_id=group.id,
                user_id=test_user.id,
                role=GroupMemberRole.OWNER
            )
            db.add(membership)
            
            print(f"✅ Created group: {group_data['name']} (subdomain: {group_data['subdomain_requested']})")
        
        db.commit()
        print("\n🎉 Test data created successfully!")


if __name__ == "__main__":
    create_test_data()
