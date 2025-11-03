"""
Phase 7 Verification Script
Confirms all components are properly installed
"""
import os
import sys

def verify_files():
    """Check that all Phase 7 files exist"""
    files = [
        # Models
        "app/models/advanced.py",
        
        # Services
        "app/services/content_integrity_service.py",
        "app/services/export_service.py",
        "app/services/accessibility_service.py",
        
        # APIs
        "app/api/content_integrity.py",
        "app/api/export.py",
        "app/api/accessibility.py",
        
        # Migration
        "alembic/versions/007_phase7.py",
        
        # Tests
        "tests/test_phase7.py"
    ]
    
    print("📁 Checking Phase 7 files...")
    all_exist = True
    for file in files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"  ✅ {file} ({size:,} bytes)")
        else:
            print(f"  ❌ {file} MISSING")
            all_exist = False
    
    return all_exist

def verify_imports():
    """Check that Phase 7 models can be imported"""
    print("\n📦 Checking Phase 7 imports...")
    try:
        from app.models import IntegrityCheck, ExportJob
        from app.models import IntegrityCheckType, IntegrityCheckStatus
        from app.models import ExportFormat, ExportStatus, ExportType
        print("  ✅ All Phase 7 models import successfully")
        
        # Check model attributes
        print(f"  ✅ IntegrityCheck has {len(IntegrityCheck.__table__.columns)} columns")
        print(f"  ✅ ExportJob has {len(ExportJob.__table__.columns)} columns")
        
        return True
    except Exception as e:
        print(f"  ❌ Import error: {e}")
        return False

def main():
    print("=" * 60)
    print("PHASE 7 VERIFICATION")
    print("=" * 60)
    
    files_ok = verify_files()
    imports_ok = verify_imports()
    
    print("\n" + "=" * 60)
    if files_ok and imports_ok:
        print("✅ PHASE 7 VERIFICATION PASSED")
        print("=" * 60)
        print("\nAll components are properly installed!")
        print("\nPhase 7 Features:")
        print("  • Content Integrity (Plagiarism + AI Detection)")
        print("  • Export System (7 formats)")
        print("  • Accessibility (WCAG Compliance)")
        print("\nAPI Endpoints:")
        print("  • /api/v1/integrity/*")
        print("  • /api/v1/export/*")
        print("  • /api/v1/accessibility/*")
        return 0
    else:
        print("❌ PHASE 7 VERIFICATION FAILED")
        print("=" * 60)
        return 1

if __name__ == "__main__":
    sys.exit(main())
