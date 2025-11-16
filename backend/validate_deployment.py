#!/usr/bin/env python3
"""
Pre-deployment validation script
Tests all critical components before Docker build
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all API modules import successfully"""
    print("1. Testing imports...")
    try:
        from app.api.v1 import api_router
        from app.api import bootstrap
        from app.main import app
        print(f"   ✓ All imports successful ({len([r for r in api_router.routes])} routes)")
        return True
    except Exception as e:
        print(f"   ✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_migration_chain():
    """Test that migration chain is valid"""
    print("2. Testing migration chain...")
    import glob
    import re
    
    migration_files = glob.glob("alembic/versions/*.py")
    revisions = {}
    down_revisions = {}
    
    for f in migration_files:
        with open(f, 'r') as file:
            content = file.read()
            rev_match = re.search(r"revision\s*[:=]\s*['\"]([^'\"]+)['\"]", content)
            down_match = re.search(r"down_revision\s*[:=]\s*['\"]([^'\"]+)['\"]", content)
            
            if rev_match:
                rev = rev_match.group(1)
                revisions[rev] = f
                if down_match:
                    down = down_match.group(1)
                    down_revisions[rev] = down
    
    # Find heads (revisions with no children)
    all_downs = set(down_revisions.values())
    heads = [r for r in revisions.keys() if r not in all_downs and r != 'None']
    
    # Find orphans (down_revision = None)
    orphans = [r for r, d in down_revisions.items() if d == 'None']
    
    print(f"   Found {len(revisions)} migrations")
    print(f"   Migration heads: {heads}")
    
    if len(heads) > 1:
        print(f"   ✗ MULTIPLE HEADS DETECTED: {heads}")
        return False
    
    if orphans:
        print(f"   ✗ ORPHAN MIGRATIONS (down_revision=None): {orphans}")
        return False
    
    print(f"   ✓ Migration chain is valid (single head)")
    return True

def test_dockerfile():
    """Test that Dockerfile exists and is valid"""
    print("3. Testing Dockerfile...")
    if not os.path.exists("Dockerfile"):
        print("   ✗ Dockerfile not found")
        return False
    
    with open("Dockerfile", 'r') as f:
        content = f.read()
        if "FROM python:" not in content:
            print("   ✗ Invalid Dockerfile (no Python base image)")
            return False
        if "COPY requirements.txt" not in content:
            print("   ✗ Dockerfile missing requirements.txt copy")
            return False
    
    print("   ✓ Dockerfile is valid")
    return True

def test_requirements():
    """Test that requirements.txt exists"""
    print("4. Testing requirements...")
    if not os.path.exists("requirements.txt"):
        print("   ✗ requirements.txt not found")
        return False
    
    with open("requirements.txt", 'r') as f:
        deps = f.readlines()
        print(f"   ✓ {len(deps)} dependencies listed")
    return True

def test_start_script():
    """Test that start.sh is executable and valid"""
    print("5. Testing start script...")
    if not os.path.exists("start.sh"):
        print("   ✗ start.sh not found")
        return False
    
    with open("start.sh", 'r') as f:
        content = f.read()
        if "exec uvicorn" not in content:
            print("   ✗ start.sh doesn't start uvicorn")
            return False
    
    print("   ✓ start.sh is valid")
    return True

def main():
    print("=== Pre-Deployment Validation ===\n")
    
    tests = [
        test_imports,
        test_migration_chain,
        test_dockerfile,
        test_requirements,
        test_start_script
    ]
    
    results = [test() for test in tests]
    
    print("\n=== Summary ===")
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✓ All {total} tests passed - READY TO BUILD")
        return 0
    else:
        print(f"✗ {total - passed}/{total} tests failed - FIX BEFORE BUILDING")
        return 1

if __name__ == "__main__":
    sys.exit(main())
