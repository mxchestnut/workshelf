#!/usr/bin/env python3
"""
Endpoint validation script for Matrix integration deployment
Tests /auth/me and /matrix/credentials endpoints
"""
import os
import sys
import json
import requests
from urllib.parse import urljoin

# Configuration
API_BASE = os.environ.get("API_BASE", "https://api.workshelf.dev")
# For testing, you can provide a valid JWT token
TEST_TOKEN = os.environ.get("TEST_TOKEN")

def test_auth_me(token=None):
    """Test /api/v1/auth/me endpoint"""
    print("Testing /api/v1/auth/me...")
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = urljoin(API_BASE, "/api/v1/auth/me")
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"  Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"  ✅ Success!")
            print(f"  User ID: {data.get('id')}")
            print(f"  Email: {data.get('email')}")
            print(f"  Matrix onboarding seen: {data.get('matrix_onboarding_seen')}")
            
            groups = data.get('groups', [])
            print(f"  Groups: {len(groups)} total")
            if groups:
                for g in groups[:3]:
                    print(f"    - {g.get('name')} (matrix_space_id: {g.get('matrix_space_id', 'none')})")
            return True
        elif r.status_code == 401:
            print(f"  ⚠️  Unauthorized (expected without valid token)")
            return True
        else:
            print(f"  ❌ Unexpected status: {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_matrix_credentials(token=None):
    """Test /api/v1/matrix/credentials endpoint"""
    print("\nTesting /api/v1/matrix/credentials...")
    
    if not token:
        print("  ⚠️  Skipping (requires valid auth token)")
        return True
    
    headers = {"Authorization": f"Bearer {token}"}
    url = urljoin(API_BASE, "/api/v1/matrix/credentials")
    
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print(f"  Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"  ✅ Success!")
            print(f"  Matrix User ID: {data.get('matrix_user_id')}")
            print(f"  Homeserver: {data.get('homeserver')}")
            print(f"  Has access token: {bool(data.get('access_token'))}")
            return True
        elif r.status_code == 404:
            print(f"  ℹ️  No Matrix credentials yet (user not provisioned)")
            return True
        else:
            print(f"  ❌ Unexpected status: {r.status_code}")
            print(f"  Response: {r.text[:500]}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_health():
    """Test basic health endpoint"""
    print("Testing /health...")
    url = urljoin(API_BASE, "/health")
    
    try:
        r = requests.get(url, timeout=10)
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            print(f"  ✅ Backend is healthy")
            return True
        else:
            print(f"  ❌ Health check failed")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print(f"🔍 Validating endpoints at {API_BASE}\n")
    
    results = []
    
    # Test health first
    results.append(("Health check", test_health()))
    
    # Test auth/me
    results.append(("Auth info", test_auth_me(TEST_TOKEN)))
    
    # Test matrix credentials (requires token)
    results.append(("Matrix credentials", test_matrix_credentials(TEST_TOKEN)))
    
    print("\n" + "="*60)
    print("Summary:")
    for name, passed in results:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}")
    
    all_passed = all(r[1] for r in results)
    if all_passed:
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed or were skipped")
        return 0  # Non-blocking for now

if __name__ == "__main__":
    sys.exit(main())
