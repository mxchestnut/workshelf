#!/usr/bin/env python3
"""
Grant staff privileges to warpxth (mxchestnut@gmail.com)
"""
import asyncio
import asyncpg
import sys

async def grant_staff():
    """Grant staff privileges to warpxth"""
    # Get connection from AWS Secrets Manager or environment
    import boto3
    import json
    
    try:
        secrets_client = boto3.client('secretsmanager', region_name='us-east-1')
        db_password = secrets_client.get_secret_value(SecretId='workshelf/db-password')['SecretString']
        db_url = f'postgresql://workshelf_admin:{db_password}@workshelf-db.c47iwe0is948.us-east-1.rds.amazonaws.com:5432/workshelf'
    except Exception as e:
        print(f"Error getting secret: {e}")
        print("Set DATABASE_URL environment variable or use AWS Secrets Manager")
        sys.exit(1)
    
    try:
        print("🔌 Connecting to database...")
        conn = await asyncpg.connect(db_url, timeout=30)
        
        # Check if user exists
        print("🔍 Looking for user mxchestnut@gmail.com...")
        user = await conn.fetchrow(
            'SELECT id, email, username, display_name, is_staff FROM users WHERE email = $1',
            'mxchestnut@gmail.com'
        )
        
        if not user:
            print("❌ User not found: mxchestnut@gmail.com")
            print("   Make sure you've logged in at least once!")
            await conn.close()
            return False
        
        print(f"\n📋 Found user:")
        print(f"   ID: {user['id']}")
        print(f"   Username: {user['username']}")
        print(f"   Email: {user['email']}")
        print(f"   Display Name: {user['display_name']}")
        print(f"   Current is_staff: {user['is_staff']}")
        
        if user['is_staff']:
            print(f"\n✅ User is already staff!")
            await conn.close()
            return True
        
        # Grant staff privileges
        print(f"\n⚡ Granting staff privileges...")
        await conn.execute(
            'UPDATE users SET is_staff = TRUE, is_verified = TRUE, is_active = TRUE WHERE email = $1',
            'mxchestnut@gmail.com'
        )
        
        print(f"\n🎉 SUCCESS! User is now staff!")
        print(f"\n   You can now access:")
        print(f"   • Staff Panel: https://workshelf.dev/staff")
        print(f"   • Group Admin: https://workshelf.dev/admin")
        print(f"\n   Make sure to log in first at https://workshelf.dev")
        
        await conn.close()
        return True
        
    except asyncio.TimeoutError:
        print("❌ Connection timeout - database may not be accessible from your network")
        print("   This is normal if RDS has network restrictions")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Grant Staff Privileges to warpxth")
    print("=" * 60)
    success = asyncio.run(grant_staff())
    sys.exit(0 if success else 1)
