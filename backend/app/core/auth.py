"""
Keycloak Authentication for FastAPI
Handles JWT token validation and user authentication
"""
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.backends import RSAKey
import httpx
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
import json

# HTTP Bearer token scheme
security = HTTPBearer()


class KeycloakAuth:
    """Keycloak authentication handler"""
    
    def __init__(self):
        self.server_url = settings.KEYCLOAK_SERVER_URL
        # Use internal URL if provided (for ECS to bypass SSL/DNS issues)
        self.internal_url = settings.KEYCLOAK_INTERNAL_URL or settings.KEYCLOAK_SERVER_URL
        self.realm = settings.KEYCLOAK_REALM
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self._jwks: Optional[Dict] = None
    
    @property
    def realm_url(self) -> str:
        """Get the realm URL (public-facing for token issuer)"""
        return f"{self.server_url}/realms/{self.realm}"
    
    @property
    def internal_realm_url(self) -> str:
        """Get the internal realm URL (for actual connections)"""
        return f"{self.internal_url}/realms/{self.realm}"
    
    @property
    def certs_url(self) -> str:
        """Get the JWKS URL for public keys (use internal URL)"""
        return f"{self.internal_realm_url}/protocol/openid-connect/certs"
    
    @property
    def issuer(self) -> str:
        """Get the expected token issuer"""
        return self.realm_url
    
    async def get_jwks(self) -> Dict:
        """
        Fetch Keycloak's JWKS (JSON Web Key Set) for JWT verification
        Cached to avoid repeated requests
        """
        if self._jwks:
            return self._jwks
        
        try:
            async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
                response = await client.get(self.certs_url)
                response.raise_for_status()
                self._jwks = response.json()
                return self._jwks
                
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to Keycloak: {str(e)}"
            )
    
    def clear_jwks_cache(self):
        """Clear the cached JWKS (useful when keys are rotated)"""
        self._jwks = None
    
    def get_signing_key(self, token: str, jwks: Dict) -> str:
        """
        Get the public key from JWKS that matches the token's kid (key ID)
        
        Args:
            token: JWT token string
            jwks: JSON Web Key Set from Keycloak
            
        Returns:
            Public key in PEM format
        """
        try:
            # Get the key ID from token header
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing 'kid' in header"
                )
            
            # Find the matching key in JWKS
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    # Convert JWK to RSA public key using python-jose
                    public_key = RSAKey(key, algorithm='RS256')
                    # Return the key in PEM format
                    return public_key.to_pem().decode('utf-8')
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unable to find matching key for kid: {kid}"
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Error processing token key: {str(e)}"
            )
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token from Keycloak with full signature verification
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid
        """
        try:
            # Get JWKS from Keycloak
            jwks = await self.get_jwks()
            
            # Get the public key for this specific token
            public_key = self.get_signing_key(token, jwks)
            
            # Debug: check token issuer
            unverified_claims = jwt.get_unverified_claims(token)
            token_issuer = unverified_claims.get("iss")
            print(f"[AUTH DEBUG] Token issuer: {token_issuer}")
            print(f"[AUTH DEBUG] Expected issuer: {self.issuer}")
            
            # Verify and decode the token with full validation
            # Note: We don't verify audience because Keycloak tokens typically have
            # aud set to the requesting client (frontend), not the API.
            # Security is still strong via signature + issuer verification.
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                issuer=self.issuer,  # Verify issuer matches our realm
                options={
                    "verify_signature": True,
                    "verify_exp": True,  # Verify expiration
                    "verify_aud": False,  # Don't verify audience (Keycloak quirk)
                    "verify_iss": True,  # Verify issuer
                }
            )
            
            # Additional validation
            if "sub" not in payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTClaimsError as e:
            print(f"[AUTH ERROR] JWT Claims Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token claims: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError as e:
            print(f"[AUTH ERROR] JWT Error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )


# Singleton instance
keycloak_auth = KeycloakAuth()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency to get the current authenticated user
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user["sub"]}
    
    Returns:
        Decoded JWT payload with user information
    """
    token = credentials.credentials
    return await keycloak_auth.verify_token(token)


async def get_current_user_id(
    user: Dict[str, Any] = Depends(get_current_user)
) -> str:
    """
    Get just the user ID (Keycloak subject)
    
    Returns:
        User's Keycloak ID (sub claim)
    """
    return user["sub"]


async def get_current_tenant(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> int:
    """
    Get the tenant ID for the current authenticated user
    
    Args:
        current_user: Decoded JWT payload
        db: Database session
        
    Returns:
        Tenant ID
        
    Raises:
        HTTPException: If user not found or has no tenant
    """
    from sqlalchemy import select
    from app.models.user import User
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.keycloak_id == current_user["sub"])
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no associated tenant"
        )
    
    return user.tenant_id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Get current user if authenticated, None otherwise
    Useful for endpoints that work with or without authentication
    
    Returns:
        User payload or None
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        return await keycloak_auth.verify_token(token)
    except HTTPException:
        return None


class RequirePermission:
    """
    Dependency to require specific permissions
    
    Usage:
        @app.get("/admin")
        async def admin_route(user = Depends(RequirePermission("admin"))):
            return {"message": "Admin access"}
    """
    
    def __init__(self, permission: str):
        self.permission = permission
    
    async def __call__(
        self,
        user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """Check if user has required permission"""
        # Check realm roles
        realm_roles = user.get("realm_access", {}).get("roles", [])
        if self.permission in realm_roles:
            return user
        
        # Check client roles
        resource_access = user.get("resource_access", {})
        for client, access in resource_access.items():
            if self.permission in access.get("roles", []):
                return user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: requires '{self.permission}'"
        )


class RequireRole:
    """
    Dependency to require specific role
    
    Usage:
        @app.get("/admin")
        async def admin_route(user = Depends(RequireRole("admin"))):
            return {"message": "Admin access"}
    """
    
    def __init__(self, role: str):
        self.role = role
    
    async def __call__(
        self,
        user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        """Check if user has required role"""
        # Check realm roles
        realm_roles = user.get("realm_access", {}).get("roles", [])
        if self.role in realm_roles:
            return user
        
        # Check client roles
        resource_access = user.get("resource_access", {})
        for client, access in resource_access.items():
            if self.role in access.get("roles", []):
                return user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: requires role '{self.role}'"
        )


async def get_current_user_from_db(
    db: AsyncSession = Depends(get_db),
    user_payload: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get the full User model from database based on Keycloak token
    
    Returns:
        User model instance
    """
    from app.models.user import User
    from sqlalchemy import select
    
    keycloak_id = user_payload["sub"]
    
    result = await db.execute(
        select(User).filter(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database"
        )
    
    return user


async def get_optional_user_from_db(
    db: AsyncSession = Depends(get_db),
    user_payload: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """
    Get the full User model from database if authenticated, None otherwise
    
    Returns:
        User model instance or None
    """
    if not user_payload:
        return None
    
    from app.models.user import User
    from sqlalchemy import select
    
    keycloak_id = user_payload["sub"]
    
    result = await db.execute(
        select(User).filter(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    return user


async def require_staff(
    user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Require user to be platform staff (is_staff=True)
    
    Returns:
        User model instance if user is staff
    """
    from app.models.user import User
    from sqlalchemy import select
    
    keycloak_id = user["sub"]
    
    result = await db.execute(
        select(User).filter(User.keycloak_id == keycloak_id)
    )
    db_user = result.scalar_one_or_none()
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not db_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform staff access required"
        )
    
    return db_user
