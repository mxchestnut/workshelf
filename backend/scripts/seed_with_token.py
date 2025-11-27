#!/usr/bin/env python3
"""
Simple Store Seeder - Uses pre-obtained access token

Usage:
1. Login to https://workshelf.dev
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run: localStorage.getItem('access_token')
5. Copy the token (without quotes)
6. Run this script and paste the token when prompted
"""

import requests
import sys

BACKEND_URL = "https://workshelf-backend.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io"


def seed_store(token: str) -> bool:
    """Call the seed endpoint to populate store with 100 classics"""
    seed_url = f"{BACKEND_URL}/api/v1/admin/store/seed"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        print("\n🌱 Seeding store with 100 public domain classics...")
        print("This may take 30-60 seconds...\n")
        
        response = requests.post(seed_url, headers=headers, timeout=120)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("success"):
            items_created = result.get("items_created", 0)
            message = result.get("message", "")
            print(f"\n✅ SUCCESS! {message}")
            print(f"\n📚 Created {items_created} classics:")
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
    print("🏛️  WorkShelf Store Seeder (Token-Based)")
    print("=" * 70)
    print("\nTo get your access token:")
    print("1. Visit https://workshelf.dev and login")
    print("2. Open DevTools (F12 or Cmd+Option+I)")
    print("3. Go to Console tab")
    print("4. Run: localStorage.getItem('access_token')")
    print("5. Copy the token (the long string without quotes)")
    print("\n" + "=" * 70 + "\n")
    
    token = input("Paste your access token here: ").strip()
    
    if not token:
        print("❌ Token required")
        sys.exit(1)
    
    # Remove quotes if user copied them
    token = token.strip('"').strip("'")
    
    if len(token) < 100:
        print("❌ Token seems too short. Make sure you copied the full token.")
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
        print("  1. Token expired (login again and get new token)")
        print("  2. Store already has items (endpoint prevents duplicate seeding)")
        print("  3. Your account doesn't have staff privileges")
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
