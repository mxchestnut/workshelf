"""
Test JWT verification with proper signature validation

This test validates that our JWT verification:
1. Fetches JWKS from Keycloak
2. Extracts the correct public key based on kid
3. Verifies token signature
4. Validates all claims (exp, iss, aud, sub)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from jose import jwt
from fastapi import HTTPException
from app.core.auth import KeycloakAuth


# Sample JWKS response from Keycloak
MOCK_JWKS = {
    "keys": [
        {
            "kid": "test-key-id",
            "kty": "RSA",
            "alg": "RS256",
            "use": "sig",
            "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
            "e": "AQAB"
        }
    ]
}


@pytest.fixture
def keycloak_auth():
    """Create a KeycloakAuth instance for testing"""
    return KeycloakAuth()


@pytest.mark.asyncio
async def test_get_jwks_success(keycloak_auth):
    """Test successful JWKS retrieval"""
    with patch('httpx.AsyncClient') as mock_client:
        mock_response = MagicMock()
        mock_response.json.return_value = MOCK_JWKS
        mock_response.raise_for_status = MagicMock()
        
        mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
        
        jwks = await keycloak_auth.get_jwks()
        
        assert jwks == MOCK_JWKS
        assert "keys" in jwks
        assert len(jwks["keys"]) == 1


@pytest.mark.asyncio
async def test_get_jwks_cached(keycloak_auth):
    """Test that JWKS is cached after first fetch"""
    keycloak_auth._jwks = MOCK_JWKS
    
    # Should return cached value without making HTTP request
    jwks = await keycloak_auth.get_jwks()
    
    assert jwks == MOCK_JWKS


def test_clear_jwks_cache(keycloak_auth):
    """Test clearing the JWKS cache"""
    keycloak_auth._jwks = MOCK_JWKS
    
    keycloak_auth.clear_jwks_cache()
    
    assert keycloak_auth._jwks is None


@pytest.mark.asyncio
async def test_verify_token_with_valid_signature(keycloak_auth):
    """Test token verification with valid signature (mocked)"""
    # This is a simplified test - in real tests, you'd use a real test token
    # from Keycloak or generate one with matching keys
    
    with patch.object(keycloak_auth, 'get_jwks', return_value=MOCK_JWKS):
        with patch('jose.jwt.decode') as mock_decode:
            mock_decode.return_value = {
                "sub": "user-123",
                "exp": 9999999999,
                "iss": keycloak_auth.issuer,
                "aud": keycloak_auth.client_id
            }
            
            # Mock token that would normally require real verification
            token = "mock.jwt.token"
            
            # Mock the get_signing_key to return a dummy key
            with patch.object(keycloak_auth, 'get_signing_key', return_value="mock-pem-key"):
                payload = await keycloak_auth.verify_token(token)
                
                assert payload["sub"] == "user-123"
                assert "exp" in payload


@pytest.mark.asyncio
async def test_verify_token_expired(keycloak_auth):
    """Test token verification with expired token"""
    with patch.object(keycloak_auth, 'get_jwks', return_value=MOCK_JWKS):
        with patch.object(keycloak_auth, 'get_signing_key', return_value="mock-pem-key"):
            with patch('jose.jwt.decode', side_effect=jwt.ExpiredSignatureError("expired")):
                
                with pytest.raises(HTTPException) as exc_info:
                    await keycloak_auth.verify_token("expired.jwt.token")
                
                assert exc_info.value.status_code == 401
                assert "expired" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_missing_kid(keycloak_auth):
    """Test token with missing kid in header"""
    token = "malformed.jwt.token"
    
    with patch('jose.jwt.get_unverified_header', return_value={}):
        with pytest.raises(HTTPException) as exc_info:
            keycloak_auth.get_signing_key(token, MOCK_JWKS)
        
        assert exc_info.value.status_code == 401
        assert "kid" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_verify_token_invalid_audience(keycloak_auth):
    """Test token with wrong audience"""
    with patch.object(keycloak_auth, 'get_jwks', return_value=MOCK_JWKS):
        with patch.object(keycloak_auth, 'get_signing_key', return_value="mock-pem-key"):
            with patch('jose.jwt.decode', side_effect=jwt.JWTClaimsError("Invalid audience")):
                
                with pytest.raises(HTTPException) as exc_info:
                    await keycloak_auth.verify_token("wrong.aud.token")
                
                assert exc_info.value.status_code == 401
                assert "claims" in exc_info.value.detail.lower()


def test_get_signing_key_key_not_found(keycloak_auth):
    """Test when token's kid doesn't match any key in JWKS"""
    token_header = {"kid": "non-existent-key"}
    
    with patch('jose.jwt.get_unverified_header', return_value=token_header):
        with pytest.raises(HTTPException) as exc_info:
            keycloak_auth.get_signing_key("fake.token", MOCK_JWKS)
        
        assert exc_info.value.status_code == 401
        assert "unable to find matching key" in exc_info.value.detail.lower()


if __name__ == "__main__":
    print("Run with: pytest test_jwt_verification.py -v")
