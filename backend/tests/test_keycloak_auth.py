"""
Test Keycloak OAuth2 PKCE authentication flow
Tests the integration with Keycloak for user login and token validation

These tests verify:
1. Token validation with proper JWT verification
2. User creation on first login
3. Profile updates from Keycloak claims
4. Authentication dependency injection
"""
import pytest
from fastapi import HTTPException
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.auth import KeycloakAuth, get_current_user, get_current_user_id
from app.models.user import User


@pytest.fixture
def keycloak_auth():
    """Create a KeycloakAuth instance for testing"""
    return KeycloakAuth()


@pytest.fixture
def mock_jwt_payload():
    """Sample JWT payload from Keycloak"""
    return {
        "sub": "keycloak-user-id-789",
        "email": "newuser@example.com",
        "email_verified": True,
        "preferred_username": "newuser",
        "given_name": "New",
        "family_name": "User",
        "name": "New User",
        "realm_access": {
            "roles": ["user"]
        },
        "exp": 9999999999,
        "iss": "http://keycloak:8080/realms/workshelf",
        "aud": "workshelf-frontend"
    }


class TestKeycloakAuth:
    """Test Keycloak authentication functionality"""
    
    @pytest.mark.asyncio
    async def test_verify_token_extracts_claims(self, keycloak_auth, mock_jwt_payload):
        """Test that verify_token correctly extracts JWT claims"""
        with patch.object(keycloak_auth, 'get_jwks', return_value={"keys": []}):
            with patch('jose.jwt.decode', return_value=mock_jwt_payload):
                payload = await keycloak_auth.verify_token("mock.jwt.token")
                
                assert payload["sub"] == "keycloak-user-id-789"
                assert payload["email"] == "newuser@example.com"
                assert payload["preferred_username"] == "newuser"
    
    @pytest.mark.asyncio
    async def test_verify_token_validates_issuer(self, keycloak_auth):
        """Test that verify_token rejects tokens with wrong issuer"""
        bad_payload = {
            "sub": "user-123",
            "iss": "https://evil.com",
            "aud": "workshelf-frontend",
            "exp": 9999999999
        }
        
        with patch.object(keycloak_auth, 'get_jwks', return_value={"keys": []}):
            with patch('jose.jwt.decode', return_value=bad_payload):
                with pytest.raises(HTTPException) as exc_info:
                    await keycloak_auth.verify_token("mock.jwt.token")
                
                assert exc_info.value.status_code == 401
                assert "Invalid token issuer" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_verify_token_validates_audience(self, keycloak_auth):
        """Test that verify_token rejects tokens with wrong audience"""
        bad_payload = {
            "sub": "user-123",
            "iss": keycloak_auth.issuer,
            "aud": "wrong-client",
            "exp": 9999999999
        }
        
        with patch.object(keycloak_auth, 'get_jwks', return_value={"keys": []}):
            with patch('jose.jwt.decode', return_value=bad_payload):
                with pytest.raises(HTTPException) as exc_info:
                    await keycloak_auth.verify_token("mock.jwt.token")
                
                assert exc_info.value.status_code == 401
                assert "Invalid token audience" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_verify_token_handles_expired_token(self, keycloak_auth):
        """Test that verify_token rejects expired tokens"""
        from jose import JWTError
        
        with patch.object(keycloak_auth, 'get_jwks', return_value={"keys": []}):
            with patch('jose.jwt.decode', side_effect=JWTError("Token expired")):
                with pytest.raises(HTTPException) as exc_info:
                    await keycloak_auth.verify_token("expired.jwt.token")
                
                assert exc_info.value.status_code == 401
    
    def test_jwks_cache_clear(self, keycloak_auth):
        """Test that JWKS cache can be cleared"""
        keycloak_auth._jwks = {"cached": "data"}
        
        keycloak_auth.clear_jwks_cache()
        
        assert keycloak_auth._jwks is None


class TestUserAuthentication:
    """Test user authentication and creation flow"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_creates_new_user(self, db_session: AsyncSession, mock_jwt_payload):
        """Test that get_current_user creates a new user on first login"""
        # Mock the Keycloak auth to return our test payload
        with patch('app.core.auth.keycloak_auth.verify_token', return_value=mock_jwt_payload):
            # Mock the Bearer token
            credentials = MagicMock()
            credentials.credentials = "mock.jwt.token"
            
            # Call get_current_user
            user_payload = await get_current_user(
                credentials=credentials,
                db=db_session
            )
            
            # Verify user payload
            assert user_payload["sub"] == "keycloak-user-id-789"
            assert user_payload["email"] == "newuser@example.com"
            
            # Verify user was created in database
            from sqlalchemy import select
            result = await db_session.execute(
                select(User).where(User.keycloak_id == "keycloak-user-id-789")
            )
            user = result.scalar_one_or_none()
            
            assert user is not None
            assert user.email == "newuser@example.com"
            assert user.username == "newuser"
            assert user.display_name == "New User"
    
    @pytest.mark.asyncio
    async def test_get_current_user_updates_existing_user(self, db_session: AsyncSession, mock_jwt_payload):
        """Test that get_current_user updates existing user profile"""
        # Create an existing user
        existing_user = User(
            keycloak_id="keycloak-user-id-789",
            email="oldemail@example.com",
            username="oldusername",
            display_name="Old Name"
        )
        db_session.add(existing_user)
        await db_session.commit()
        
        # Mock Keycloak auth with updated payload
        updated_payload = mock_jwt_payload.copy()
        updated_payload["email"] = "updatedemail@example.com"
        updated_payload["preferred_username"] = "updatedusername"
        updated_payload["name"] = "Updated Name"
        
        with patch('app.core.auth.keycloak_auth.verify_token', return_value=updated_payload):
            credentials = MagicMock()
            credentials.credentials = "mock.jwt.token"
            
            user_payload = await get_current_user(
                credentials=credentials,
                db=db_session
            )
            
            # Verify user was updated
            from sqlalchemy import select
            result = await db_session.execute(
                select(User).where(User.keycloak_id == "keycloak-user-id-789")
            )
            user = result.scalar_one()
            
            assert user.email == "updatedemail@example.com"
            assert user.username == "updatedusername"
            assert user.display_name == "Updated Name"
    
    @pytest.mark.asyncio
    async def test_get_current_user_id_extracts_keycloak_id(self, mock_jwt_payload):
        """Test that get_current_user_id extracts the Keycloak user ID"""
        user_id = get_current_user_id(mock_jwt_payload)
        
        assert user_id == "keycloak-user-id-789"
    
    @pytest.mark.asyncio
    async def test_authentication_without_token_fails(self, db_session: AsyncSession):
        """Test that authentication fails without a token"""
        with pytest.raises(Exception):  # HTTPBearer will raise if no token
            await get_current_user(
                credentials=None,
                db=db_session
            )
    
    @pytest.mark.asyncio
    async def test_authentication_with_invalid_token_fails(self, db_session: AsyncSession):
        """Test that authentication fails with invalid token"""
        with patch('app.core.auth.keycloak_auth.verify_token', side_effect=HTTPException(status_code=401)):
            credentials = MagicMock()
            credentials.credentials = "invalid.jwt.token"
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(
                    credentials=credentials,
                    db=db_session
                )
            
            assert exc_info.value.status_code == 401


class TestStaffAuthentication:
    """Test staff/admin role authentication"""
    
    @pytest.mark.asyncio
    async def test_staff_user_has_proper_roles(self, db_session: AsyncSession):
        """Test that staff users have the staff role in database"""
        # Create a staff user
        staff_user = User(
            keycloak_id="staff-keycloak-id",
            email="staff@workshelf.dev",
            username="staffuser",
            display_name="Staff User",
            is_staff=True
        )
        db_session.add(staff_user)
        await db_session.commit()
        
        # Verify staff flag
        from sqlalchemy import select
        result = await db_session.execute(
            select(User).where(User.keycloak_id == "staff-keycloak-id")
        )
        user = result.scalar_one()
        
        assert user.is_staff is True
    
    @pytest.mark.asyncio
    async def test_regular_user_is_not_staff(self, db_session: AsyncSession, mock_jwt_payload):
        """Test that regular users are not staff"""
        with patch('app.core.auth.keycloak_auth.verify_token', return_value=mock_jwt_payload):
            credentials = MagicMock()
            credentials.credentials = "mock.jwt.token"
            
            await get_current_user(credentials=credentials, db=db_session)
            
            # Verify user is not staff
            from sqlalchemy import select
            result = await db_session.execute(
                select(User).where(User.keycloak_id == "keycloak-user-id-789")
            )
            user = result.scalar_one()
            
            assert user.is_staff is False or user.is_staff is None


@pytest.mark.integration
class TestKeycloakIntegration:
    """
    Integration tests for Keycloak (requires running Keycloak instance)
    These tests are marked as 'integration' and can be run separately
    """
    
    @pytest.mark.skip(reason="Requires running Keycloak instance")
    @pytest.mark.asyncio
    async def test_real_keycloak_connection(self):
        """Test actual connection to Keycloak JWKS endpoint"""
        keycloak_auth = KeycloakAuth()
        
        # This would make a real HTTP request to Keycloak
        jwks = await keycloak_auth.get_jwks()
        
        assert "keys" in jwks
        assert len(jwks["keys"]) > 0
        assert jwks["keys"][0]["kty"] == "RSA"
    
    @pytest.mark.skip(reason="Requires test Keycloak user and token")
    @pytest.mark.asyncio
    async def test_real_token_verification(self):
        """Test verification of a real Keycloak token"""
        # In a real integration test, you would:
        # 1. Login to Keycloak with test credentials
        # 2. Get an access token
        # 3. Verify it using KeycloakAuth
        # 4. Assert the payload is correct
        pass
