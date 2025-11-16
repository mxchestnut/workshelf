#!/usr/bin/env python3
"""
Integration test: simulate frontend auth flow
Tests the complete authentication chain:
1. Health check
2. Keycloak token exchange (simulated)
3. /auth/me with real token
4. /matrix/credentials with real token

Usage:
  # Option 1: Use browser to get token from frontend
  # - Open https://workshelf.dev and login
  # - Open DevTools > Application > Local Storage > workshelf.dev
  # - Copy the 'access_token' value
  # - Run: TEST_TOKEN="<token>" python scripts/integration_test.py
  
  # Option 2: For dev/test accounts with password (if configured)
  # - Set KEYCLOAK_USER and KEYCLOAK_PASSWORD
  # - Run: python scripts/integration_test.py
"""
import os
import sys
import json
import requests
from urllib.parse import urljoin

API_BASE = os.environ.get("API_BASE", "https://api.workshelf.dev")
KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "https://keycloak.workshelf.dev")
REALM = os.environ.get("KEYCLOAK_REALM", "workshelf")
CLIENT_ID = os.environ.get("KEYCLOAK_CLIENT_ID", "workshelf-frontend")

def get_token_from_password():
    """Get token using direct password grant (dev/test only)"""
    username = os.environ.get("KEYCLOAK_USER")
    password = os.environ.get("KEYCLOAK_PASSWORD")
    
    if not username or not password:
        return None
    
    print(f"Attempting password grant for {username}...")
    token_url = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token"
    
    try:
        r = requests.post(
            token_url,
            data={
                "grant_type": "password",
                "client_id": CLIENT_ID,
                "username": username,
                "password": password,
            },
            timeout=10
        )
        if r.status_code == 200:
            data = r.json()
            print("✅ Got token via password grant")
            return data.get("access_token")
        else:
            print(f"⚠️  Password grant failed: {r.status_code} {r.text[:200]}")
            return None
    except Exception as e:
        print(f"⚠️  Password grant error: {e}")
        return None

def test_with_token(token: str):
    """Run the integration test with a valid token"""
    print(f"\n{'='*60}")
    print("Integration Test: Auth Flow")
    print(f"{'='*60}\n")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Health
    print("1️⃣  Health check...")
    try:
        r = requests.get(urljoin(API_BASE, "/health"), timeout=10)
        if r.status_code == 200:
            print(f"   ✅ {r.json()}")
        else:
            print(f"   ❌ Status {r.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Auth /me
    print("\n2️⃣  GET /api/v1/auth/me...")
    try:
        r = requests.get(urljoin(API_BASE, "/api/v1/auth/me"), headers=headers, timeout=10)
        print(f"   Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ User: {data.get('email')}")
            print(f"   - ID: {data.get('id')}")
            print(f"   - Display: {data.get('display_name')}")
            print(f"   - Matrix onboarding seen: {data.get('matrix_onboarding_seen')}")
            
            groups = data.get('groups', [])
            print(f"   - Groups: {len(groups)}")
            for g in groups[:3]:
                space_id = g.get('matrix_space_id', 'none')
                print(f"     • {g.get('name')} (space: {space_id})")
            
            user_id = data.get('id')
        elif r.status_code == 403:
            print(f"   ❌ Forbidden - token might be invalid or expired")
            print(f"   Response: {r.text[:300]}")
            return False
        else:
            print(f"   ❌ Unexpected status")
            print(f"   Response: {r.text[:300]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 3: Matrix credentials
    print("\n3️⃣  GET /api/v1/matrix/credentials...")
    try:
        r = requests.get(urljoin(API_BASE, "/api/v1/matrix/credentials"), headers=headers, timeout=10)
        print(f"   Status: {r.status_code}")
        
        if r.status_code == 200:
            data = r.json()
            print(f"   ✅ Matrix user provisioned:")
            print(f"   - Matrix User ID: {data.get('matrix_user_id')}")
            print(f"   - Homeserver: {data.get('homeserver')}")
            print(f"   - Has access token: {bool(data.get('access_token'))}")
        elif r.status_code == 404:
            print(f"   ℹ️  Matrix user not yet provisioned (this is okay for new users)")
        else:
            print(f"   ⚠️  Unexpected status: {r.status_code}")
            print(f"   Response: {r.text[:300]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print(f"\n{'='*60}")
    print("✅ Integration test complete - auth flow is working!")
    print(f"{'='*60}\n")
    return True

def main():
    token = os.environ.get("TEST_TOKEN")
    
    if not token:
        print("No TEST_TOKEN provided, attempting password grant...")
        token = get_token_from_password()
    
    if not token:
        print("\n⚠️  No token available. To run this test:")
        print("   Option 1: Set TEST_TOKEN env var with a JWT from the frontend")
        print("   Option 2: Set KEYCLOAK_USER and KEYCLOAK_PASSWORD for password grant")
        print("\nTo get a token from the frontend:")
        print("   1. Open https://workshelf.dev and login")
        print("   2. Open DevTools > Application > Local Storage")
        print("   3. Copy 'access_token' value")
        print("   4. Run: TEST_TOKEN='<token>' python scripts/integration_test.py")
        return 1
    
    success = test_with_token(token)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
