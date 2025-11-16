#!/usr/bin/env python3
"""
Promote an existing Matrix user to admin and optionally set a new password.

Requires an existing Synapse admin access token stored in AWS Secrets Manager
under workshelf/matrix-admin-access-token (or override via MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME).

Env vars / CLI args:
  MATRIX_HOMESERVER (default: https://matrix.workshelf.dev)
  MATRIX_TARGET_USERNAME  (user localpart OR full @user:domain to promote)
  MATRIX_TARGET_PASSWORD  (optional new password to set for the target user)
  MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME (default: workshelf/matrix-admin-access-token)

Usage examples:
  MATRIX_TARGET_USERNAME=warpxth python3 scripts/promote_user_admin.py
  MATRIX_TARGET_USERNAME=warpxth MATRIX_TARGET_PASSWORD='NewStrong!Pass123' python3 scripts/promote_user_admin.py

Exit codes:
  0 success
  2 missing inputs
  1 failure
"""
import os
import sys
import json
import requests
import boto3
from urllib.parse import urlparse

HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev").rstrip("/")
TARGET = os.getenv("MATRIX_TARGET_USERNAME")
NEW_PASS = os.getenv("MATRIX_TARGET_PASSWORD")
SECRET_NAME = os.getenv("MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME", "workshelf/matrix-admin-access-token")

if not TARGET:
    print("❌ MATRIX_TARGET_USERNAME is required", file=sys.stderr)
    sys.exit(2)

host = urlparse(HOMESERVER).netloc
if TARGET.startswith('@'):
    full_user_id = TARGET
else:
    full_user_id = f"@{TARGET}:{host}"

print(f"🔧 Promoting user: {full_user_id} on {HOMESERVER}")

try:
    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=SECRET_NAME)
    admin_token = resp.get("SecretString")
    if not admin_token:
        raise RuntimeError("Admin token secret empty")
except Exception as e:
    print(f"❌ Failed to load admin token from '{SECRET_NAME}': {e}", file=sys.stderr)
    sys.exit(1)

session = requests.Session()

def promote():
    url = f"{HOMESERVER}/_synapse/admin/v2/users/{full_user_id}/admin"
    r = session.put(url, headers={"Authorization": f"Bearer {admin_token}"}, json={"admin": True}, timeout=15)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Promote failed: {r.status_code} {r.text}")
    print("✅ User marked as admin")

def set_password():
    if not NEW_PASS:
        return
    url = f"{HOMESERVER}/_synapse/admin/v2/users/{full_user_id}/password"
    r = session.put(url, headers={"Authorization": f"Bearer {admin_token}"}, json={"password": NEW_PASS, "logout_devices": False}, timeout=15)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Set password failed: {r.status_code} {r.text}")
    print("🔐 Password updated (logout_devices=False)")

def verify_admin_flag():
    url = f"{HOMESERVER}/_synapse/admin/v2/users/{full_user_id}"
    r = session.get(url, headers={"Authorization": f"Bearer {admin_token}"}, timeout=15)
    if r.status_code != 200:
        print(f"⚠️  Could not verify admin flag: {r.status_code} {r.text}")
        return
    data = r.json()
    is_admin = data.get("admin")
    print(f"👤 admin flag now: {is_admin}")

def main():
    promote()
    set_password()
    verify_admin_flag()
    print("\n✅ Promotion complete")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"❌ Failed: {e}", file=sys.stderr)
        sys.exit(1)
