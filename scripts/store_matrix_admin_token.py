#!/usr/bin/env python3
"""
Store a Synapse admin access token in AWS Secrets Manager.

Env:
  MATRIX_HOMESERVER (default https://matrix.workshelf.dev)
  MATRIX_ADMIN_USERNAME (required; localpart or full @user:domain)
  MATRIX_ADMIN_PASSWORD (required)
  MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME (default workshelf/matrix-admin-access-token)
"""
import os
import sys
import requests
import boto3
from urllib.parse import urlparse

HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev").rstrip("/")
ADMIN_USER = os.getenv("MATRIX_ADMIN_USERNAME")
ADMIN_PASS = os.getenv("MATRIX_ADMIN_PASSWORD")
SECRET_NAME = os.getenv("MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME", "workshelf/matrix-admin-access-token")

if not ADMIN_USER or not ADMIN_PASS:
    print("❌ MATRIX_ADMIN_USERNAME and MATRIX_ADMIN_PASSWORD are required", file=sys.stderr)
    sys.exit(2)

session = requests.Session()
session.timeout = 10

last_error_text = None

def try_login(user_identifier: str):
    global last_error_text
    payload = {
        "type": "m.login.password",
        "identifier": {"type": "m.id.user", "user": user_identifier},
        "password": ADMIN_PASS,
    }
    # Prefer modern v3 endpoint, fall back to r0
    for suffix in ("v3", "r0"):
        url = f"{HOMESERVER}/_matrix/client/{suffix}/login"
        try:
            print(f"➡️  Attempting login at {url} as '{user_identifier}'")
            r = session.post(url, json=payload)
            if r.status_code == 200:
                data = r.json()
                token = data.get("access_token")
                if token:
                    print("✅ Login succeeded")
                    return token
                else:
                    last_error_text = r.text
            else:
                last_error_text = r.text
        except Exception as e:
            last_error_text = str(e)
    return None

# Build list of identifiers to try: given value, then fully qualified @user:domain if needed
candidates = [ADMIN_USER]
if not ADMIN_USER.startswith("@"):  # add fully qualified as fallback
    host = urlparse(HOMESERVER).netloc
    candidates.append(f"@{ADMIN_USER}:{host}")

print(f"HOMESERVER: {HOMESERVER}")
print(f"Trying usernames: {', '.join(candidates)}")

token = None
for cand in candidates:
    token = try_login(cand)
    if token:
        break

if not token:
    print("❌ Login failed for all tried identifiers.", file=sys.stderr)
    if last_error_text:
        print(f"Response: {last_error_text[:500]}", file=sys.stderr)
    sys.exit(1)

# Store in Secrets Manager
try:
    sm = boto3.client("secretsmanager")
    try:
        sm.put_secret_value(SecretId=SECRET_NAME, SecretString=token)
        print(f"✅ Updated secret {SECRET_NAME}")
    except sm.exceptions.ResourceNotFoundException:
        sm.create_secret(Name=SECRET_NAME, SecretString=token, Description="Matrix admin access token")
        print(f"✅ Created secret {SECRET_NAME}")
    print("Done.")
except Exception as e:
    print(f"❌ Failed to store secret: {e}", file=sys.stderr)
    sys.exit(1)
