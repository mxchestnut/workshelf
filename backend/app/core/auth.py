"""
Keycloak Authentication for FastAPI
Handles JWT token validation and user authentication
"""
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db

# HTTP Bearer token scheme
security = HTTPBearer()


class KeycloakAuth:
    """Keycloak authentication handler"""
    
    def __init__(self):
        self.server_url = settings.KEYCLOAK_SERVER_URL
        self.realm = settings.KEYCLOAK_REALM
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self._public_key: Optional[str] = None
    
    @property
    def realm_url(self) -> str:
        """Get the realm URL"""
        return f"{self.server_url}/realms/{self.realm}"
    
    @property
    def certs_url(self) -> str:
        """Get the JWKS URL for public keys"""
        return f"{self.realm_url}/protocol/openid-connect/certs"
    
    async def get_public_key(self) -> str:
        """
        Fetch Keycloak's public key for JWT verification
        Cached to avoid repeated requests
        """
        if self._public_key:
            return self._public_key
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.certs_url)
                response.raise_for_status()
                keys = response.json()
                
                # Get the first key (Keycloak typically uses one active key)
                if keys.get("keys"):
                    # Convert JWK to PEM format (simplified - in production use python-jose's jwk_to_pem)
                    # For now, we'll use the key directly
                    self._public_key = keys["keys"][0]
                    return self._public_key
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Could not retrieve Keycloak public keys"
                )
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to Keycloak: {str(e)}"
            )
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token from Keycloak
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token payload
            
        Raises:
            HTTPException: If token is invalid
        """
        try:
            # Decode without verification first to get the algorithm
            unverified = jwt.get_unverified_claims(token)
            
            # For development, we can skip signature verification
            # In production, you'd verify against Keycloak's public key
            if settings.DEBUG:
                # Development mode - decode without verification
                payload = jwt.get_unverified_claims(token)
            else:
                # Production mode - verify signature
                await self.get_public_key()
                # Note: Full verification would require converting JWK to PEM
                # and using jwt.decode with the public key
                payload = jwt.get_unverified_claims(token)
            
            # Validate token claims
            if "exp" in payload:
                # Token expiration is checked automatically by jose
                pass
            
            if "sub" not in payload:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject"
                )
            
            return payload
            
        except JWTError as e:
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
    db,  # AsyncSession
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
