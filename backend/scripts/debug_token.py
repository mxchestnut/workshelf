"""
Debug script to decode JWT token and inspect claims
Run this to see what's in your JWT token without verification
"""
import sys
from jose import jwt
import json

def decode_token_unverified(token: str):
    """Decode token without verification to inspect claims"""
    try:
        # Get header
        header = jwt.get_unverified_header(token)
        print("=== TOKEN HEADER ===")
        print(json.dumps(header, indent=2))
        print()
        
        # Get claims
        claims = jwt.get_unverified_claims(token)
        print("=== TOKEN CLAIMS ===")
        print(json.dumps(claims, indent=2))
        print()
        
        # Highlight important fields
        print("=== KEY FIELDS ===")
        print(f"Issuer (iss): {claims.get('iss')}")
        print(f"Audience (aud): {claims.get('aud')}")
        print(f"Subject (sub): {claims.get('sub')}")
        print(f"Email: {claims.get('email')}")
        print(f"Client ID (azp): {claims.get('azp')}")
        print(f"Expires at (exp): {claims.get('exp')}")
        
    except Exception as e:
        print(f"Error decoding token: {e}")
        return

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_token.py <your_jwt_token>")
        print("\nOr paste your token when prompted:")
        token = input("Token: ").strip()
    else:
        token = sys.argv[1]
    
    decode_token_unverified(token)
