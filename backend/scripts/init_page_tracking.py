"""
Initialize page status and versions for navigation system
Sets up all pages from the sitemap with initial status and version 0.0.01
"""
import os
import sys
from pathlib import Path

# Add backend to path so we can import models
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.page_tracking import PageStatus, PageVersion
from app.core.config import settings

# Pages marked as "construction" (not ready for review)
CONSTRUCTION_PAGES = [
    "/store",  # Marketplace - backend partially implemented
    "/search",  # Global search - basic implementation
]

# Pages marked as "ready" (ready for review and feedback)
READY_PAGES = [
    "/",  # Landing page
    "/login",  # Login page
    "/feed",  # Main feed with tabs
    "/bookshelf",  # Personal library
    "/studio",  # Content creation
    "/groups",  # Groups hub
    "/collections",  # Collections management
    "/profile",  # User profile
    "/settings",  # Account settings
    "/staff",  # Staff dashboard
]

INITIAL_VERSION = "0.0.01"

def init_page_data():
    """Initialize page status and version data"""
    # Create database connection
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Initializing page status data...")
        
        # Create status entries for construction pages
        for page_path in CONSTRUCTION_PAGES:
            existing = db.query(PageStatus).filter(PageStatus.page_path == page_path).first()
            if not existing:
                status = PageStatus(page_path=page_path, status="construction")
                db.add(status)
                print(f"  ✓ Created status 'construction' for {page_path}")
                
                # Create initial version
                version = PageVersion(
                    page_path=page_path,
                    version=INITIAL_VERSION,
                    changes="Initial version"
                )
                db.add(version)
                print(f"  ✓ Created version {INITIAL_VERSION} for {page_path}")
            else:
                print(f"  ⊙ Status already exists for {page_path}")
        
        # Create status entries for ready pages
        for page_path in READY_PAGES:
            existing = db.query(PageStatus).filter(PageStatus.page_path == page_path).first()
            if not existing:
                status = PageStatus(page_path=page_path, status="ready")
                db.add(status)
                print(f"  ✓ Created status 'ready' for {page_path}")
                
                # Create initial version
                version = PageVersion(
                    page_path=page_path,
                    version=INITIAL_VERSION,
                    changes="Initial version - ready for review"
                )
                db.add(version)
                print(f"  ✓ Created version {INITIAL_VERSION} for {page_path}")
            else:
                print(f"  ⊙ Status already exists for {page_path}")
        
        db.commit()
        print("\n✅ Page initialization complete!")
        
        # Show summary
        total_construction = db.query(PageStatus).filter(PageStatus.status == "construction").count()
        total_ready = db.query(PageStatus).filter(PageStatus.status == "ready").count()
        total_versions = db.query(PageVersion).count()
        
        print(f"\nSummary:")
        print(f"  Construction pages: {total_construction}")
        print(f"  Ready pages: {total_ready}")
        print(f"  Total versions: {total_versions}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_page_data()
