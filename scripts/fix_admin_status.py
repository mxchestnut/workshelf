#!/usr/bin/env python3
"""
Fix admin/staff status for users
"""
import psycopg2

# Database connection
DB_HOST = "pretendportalstack-pretenddb12211bf2-id1jteodsp25.c47iwe0is948.us-east-1.rds.amazonaws.com"
DB_NAME = "workshelf"
DB_USER = "workshelf_admin"
DB_PASS = "GivO51ihnGvDMllSEylxMEKK0SI6UMPd"

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=5432
    )
    cur = conn.cursor()
    
    # Check current status
    print("Current user status:")
    cur.execute("""
        SELECT id, email, username, is_staff, is_approved, is_active 
        FROM users 
        WHERE email IN ('mxchestnut@gmail.com', 'kitchestnut@hotmail.com')
        ORDER BY id
    """)
    for row in cur.fetchall():
        print(f"  ID={row[0]}, email={row[1]}, username={row[2]}, staff={row[3]}, approved={row[4]}, active={row[5]}")
    
    # Fix mxchestnut@gmail.com to be staff
    print("\nUpdating mxchestnut@gmail.com to staff=True, approved=True, active=True...")
    cur.execute("""
        UPDATE users 
        SET is_staff = TRUE, is_approved = TRUE, is_active = TRUE
        WHERE email = 'mxchestnut@gmail.com'
    """)
    
    # Approve and grant staff to kitchestnut@hotmail.com
    print("Updating kitchestnut@hotmail.com to staff=True, approved=True, active=True...")
    cur.execute("""
        UPDATE users 
        SET is_staff = TRUE, is_approved = TRUE, is_active = TRUE
        WHERE email = 'kitchestnut@hotmail.com'
    """)
    
    conn.commit()
    
    # Verify changes
    print("\nUpdated user status:")
    cur.execute("""
        SELECT id, email, username, is_staff, is_approved, is_active 
        FROM users 
        WHERE email IN ('mxchestnut@gmail.com', 'kitchestnut@hotmail.com')
        ORDER BY id
    """)
    for row in cur.fetchall():
        print(f"  ID={row[0]}, email={row[1]}, username={row[2]}, staff={row[3]}, approved={row[4]}, active={row[5]}")
    
    print("\n✅ Both accounts are now staff with full access!")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
