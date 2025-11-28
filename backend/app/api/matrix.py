"""
Matrix Integration API
Manages Matrix homeserver accounts and credentials for users
Enables messaging via Matrix protocol with Element app compatibility
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any, Optional
import requests
import time
import secrets
import string
import os
import hmac
import hashlib
from app.core.database import get_db
from app.core.auth import get_current_user_from_db
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from functools import lru_cache

router = APIRouter(prefix="/matrix", tags=["matrix"])

# Configuration - set these in environment variables
MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev")
MATRIX_SERVER_NAME = os.getenv("MATRIX_SERVER_NAME", "workshelf.dev")
MATRIX_PUBLIC_HOMESERVER = os.getenv("MATRIX_PUBLIC_HOMESERVER", "https://workshelf.dev")
MATRIX_SHARED_SECRET = os.getenv("MATRIX_REGISTRATION_SHARED_SECRET")
MATRIX_ADMIN_ACCESS_TOKEN = os.getenv("MATRIX_ADMIN_ACCESS_TOKEN")
MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME = os.getenv("MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME", "workshelf/matrix-admin-access-token")

@lru_cache(maxsize=1)
def _load_admin_token_from_secret() -> Optional[str]:
    """Attempt to load Matrix admin token from AWS Secrets Manager once and cache it."""
    # If env var is set, prefer it
    if MATRIX_ADMIN_ACCESS_TOKEN:
        return MATRIX_ADMIN_ACCESS_TOKEN
    try:
        sm = boto3.client("secretsmanager")
        resp = sm.get_secret_value(SecretId=MATRIX_ADMIN_ACCESS_TOKEN_SECRET_NAME)
        secret = resp.get("SecretString")
        return secret
    except (BotoCoreError, ClientError, Exception):
        return None

def get_admin_access_token() -> Optional[str]:
    """Get Matrix admin token from env or Secrets Manager (cached)."""
    token = MATRIX_ADMIN_ACCESS_TOKEN or _load_admin_token_from_secret()
    return token

def generate_secure_password(length: int = 40) -> str:
    """Generate a cryptographically secure random password (alphanumeric only for safety)"""
    alphabet = string.ascii_letters + string.digits
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Register a new Matrix account for the Work Shelf user
    Called automatically when user first accesses messaging
    Uses shared secret registration for self-hosted Synapse
    """
    try:
        # Generate Matrix username from Work Shelf username (or fallback to user ID)
        # Matrix usernames must be lowercase and can only contain: a-z, 0-9, ., _, =, -, /
        if current_user.username:
            # Use the user's chosen username (already validated during onboarding)
            matrix_username = current_user.username.lower()
        else:
            # Fallback for users who haven't completed onboarding yet
            matrix_username = f"user_{current_user.id}"
        
        matrix_password = generate_secure_password()
        
        # Use shared secret registration if available (self-hosted)
        print(f"[MATRIX REGISTER] Starting registration for WorkShelf user {current_user.id}")
        print(f"[MATRIX REGISTER] Using matrix_username={matrix_username}")
        if MATRIX_SHARED_SECRET:
            print("[MATRIX REGISTER] Shared secret present, using admin registration flow")
            # Fetch server-provided nonce (required for correct HMAC)
            try:
                t0 = time.time()
                nonce_resp = requests.get(
                    f"{MATRIX_HOMESERVER}/_synapse/admin/v1/register",
                    timeout=5
                )
                elapsed = (time.time() - t0) * 1000
                print(f"[MATRIX REGISTER] Nonce request status={nonce_resp.status_code} elapsed_ms={elapsed:.1f}")
                nonce_resp.raise_for_status()
                nonce = nonce_resp.json().get("nonce")
                if not nonce:
                    raise HTTPException(status_code=502, detail="Matrix homeserver did not return a registration nonce")
            except Exception as e:
                print(f"[MATRIX REGISTER ERROR] Nonce request failed: {e}")
                raise HTTPException(status_code=502, detail=f"Failed to get registration nonce from homeserver: {str(e)}")

            mac = generate_mac(MATRIX_SHARED_SECRET, nonce, matrix_username, matrix_password, admin=False)

            print("[MATRIX REGISTER] Sending shared-secret registration request")
            t1 = time.time()
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
                },
                timeout=10
            )
            reg_elapsed = (time.time() - t1) * 1000
            print(f"[MATRIX REGISTER] Registration HTTP status={response.status_code} elapsed_ms={reg_elapsed:.1f}")
        else:
            print("[MATRIX REGISTER] No shared secret found, falling back to public registration (may fail if disabled)")
            # Fallback to standard registration (public homeserver)
            t2 = time.time()
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
                },
                timeout=10
            )
            pub_elapsed = (time.time() - t2) * 1000
            print(f"[MATRIX REGISTER] Public registration HTTP status={response.status_code} elapsed_ms={pub_elapsed:.1f}")
        
        if response.status_code == 400:
            try:
                error_data = response.json()
            except Exception:
                error_data = {}
            errcode = error_data.get("errcode")
            print(f"[MATRIX REGISTER] 400 response errcode={errcode} body={response.text}")
            if errcode == "M_USER_IN_USE":
                # Existing Matrix account; attempt admin login to get fresh token
                matrix_user_id_full = f"@{matrix_username}:{MATRIX_SERVER_NAME}"
                admin_token = get_admin_access_token()
                if not admin_token:
                    raise HTTPException(status_code=409, detail="Matrix user exists but admin token unavailable for provisioning.")
                print(f"[MATRIX REGISTER] Attempting admin login for existing user {matrix_user_id_full}")
                t3 = time.time()
                login_resp = requests.post(
                    f"{MATRIX_HOMESERVER}/_synapse/admin/v1/users/{matrix_user_id_full}/login",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    timeout=10
                )
                login_elapsed = (time.time() - t3) * 1000
                print(f"[MATRIX REGISTER] Admin login status={login_resp.status_code} elapsed_ms={login_elapsed:.1f}")
                if login_resp.status_code != 200:
                    print(f"[MATRIX REGISTER ERROR] Admin login body={login_resp.text}")
                    raise HTTPException(status_code=500, detail="Admin login failed for existing Matrix user")
                token_payload = login_resp.json()
                access_token = token_payload.get("access_token")
                if not access_token:
                    raise HTTPException(status_code=500, detail="Admin login did not return access token")
                # Persist (do not overwrite password unless previously null)
                await db.execute(
                    text("""
                        UPDATE users SET 
                            matrix_user_id = :user_id,
                            matrix_access_token = :token,
                            matrix_homeserver = :homeserver,
                            matrix_password = COALESCE(matrix_password, :gen_password)
                        WHERE id = :id
                    """),
                    {
                        "user_id": matrix_user_id_full,
                        "token": access_token,
                        "homeserver": MATRIX_HOMESERVER,
                        "gen_password": matrix_password,
                        "id": current_user.id
                    }
                )
                await db.commit()
                print("[MATRIX REGISTER] Existing user provisioning committed")
                return {
                    "matrix_user_id": matrix_user_id_full,
                    "matrix_access_token": access_token,
                    "homeserver": MATRIX_PUBLIC_HOMESERVER
                }
            # Other 400
            raise HTTPException(status_code=400, detail=f"Matrix registration failed: {error_data.get('error','Unknown error')}")
        
        # Log raw response for diagnostics before status check
        print(f"[MATRIX REGISTER] Raw response status={response.status_code}")
        if response.status_code != 200:
            print(f"[MATRIX REGISTER ERROR] Non-200 body={response.text}")
            raise HTTPException(status_code=500, detail=f"Matrix registration HTTP error status={response.status_code}")
        try:
            matrix_data = response.json()
        except Exception as e:
            print(f"[MATRIX REGISTER ERROR] JSON parse failed: {e} body={response.text}")
            raise HTTPException(status_code=500, detail="Matrix registration returned invalid JSON")
        print(f"[MATRIX REGISTER] Registration success user_id={matrix_data.get('user_id')}")
        
        # Store Matrix credentials in database
        print("[MATRIX REGISTER] Persisting credentials & password to database")
        await db.execute(
            text("""
            UPDATE users 
            SET 
                matrix_user_id = :user_id,
                matrix_access_token = :token,
                matrix_homeserver = :homeserver,
                matrix_password = :password
            WHERE id = :id
            """),
            {
                "user_id": matrix_data["user_id"],
                "token": matrix_data["access_token"],
                "homeserver": MATRIX_HOMESERVER,
                "password": matrix_password,
                "id": current_user.id
            }
        )
        await db.commit()
        
        print("[MATRIX REGISTER] Completed & committed")
        return {
            "matrix_user_id": matrix_data["user_id"],
            "matrix_access_token": matrix_data["access_token"],
            "homeserver": MATRIX_PUBLIC_HOMESERVER
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
            text("""
            UPDATE users 
            SET 
                matrix_user_id = :user_id,
                matrix_access_token = :token,
                matrix_homeserver = :homeserver
            WHERE id = :id
            """),
            {
                "user_id": matrix_data["user_id"],
                "token": matrix_data["access_token"],
                "homeserver": MATRIX_HOMESERVER,
                "id": current_user.id
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Get user's Matrix credentials for client login
    Auto-registers if user doesn't have Matrix account yet
    Auto-refreshes token if expired using admin API
    """
    try:
        print(f"[MATRIX] Getting credentials for user {current_user.id}")
        # Check if user already has Matrix credentials
        result = await db.execute(
            text("""
            SELECT matrix_user_id, matrix_access_token, matrix_homeserver 
            FROM users 
            WHERE id = :id
            """),
            {"id": current_user.id}
        )
        user_data = result.fetchone()
        print(f"[MATRIX] User data: {user_data}")
        
        if not user_data or not user_data[0]:  # matrix_user_id is None
            print(f"[MATRIX] No Matrix credentials found, auto-registering user")
            # Auto-register user
            return await register_matrix_user(db, current_user)
        
        # Verify token is still valid
        matrix_user_id = user_data[0]
        matrix_token = user_data[1]
        
        try:
            verify_response = requests.get(
                f"{MATRIX_HOMESERVER}/_matrix/client/v3/account/whoami",
                headers={"Authorization": f"Bearer {matrix_token}"},
                timeout=5
            )
            if verify_response.status_code == 200:
                print(f"[MATRIX] Token valid, returning existing credentials")
                return {
                    "matrix_user_id": matrix_user_id,
                    "matrix_access_token": matrix_token,
                    "homeserver": MATRIX_PUBLIC_HOMESERVER
                }
        except Exception as e:
            print(f"[MATRIX] Token verification failed: {e}")
        
        # Token is invalid - need to login again
        print(f"[MATRIX] Token invalid, need to re-login user")
        
        # Check if we have the password stored
        result = await db.execute(
            text("""
            SELECT matrix_password 
            FROM users 
            WHERE id = :id
            """),
            {"id": current_user.id}
        )
        password_data = result.fetchone()
        
        if not password_data or not password_data[0]:
            # No password stored - user was created with old system
            # Try to use admin API (will fail for admin users, but worth trying)
            admin_token = get_admin_access_token()
            if admin_token:
                try:
                    login_response = requests.post(
                        f"{MATRIX_HOMESERVER}/_synapse/admin/v1/users/{matrix_user_id}/login",
                        headers={
                            "Authorization": f"Bearer {admin_token}",
                            "Content-Type": "application/json"
                        },
                        json={},
                        timeout=10
                    )
                    
                    if login_response.status_code == 200:
                        new_token_data = login_response.json()
                        new_token = new_token_data.get("access_token")
                        
                        if new_token:
                            # Update database with new token
                            await db.execute(
                                text("UPDATE users SET matrix_access_token = :token WHERE id = :id"),
                                {"token": new_token, "id": current_user.id}
                            )
                            await db.commit()
                            
                            print(f"[MATRIX] Token refreshed via admin API")
                            return {
                                "matrix_user_id": matrix_user_id,
                                "matrix_access_token": new_token,
                                "homeserver": MATRIX_PUBLIC_HOMESERVER
                            }
                except Exception as e:
                    print(f"[MATRIX] Admin API login failed: {e}")
            
            # If admin API fails or not available, user needs to set password manually
            raise HTTPException(
                status_code=401,
                detail="Matrix credentials expired and no password stored. Please set Matrix password in profile."
            )
        
        # We have password - do normal login
        matrix_password = password_data[0]
        username_only = matrix_user_id.split(':')[0].lstrip('@')
        
        try:
            login_response = requests.post(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/login",
                json={
                    "type": "m.login.password",
                    "identifier": {
                        "type": "m.id.user",
                        "user": username_only
                    },
                    "password": matrix_password
                },
                timeout=10
            )
            
            if login_response.status_code != 200:
                error_detail = login_response.text
                print(f"[MATRIX ERROR] Login failed: {error_detail}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to refresh Matrix token: {error_detail}"
                )
            
            new_token_data = login_response.json()
            new_token = new_token_data.get("access_token")
            
            if not new_token:
                raise HTTPException(
                    status_code=500,
                    detail="Matrix login did not return access token"
                )
            
            # Update database with new token
            await db.execute(
                text("UPDATE users SET matrix_access_token = :token WHERE id = :id"),
                {"token": new_token, "id": current_user.id}
            )
            await db.commit()
            
            print(f"[MATRIX] Token refreshed via password login")
            return {
                "matrix_user_id": matrix_user_id,
                "matrix_access_token": new_token,
                "homeserver": MATRIX_PUBLIC_HOMESERVER
            }
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"[MATRIX ERROR] Exception during login: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Matrix login error: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[MATRIX ERROR] Exception in get_matrix_credentials: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Matrix credentials: {str(e)}"
        )


@router.post("/lookup-user")
async def lookup_user_matrix_id(
    work_shelf_user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Look up another Work Shelf user's Matrix ID
    Used when initiating a direct message
    """
    try:
        result = await db.execute(
            text("""
            SELECT matrix_user_id, username, display_name
            FROM users 
            WHERE id = :id
            """),
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Create a direct message room between two Work Shelf users
    Alternative to client-side room creation
    """
    try:
        # Get current user's Matrix credentials
        credentials_result = await db.execute(
            text("""
            SELECT matrix_user_id, matrix_access_token
            FROM users 
            WHERE id = :id
            """),
            {"id": current_user.id}
        )
        credentials = credentials_result.fetchone()
        
        if not credentials or not credentials[0]:
            raise HTTPException(
                status_code=400,
                detail="You must set up messaging first"
            )
        
        # Get target user's Matrix ID
        target_result = await db.execute(
            text("""
            SELECT matrix_user_id
            FROM users 
            WHERE id = :id
            """),
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


class SetMatrixPasswordRequest(BaseModel):
    password: str = Field(min_length=8, description="New Matrix password")


@router.post("/set-password")
async def set_matrix_password(
    payload: SetMatrixPasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Set or reset the user's Matrix account password so they can sign into Element.
    Requires MATRIX_ADMIN_ACCESS_TOKEN to be configured on the backend.
    If the user does not yet have a Matrix account, this will auto-register it first.
    """
    admin_token = get_admin_access_token()
    if not admin_token:
        raise HTTPException(
            status_code=501,
            detail="Matrix admin access token not configured on server"
        )

    try:
        # Ensure the user has Matrix credentials
        result = await db.execute(
            text(
                """
                SELECT matrix_user_id
                FROM users
                WHERE id = :id
                """
            ),
            {"id": current_user.id}
        )
        row = result.fetchone()

        matrix_user_id = row[0] if row else None
        if not matrix_user_id:
            creds = await register_matrix_user(db, current_user)
            matrix_user_id = creds["matrix_user_id"]

        # Synapse admin API: set password
        # Endpoint: PUT /_synapse/admin/v2/users/{userId}/password
        # userId must be URL-escaped
        from urllib.parse import quote
        user_path = quote(matrix_user_id, safe='')

        resp = requests.put(
            f"{MATRIX_HOMESERVER}/_synapse/admin/v2/users/{user_path}/password",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json",
            },
            json={
                "password": payload.password,
                "logout_devices": False
            },
            timeout=15
        )

        if not resp.ok:
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=f"Synapse password set failed: {err.get('error')}")

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set Matrix password: {str(e)}")


@router.post("/create-space")
async def create_matrix_space(
    name: str,
    topic: str = "",
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Create a Matrix Space (like a Discord server) for a group or community.
    Returns the Space ID so it can be stored and linked to the Work Shelf group.
    """
    try:
        # Ensure the user has Matrix credentials
        result = await db.execute(
            text(
                """
                SELECT matrix_user_id, matrix_access_token
                FROM users
                WHERE id = :id
                """
            ),
            {"id": current_user.id}
        )
        row = result.fetchone()

        if not row or not row[0]:
            creds = await register_matrix_user(db, current_user)
            matrix_user_id = creds["matrix_user_id"]
            matrix_access_token = creds["matrix_access_token"]
        else:
            matrix_user_id = row[0]
            matrix_access_token = row[1]

        # Create a Space using the Matrix client API
        # A Space is a room with type "m.space"
        resp = requests.post(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/createRoom",
            headers={
                "Authorization": f"Bearer {matrix_access_token}",
                "Content-Type": "application/json",
            },
            json={
                "name": name,
                "topic": topic,
                "preset": "public_chat",  # or "private_chat" for private groups
                "creation_content": {
                    "type": "m.space"
                },
                "initial_state": [
                    {
                        "type": "m.room.guest_access",
                        "state_key": "",
                        "content": {"guest_access": "can_join"}
                    },
                    {
                        "type": "m.room.history_visibility",
                        "state_key": "",
                        "content": {"history_visibility": "world_readable"}
                    }
                ],
                "power_level_content_override": {
                    "events": {
                        "m.space.child": 50  # Allow moderators to add rooms to Space
                    }
                }
            },
            timeout=15
        )

        if not resp.ok:
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to create Space: {err.get('error', resp.text)}")

        data = resp.json()
        space_id = data.get("room_id")

        return {"space_id": space_id, "creator": matrix_user_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Matrix Space: {str(e)}")


@router.post("/add-room-to-space")
async def add_room_to_space(
    space_id: str,
    room_id: str,
    suggested: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Add a room to a Space (creates parent-child relationship).
    This makes the room visible in the Space directory.
    """
    try:
        # Get user's Matrix credentials
        result = await db.execute(
            text(
                """
                SELECT matrix_access_token
                FROM users
                WHERE id = :id
                """
            ),
            {"id": current_user.id}
        )
        row = result.fetchone()
        if not row or not row[0]:
            raise HTTPException(status_code=400, detail="User does not have Matrix credentials")

        matrix_access_token = row[0]

        # Send m.space.child state event to the Space
        # This establishes the parent-child relationship
        resp = requests.put(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/rooms/{space_id}/state/m.space.child/{room_id}",
            headers={
                "Authorization": f"Bearer {matrix_access_token}",
                "Content-Type": "application/json",
            },
            json={
                "via": [MATRIX_HOMESERVER.replace("https://", "").replace("http://", "")],
                "suggested": suggested
            },
            timeout=15
        )

        if not resp.ok:
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to add room to Space: {err.get('error', resp.text)}")

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add room to Space: {str(e)}")


class CreateRoomRequest(BaseModel):
    group_id: int = Field(..., description="ID of the group")
    room_name: str = Field(..., description="Name of the room (e.g., 'General', 'Writing Tips')")
    room_topic: str = Field(default="", description="Optional topic/description for the room")


@router.post("/create-room-in-space")
async def create_room_in_space(
    request: CreateRoomRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user_from_db)
):
    """
    Create a new room within a group's Matrix Space.
    Only group owners and admins can create rooms.
    """
    try:
        # Check if user is admin/owner of the group
        result = await db.execute(
            text("""
                SELECT gm.role, g.matrix_space_id, g.name
                FROM group_members gm
                JOIN groups g ON g.id = gm.group_id
                WHERE gm.group_id = :group_id AND gm.user_id = :user_id
            """),
            {"group_id": request.group_id, "user_id": current_user.id}
        )
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=403, detail="You are not a member of this group")
        
        role, space_id, group_name = row[0], row[1], row[2]
        
        if role not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only group owners and admins can create rooms")
        
        if not space_id:
            raise HTTPException(status_code=400, detail="This group does not have a Matrix Space")
        
        # Get user's Matrix credentials
        result = await db.execute(
            text("SELECT matrix_access_token FROM users WHERE id = :id"),
            {"id": current_user.id}
        )
        row = result.fetchone()
        if not row or not row[0]:
            raise HTTPException(status_code=400, detail="User does not have Matrix credentials")
        
        matrix_access_token = row[0]
        
        # Create the room
        room_data = {
            "name": request.room_name,
            "topic": request.room_topic or f"Discussion room in {group_name}",
            "preset": "public_chat",
            "visibility": "private",
            "room_version": "10",
            "initial_state": [
                {
                    "type": "m.room.guest_access",
                    "state_key": "",
                    "content": {"guest_access": "can_join"}
                },
                {
                    "type": "m.room.history_visibility",
                    "state_key": "",
                    "content": {"history_visibility": "shared"}
                }
            ]
        }
        
        resp = requests.post(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/createRoom",
            headers={
                "Authorization": f"Bearer {matrix_access_token}",
                "Content-Type": "application/json"
            },
            json=room_data,
            timeout=15
        )
        
        if not resp.ok:
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text}
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to create room: {err.get('error', resp.text)}"
            )
        
        room_info = resp.json()
        room_id = room_info["room_id"]
        
        # Add the room to the Space
        space_resp = requests.put(
            f"{MATRIX_HOMESERVER}/_matrix/client/r0/rooms/{space_id}/state/m.space.child/{room_id}",
            headers={
                "Authorization": f"Bearer {matrix_access_token}",
                "Content-Type": "application/json"
            },
            json={
                "via": [MATRIX_HOMESERVER.replace("https://", "").replace("http://", "")],
                "suggested": True
            },
            timeout=15
        )
        
        if not space_resp.ok:
            # Room created but failed to add to Space - log warning but don't fail
            print(f"Warning: Room {room_id} created but failed to add to Space {space_id}")
        
        return {
            "room_id": room_id,
            "room_name": request.room_name,
            "message": f"Room '{request.room_name}' created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")

