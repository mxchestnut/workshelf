#!/usr/bin/env python3
"""
Bootstrap a Synapse admin user and store its access token in AWS Secrets Manager.

- Uses shared secret registration to create an admin user if missing
- Logs in as that admin to obtain an access token
- Stores the token in Secrets Manager at workshelf/matrix-admin-access-token (or override via MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME)

Env vars:
- MATRIX_HOMESERVER (default: https://matrix.workshelf.dev)
- MATRIX_REGISTRATION_SHARED_SECRET (required)
- MATRIX_ADMIN_USERNAME (default: workshelf_admin)
- MATRIX_ADMIN_PASSWORD (optional; if not set, a random strong password is generated)
- MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME (default: workshelf/matrix-admin-access-token)

Safety: This script is idempotent; if user exists, it only logs in and updates the token.
"""
import os
import sys
import json
import hmac
import hashlib
import string
import secrets
import requests
import boto3
from urllib.parse import urlparse

HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev")
SHARED = os.getenv("MATRIX_REGISTRATION_SHARED_SECRET")
SHARED_SECRET_NAME = os.getenv("MATRIX_REGISTRATION_SECRET_NAME", "workshelf/matrix-registration-secret")
ADMIN_USER = os.getenv("MATRIX_ADMIN_USERNAME", "workshelf_admin")
ADMIN_PASS_ENV = os.getenv("MATRIX_ADMIN_PASSWORD")  # May be None
# We'll decide later whether to generate a random password (only on first creation)
ADMIN_PASS = ADMIN_PASS_ENV  # may be None for now
SECRET_NAME = os.getenv("MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME", "workshelf/matrix-admin-access-token")

if not SHARED:
    # Attempt to load from AWS Secrets Manager
    try:
        sm = boto3.client("secretsmanager")
        resp = sm.get_secret_value(SecretId=SHARED_SECRET_NAME)
        SHARED = resp.get("SecretString")
        if not SHARED:
            raise RuntimeError("Secret empty")
        print(f"🔑 Loaded registration shared secret from Secrets Manager: {SHARED_SECRET_NAME}")
    except Exception as e:
        print("❌ MATRIX_REGISTRATION_SHARED_SECRET env var is required (or set MATRIX_REGISTRATION_SECRET_NAME for Secrets Manager)", file=sys.stderr)
        sys.exit(2)

def gen_mac(shared_secret: str, nonce: str, user: str, password: str, admin: bool = True) -> str:
    mac_input = f"{nonce}\x00{user}\x00{password}\x00{'admin' if admin else 'notadmin'}"
    return hmac.new(shared_secret.encode('utf-8'), mac_input.encode('utf-8'), hashlib.sha1).hexdigest()

def ensure_admin_user():
    """Ensure admin user exists.

    Returns:
        created (bool): True if newly created, False if already existed.
    Side effects:
        Sets global ADMIN_PASS if it was None and we created the user (random strong password).
    """
    # Check nonce
    r = requests.get(f"{HOMESERVER}/_synapse/admin/v1/register", timeout=10)
    r.raise_for_status()
    nonce = r.json().get("nonce")
    if not nonce:
        raise RuntimeError("No nonce from homeserver")
    global ADMIN_PASS
    creating = False
    # If we don't have a password yet, tentatively generate one for potential creation
    if ADMIN_PASS is None:
        ADMIN_PASS = ''.join(secrets.choice(string.ascii_letters + string.digits + string.punctuation) for _ in range(32))
        creating = True
    mac = gen_mac(SHARED, nonce, ADMIN_USER, ADMIN_PASS, admin=True)
    r = requests.post(
        f"{HOMESERVER}/_synapse/admin/v1/register",
        json={"nonce": nonce, "username": ADMIN_USER, "password": ADMIN_PASS, "admin": True, "mac": mac},
        timeout=10,
    )
    if r.status_code == 200:
        print(f"✅ Admin user '{ADMIN_USER}' created")
        if creating and ADMIN_PASS_ENV is None:
            print("🔐 Generated admin password (store this securely):")
            print(f"   MATRIX_ADMIN_PASSWORD='{ADMIN_PASS}'")
        return True
    elif r.status_code == 400:
        try:
            body = r.json()
        except Exception:
            body = {}
        if body.get("errcode") == "M_USER_IN_USE":
            print(f"ℹ️  Admin user '{ADMIN_USER}' already exists")
            # If we generated a random password but the user already existed, that's wrong.
            if creating and ADMIN_PASS_ENV is None:
                print("❌ User already exists but no MATRIX_ADMIN_PASSWORD was supplied. Can't guess existing password.", file=sys.stderr)
                print("   Set MATRIX_ADMIN_USERNAME and MATRIX_ADMIN_PASSWORD to the known credentials OR create a NEW admin localpart.", file=sys.stderr)
                raise SystemExit(3)
            return False
        else:
            print(f"⚠️  Admin register unexpected response: {r.status_code} {r.text}")
            raise RuntimeError("Admin registration failed")
    else:
        print(f"⚠️  Admin register response: {r.status_code} {r.text}")
        raise RuntimeError("Admin registration failed (non-400/200)")


def admin_login_get_token() -> str:
    host = urlparse(HOMESERVER).netloc
    candidates = [ADMIN_USER]
    if not ADMIN_USER.startswith("@"):
        candidates.append(f"@{ADMIN_USER}:{host}")
    last_err = None
    for ident in candidates:
        payload = {
            "type": "m.login.password",
            "identifier": {"type": "m.id.user", "user": ident},
            "password": ADMIN_PASS,
        }
        for suffix in ("v3", "r0"):
            url = f"{HOMESERVER}/_matrix/client/{suffix}/login"
            try:
                print(f"➡️  Login attempt {suffix} as '{ident}'")
                r = requests.post(url, json=payload, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    token = data.get("access_token")
                    if token:
                        print("✅ Login succeeded")
                        return token
                    else:
                        last_err = f"Missing access_token in {suffix} response: {r.text[:300]}"
                else:
                    last_err = f"{r.status_code} {r.text[:300]}"
            except Exception as e:
                last_err = str(e)
    raise RuntimeError(f"Login failed. Last error: {last_err}")


def store_token(secret: str):
    sm = boto3.client("secretsmanager")
    # Create or update secret
    try:
        # Try put new value
        sm.put_secret_value(SecretId=SECRET_NAME, SecretString=secret)
        print(f"✅ Updated secret '{SECRET_NAME}'")
    except sm.exceptions.ResourceNotFoundException:
        sm.create_secret(Name=SECRET_NAME, SecretString=secret, Description="Matrix admin access token for Synapse admin APIs")
        print(f"✅ Created secret '{SECRET_NAME}'")


def main():
    print("🔐 Bootstrapping Matrix admin user and token...")
    created = ensure_admin_user()
    token = admin_login_get_token()
    store_token(token)
    print("\n✅ Admin access token stored in Secrets Manager")
    print(f"   Secret name: {SECRET_NAME}")
    print(f"   Admin user: {ADMIN_USER}")
    if created and ADMIN_PASS_ENV is None:
        print("⚠️  IMPORTANT: Persist the printed MATRIX_ADMIN_PASSWORD value somewhere secure (e.g., AWS Secrets Manager)")

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"❌ Failed: {e}", file=sys.stderr)
        sys.exit(1)
