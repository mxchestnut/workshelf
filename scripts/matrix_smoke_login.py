#!/usr/bin/env python3
"""
Matrix smoke test: password login
Usage:
  MATRIX_HOMESERVER=https://matrix.workshelf.dev MATRIX_USER=localpart MATRIX_PASS=secret \
    python scripts/matrix_smoke_login.py

Prints access_token on success and exits 0.
"""
import os
import sys
import json
import requests
from urllib.parse import urlparse

HOMESERVER = os.environ.get("MATRIX_HOMESERVER", "https://matrix.workshelf.dev").rstrip("/")
USER = os.environ.get("MATRIX_USER")
PASS = os.environ.get("MATRIX_PASS")

if not USER or not PASS:
    print("MATRIX_USER and MATRIX_PASS env vars required", file=sys.stderr)
    sys.exit(2)

session = requests.Session()

candidates = [USER]
if not USER.startswith('@'):
    host = urlparse(HOMESERVER).netloc
    candidates.append(f"@{USER}:{host}")

last_error = None
for cand in candidates:
    for suffix in ("v3", "r0"):
        url = f"{HOMESERVER}/_matrix/client/{suffix}/login"
        try:
            print(f"Trying {url} as {cand}...")
            r = session.post(url, json={
                "type": "m.login.password",
                "identifier": {"type": "m.id.user", "user": cand},
                "password": PASS,
            }, timeout=15)
            if r.status_code == 200:
                data = r.json()
                print(json.dumps({
                    "user_id": data.get("user_id"),
                    "access_token": data.get("access_token"),
                    "device_id": data.get("device_id"),
                    "homeserver": HOMESERVER,
                }, indent=2))
                sys.exit(0)
            else:
                last_error = f"{r.status_code} {r.text}"
        except Exception as e:
            last_error = str(e)

print(f"Login failed. Last error: {last_error}", file=sys.stderr)
sys.exit(1)
