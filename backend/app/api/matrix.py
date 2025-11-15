"""
Matrix Integration API
Manages Matrix homeserver accounts and credentials for users
Enables messaging via Matrix protocol with Element app compatibility
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import requests
import secrets
import string
import os
import hmac
import hashlib
from app.core.database import get_db
from app.services.auth import get_current_user

router = APIRouter(prefix="/matrix", tags=["matrix"])

# Configuration - set these in environment variables
MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev")
MATRIX_SHARED_SECRET = os.getenv("MATRIX_REGISTRATION_SHARED_SECRET")

def generate_secure_password(length: int = 32) -> str:
    """Generate a cryptographically secure random password"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_mac(shared_secret: str, nonce: str, user: str, password: str, admin: bool = False) -> str:
    """
    Generate HMAC for shared secret registration
    Used for registering users on self-hosted Synapse with shared secret
    """
    mac_input = f"{nonce}\x00{user}\x00{password}\x00{'admin' if admin else 'notadmin'}"
    return hmac.new(
        shared_secret.encode('utf-8'),
        mac_input.encode('utf-8'),
        hashlib.sha1
    ).hexdigest()


@router.post("/register")
async def register_matrix_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new Matrix account for the Work Shelf user
    Called automatically when user first accesses messaging
    Uses shared secret registration for self-hosted Synapse
    """
    try:
        # Generate Matrix username from Work Shelf user ID
        matrix_username = f"workshelf_user_{current_user['id']}"
        matrix_password = generate_secure_password()
        
        # Use shared secret registration if available (self-hosted)
        if MATRIX_SHARED_SECRET:
            # Generate nonce for shared secret auth
            nonce = secrets.token_urlsafe(16)
            mac = generate_mac(MATRIX_SHARED_SECRET, nonce, matrix_username, matrix_password, admin=False)
            
            response = requests.post(
                f"{MATRIX_HOMESERVER}/_synapse/admin/v1/register",
                json={
                    "nonce": nonce,
                    "username": matrix_username,
                    "password": matrix_password,
                    "admin": False,
                    "mac": mac
                },
                headers={
                    "Content-Type": "application/json"
                }
            )
        else:
            # Fallback to standard registration (public homeserver)
            response = requests.post(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/register",
                json={
                    "username": matrix_username,
                    "password": matrix_password,
                    "auth": {"type": "m.login.dummy"},
                    "inhibit_login": False
                },
                headers={
                    "Content-Type": "application/json"
                }
            )
        
        if response.status_code == 400:
            error_data = response.json()
            if error_data.get("errcode") == "M_USER_IN_USE":
                # User already exists, try to login instead
                return await login_existing_matrix_user(
                    current_user, 
                    matrix_username, 
                    matrix_password,
                    db
                )
            raise HTTPException(
                status_code=400,
                detail=f"Matrix registration failed: {error_data.get('error', 'Unknown error')}"
            )
        
        response.raise_for_status()
        matrix_data = response.json()
        
        # Store Matrix credentials in database
        await db.execute(
            """
            UPDATE users 
            SET 
                matrix_user_id = :user_id,
                matrix_access_token = :token,
                matrix_homeserver = :homeserver
            WHERE id = :id
            """,
            {
                "user_id": matrix_data["user_id"],
                "token": matrix_data["access_token"],
                "homeserver": MATRIX_HOMESERVER,
                "id": current_user["id"]
            }
        )
        await db.commit()
        
        return {
            "matrix_user_id": matrix_data["user_id"],
            "matrix_access_token": matrix_data["access_token"],
            "homeserver": MATRIX_HOMESERVER
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with Matrix homeserver: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Matrix registration error: {str(e)}"
        )


async def login_existing_matrix_user(
    current_user: Dict[str, Any],
    username: str,
    password: str,
    db: AsyncSession
):
    """Helper to login an existing Matrix user"""
    try:
        response = requests.post(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/login",
            json={
                "type": "m.login.password",
                "identifier": {
                    "type": "m.id.user",
                    "user": username
                },
                "password": password
            }
        )
        response.raise_for_status()
        matrix_data = response.json()
        
        # Update database with new token
        await db.execute(
            """
            UPDATE users 
            SET 
                matrix_user_id = :user_id,
                matrix_access_token = :token,
                matrix_homeserver = :homeserver
            WHERE id = :id
            """,
            {
                "user_id": matrix_data["user_id"],
                "token": matrix_data["access_token"],
                "homeserver": MATRIX_HOMESERVER,
                "id": current_user["id"]
            }
        )
        await db.commit()
        
        return {
            "matrix_user_id": matrix_data["user_id"],
            "matrix_access_token": matrix_data["access_token"],
            "homeserver": MATRIX_HOMESERVER
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Matrix login failed: {str(e)}"
        )


@router.get("/credentials")
async def get_matrix_credentials(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's Matrix credentials for client login
    Auto-registers if user doesn't have Matrix account yet
    """
    try:
        # Check if user already has Matrix credentials
        result = await db.execute(
            """
            SELECT matrix_user_id, matrix_access_token, matrix_homeserver 
            FROM users 
            WHERE id = :id
            """,
            {"id": current_user["id"]}
        )
        user_data = result.fetchone()
        
        if not user_data or not user_data[0]:  # matrix_user_id is None
            # Auto-register user
            return await register_matrix_user(current_user, db)
        
        return {
            "matrix_user_id": user_data[0],
            "matrix_access_token": user_data[1],
            "homeserver": user_data[2] or MATRIX_HOMESERVER
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Matrix credentials: {str(e)}"
        )


@router.post("/lookup-user")
async def lookup_user_matrix_id(
    work_shelf_user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Look up another Work Shelf user's Matrix ID
    Used when initiating a direct message
    """
    try:
        result = await db.execute(
            """
            SELECT matrix_user_id, username, display_name
            FROM users 
            WHERE id = :id
            """,
            {"id": work_shelf_user_id}
        )
        user_data = result.fetchone()
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not user_data[0]:  # matrix_user_id is None
            raise HTTPException(
                status_code=404, 
                detail="User has not set up messaging yet"
            )
        
        return {
            "matrix_user_id": user_data[0],
            "username": user_data[1],
            "display_name": user_data[2]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to lookup user: {str(e)}"
        )


@router.post("/create-room")
async def create_direct_message_room(
    target_user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a direct message room between two Work Shelf users
    Alternative to client-side room creation
    """
    try:
        # Get current user's Matrix credentials
        credentials_result = await db.execute(
            """
            SELECT matrix_user_id, matrix_access_token
            FROM users 
            WHERE id = :id
            """,
            {"id": current_user["id"]}
        )
        credentials = credentials_result.fetchone()
        
        if not credentials or not credentials[0]:
            raise HTTPException(
                status_code=400,
                detail="You must set up messaging first"
            )
        
        # Get target user's Matrix ID
        target_result = await db.execute(
            """
            SELECT matrix_user_id
            FROM users 
            WHERE id = :id
            """,
            {"id": target_user_id}
        )
        target = target_result.fetchone()
        
        if not target or not target[0]:
            raise HTTPException(
                status_code=404,
                detail="Target user has not set up messaging"
            )
        
        # Create Matrix room
        response = requests.post(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/createRoom",
            headers={
                "Authorization": f"Bearer {credentials[1]}",
                "Content-Type": "application/json"
            },
            json={
                "preset": "trusted_private_chat",
                "is_direct": True,
                "invite": [target[0]],
                "visibility": "private"
            }
        )
        response.raise_for_status()
        
        return response.json()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create room: {str(e)}"
        )
