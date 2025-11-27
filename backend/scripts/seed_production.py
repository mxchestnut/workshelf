#!/usr/bin/env python3
"""
Production Store Seeder - Seeds WorkShelf store with 100 public domain classics

This script:
1. Prompts for Keycloak username/password
2. Authenticates and gets access token
3. Calls the /api/v1/admin/store/seed endpoint
4. Reports success/failure

Requirements: pip install requests
"""

import requests
import sys
import getpass
from typing import Optional

# Production URLs
KEYCLOAK_URL = "https://auth.workshelf.dev"
BACKEND_URL = "https://workshelf-backend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io"
REALM = "workshelf"
CLIENT_ID = "workshelf-app"


def get_keycloak_token(username: str, password: str) -> Optional[str]:
    """Authenticate with Keycloak and get access token"""
    token_url = f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token"
    
    data = {
        "grant_type": "password",
        "client_id": CLIENT_ID,
        "username": username,
        "password": password,
    }
    
    try:
        print("🔐 Authenticating with Keycloak...")
        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if access_token:
            print("✅ Authentication successful!")
            return access_token
        else:
            print("❌ No access token in response")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Authentication failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return None


def seed_store(token: str) -> bool:
    """Call the seed endpoint to populate store with 100 classics"""
    seed_url = f"{BACKEND_URL}/api/v1/admin/store/seed"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n🌱 Seeding store with 100 public domain classics...")
        print("This may take 30-60 seconds...")
        
        response = requests.post(seed_url, headers=headers, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("success"):
            items_created = result.get("items_created", 0)
            message = result.get("message", "")
            print(f"\n✅ SUCCESS! {message}")
            print(f"📚 Created {items_created} classics:")
            print("   • Romance & Literary Fiction (20)")
            print("   • Mystery & Detective (15)")
            print("   • Science Fiction & Fantasy (15)")
            print("   • Horror & Gothic (10)")
            print("   • Adventure & Action (10)")
            print("   • Philosophy & Non-Fiction (10)")
            print("   • War & Historical Fiction (10)")
            print("   • American Classics (10)")
            print("\n💰 All books priced at $2.99 ebook-only")
            print("🎧 Immersive audiobooks unlock at $120 revenue (40 sales)")
            print("\n🎉 Your store is live! Visit https://workshelf.dev/store")
            return True
        else:
            print(f"❌ Seed failed: {result}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Seed request failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_detail = e.response.json()
                print(f"Error details: {error_detail}")
            except:
                print(f"Response: {e.response.text}")
        return False


def main():
    """Main script execution"""
    print("=" * 70)
    print("🏛️  WorkShelf Production Store Seeder")
    print("=" * 70)
    print("\nThis will populate your store with 100 public domain classics")
    print("from Project Gutenberg (all pre-1928, legal to sell worldwide).\n")
    
    # Get credentials
    print("Enter your WorkShelf admin credentials:")
    username = input("Username: ").strip()
    
    if not username:
        print("❌ Username required")
        sys.exit(1)
    
    password = getpass.getpass("Password: ")
    
    if not password:
        print("❌ Password required")
        sys.exit(1)
    
    # Authenticate
    token = get_keycloak_token(username, password)
    
    if not token:
        print("\n❌ Authentication failed. Please check your credentials.")
        print("Make sure:")
        print("  1. Your account exists in production")
        print("  2. You have staff privileges (is_staff=True)")
        print("  3. Your password is correct")
        sys.exit(1)
    
    # Seed store
    success = seed_store(token)
    
    if success:
        print("\n" + "=" * 70)
        print("🎉 SEEDING COMPLETE!")
        print("=" * 70)
        sys.exit(0)
    else:
        print("\n" + "=" * 70)
        print("❌ SEEDING FAILED")
        print("=" * 70)
        print("\nPossible issues:")
        print("  1. Store already has items (endpoint prevents duplicate seeding)")
        print("  2. Your account doesn't have staff privileges")
        print("  3. Database connection issue")
        print("\nCheck the error message above for details.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
