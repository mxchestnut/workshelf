#!/usr/bin/env python3
"""
Reset Keycloak user password directly via admin API
Run this on the production server to reset a user's password
"""
import asyncio
import httpx
import os
import sys
from getpass import getpass


async def reset_password():
    """Reset a Keycloak user's password"""
    
    # Get environment variables
    keycloak_url = os.getenv("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080")
    realm = os.getenv("KEYCLOAK_REALM", "workshelf")
    
    print("🔐 Keycloak Password Reset Tool")
    print("=" * 50)
    print(f"Server: {keycloak_url}")
    print(f"Realm: {realm}")
    print()
    
    # Get admin credentials
    admin_username = input("Keycloak Admin Username [admin]: ").strip() or "admin"
    admin_password = getpass("Keycloak Admin Password: ")
    
    if not admin_password:
        print("❌ Admin password required")
        sys.exit(1)
    
    # Get user to reset
    username = input("Username to reset: ").strip()
    new_password = getpass("New password: ")
    new_password_confirm = getpass("Confirm new password: ")
    
    if new_password != new_password_confirm:
        print("❌ Passwords don't match")
        sys.exit(1)
    
    if len(new_password) < 8:
        print("❌ Password must be at least 8 characters")
        sys.exit(1)
    
    print("\n🔄 Processing...")
    
    async with httpx.AsyncClient(verify=False) as client:
        try:
            # 1. Get admin access token
            print("1️⃣ Getting admin token...")
            token_response = await client.post(
                f"{keycloak_url}/realms/master/protocol/openid-connect/token",
                data={
                    "client_id": "admin-cli",
                    "username": admin_username,
                    "password": admin_password,
                    "grant_type": "password"
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                print(f"❌ Failed to authenticate as admin: {token_response.text}")
                sys.exit(1)
            
            admin_token = token_response.json()["access_token"]
            print("   ✅ Admin authenticated")
            
            # 2. Find user by username
            print(f"2️⃣ Looking up user '{username}'...")
            users_response = await client.get(
                f"{keycloak_url}/admin/realms/{realm}/users",
                params={"username": username, "exact": "true"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            
            if users_response.status_code != 200:
                print(f"❌ Failed to search users: {users_response.text}")
                sys.exit(1)
            
            users = users_response.json()
            if not users:
                print(f"❌ User '{username}' not found")
                sys.exit(1)
            
            user_id = users[0]["id"]
            user_email = users[0].get("email", "N/A")
            print(f"   ✅ Found user: {username} ({user_email})")
            print(f"   User ID: {user_id}")
            
            # 3. Reset password
            print("3️⃣ Resetting password...")
            reset_response = await client.put(
                f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/reset-password",
                json={
                    "type": "password",
                    "value": new_password,
                    "temporary": False
                },
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if reset_response.status_code not in (200, 204):
                print(f"❌ Failed to reset password: {reset_response.text}")
                sys.exit(1)
            
            print("   ✅ Password reset successful")
            
            print("\n" + "=" * 50)
            print("✅ Password reset complete!")
            print(f"Username: {username}")
            print(f"Email: {user_email}")
            print("You can now log in with the new password.")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(reset_password())
