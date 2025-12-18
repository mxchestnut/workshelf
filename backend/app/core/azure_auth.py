"""
Microsoft Entra ID (Azure AD) Authentication for FastAPI
Handles JWT token validation from Microsoft identity platform
"""
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from sqlalchemy import select

# HTTP Bearer token scheme
security = HTTPBearer()


class EntraIDAuth:
    """Microsoft Entra ID (Azure AD) authentication handler"""
    
    def __init__(self):
        self.tenant_id = settings.AZURE_TENANT
        self.client_id = settings.AZURE_CLIENT_ID
        self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
        self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
        self._jwks_client: Optional[PyJWKClient] = None
    
    @property
    def jwks_client(self) -> PyJWKClient:
        """Get or create JWKS client for fetching public keys"""
        if not self._jwks_client:
            self._jwks_client = PyJWKClient(self.jwks_uri)
        return self._jwks_client
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode Microsoft Entra ID JWT token
        
        Args:
            token: JWT access token from Microsoft identity platform
            
        Returns:
            Decoded token payload containing user information
            
        Raises:
            HTTPException: If token is invalid, expired, or missing required claims
        """
        try:
            # Get the signing key from Microsoft's JWKS endpoint
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            
            # Verify and decode the token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.client_id,  # Verify token is for our app
                issuer=self.issuer,  # Verify token is from Microsoft
            )
            
            # Validate required claims
            if not payload.get("sub"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing 'sub' claim (user ID)"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error verifying token: {str(e)}"
            )
    
    async def get_or_create_user(
        self, 
        token_payload: Dict[str, Any],
        db: AsyncSession
    ) -> User:
        """
        Get existing user or create new user from Microsoft Entra ID token
        
        Args:
            token_payload: Decoded JWT token payload
            db: Database session
            
        Returns:
            User object
        """
        # Extract user info from token
        azure_object_id = token_payload.get("sub")  # Unique user ID
        email = token_payload.get("email") or token_payload.get("preferred_username")
        name = token_payload.get("name", "")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token missing email claim"
            )
        
        # Try to find existing user by Azure object ID or email
        result = await db.execute(
            select(User).where(
                (User.azure_object_id == azure_object_id) | (User.email == email)
            )
        )
        user = result.scalars().first()
        
        if user:
            # Update Azure object ID if not set
            if not user.azure_object_id:
                user.azure_object_id = azure_object_id
                await db.commit()
                await db.refresh(user)
            return user
        
        # Create new user
        # Parse name into first/last
        name_parts = name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        new_user = User(
            email=email,
            username=email.split("@")[0],  # Use email prefix as username
            first_name=first_name,
            last_name=last_name,
            azure_object_id=azure_object_id,
            is_active=True,
            email_verified=True,  # Microsoft already verified the email
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return new_user


# Initialize the auth handler
entra_auth = EntraIDAuth()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from Microsoft Entra ID token
    
    Usage:
        @app.get("/api/v1/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    token = credentials.credentials
    
    # Verify the token with Microsoft
    token_payload = await entra_auth.verify_token(token)
    
    # Get or create user in our database
    user = await entra_auth.get_or_create_user(token_payload, db)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_user_id(
    current_user: User = Depends(get_current_user)
) -> int:
    """
    Dependency to get just the current user's ID
    
    Usage:
        @app.get("/api/v1/something")
        async def something(user_id: int = Depends(get_current_user_id)):
            ...
    """
    return current_user.id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional user dependency - returns None if no auth token provided
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        token_payload = await entra_auth.verify_token(token)
        user = await entra_auth.get_or_create_user(token_payload, db)
        return user if user.is_active else None
    except Exception:
        return None


async def get_current_user_from_db(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Same as get_current_user but ensures database session is provided
    """
    return await get_current_user(credentials, db)


async def get_optional_user_from_db(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Same as get_optional_user but ensures database session is provided
    """
    return await get_optional_user(credentials, db)


async def require_staff(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires the user to be staff
    """
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_staff_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify they are staff
    """
    if not current_user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    return current_user
