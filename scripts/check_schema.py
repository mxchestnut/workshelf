#!/usr/bin/env python3
"""
Quick schema check: verify that the startup patch columns exist in production
Connects to RDS via psql wrapper (requires DB credentials in env)
"""
import os
import sys
import subprocess

DB_HOST = os.environ.get("DB_HOST", "workshelf-db.c7nldsfplzvc.us-east-1.rds.amazonaws.com")
DB_NAME = os.environ.get("DB_NAME", "workshelf")
DB_USER = os.environ.get("DB_USER", "workshelf_admin")
DB_PASSWORD = os.environ.get("PGPASSWORD")

if not DB_PASSWORD:
    print("Error: PGPASSWORD env var required", file=sys.stderr)
    print("Usage: PGPASSWORD=yourpass python scripts/check_schema.py", file=sys.stderr)
    sys.exit(2)

queries = [
    ("users.matrix_onboarding_seen", 
     "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='matrix_onboarding_seen';"),
    ("groups.matrix_space_id", 
     "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='groups' AND column_name='matrix_space_id';"),
    ("Sample user count",
     "SELECT COUNT(*) as user_count FROM users;"),
]

print(f"Connecting to {DB_HOST}/{DB_NAME} as {DB_USER}...\n")

for label, query in queries:
    print(f"[{label}]")
    result = subprocess.run(
        ["psql", f"postgresql://{DB_USER}@{DB_HOST}:5432/{DB_NAME}", "-c", query],
        env={**os.environ, "PGPASSWORD": DB_PASSWORD},
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(result.stdout.strip())
    else:
        print(f"Error: {result.stderr.strip()}")
    print()

print("✅ Schema check complete")
