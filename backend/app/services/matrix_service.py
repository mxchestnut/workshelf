"""Matrix protocol integration service"""
import os
from typing import Optional
from nio import AsyncClient, LoginResponse, RoomCreateResponse
import secrets

MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "http://synapse:8008")


class MatrixService:
    """Service for Matrix protocol operations"""
    
    @staticmethod
    async def register_user(username: str) -> tuple[Optional[str], Optional[str]]:
        """
        Register a new Matrix user
        Returns (matrix_user_id, access_token) on success
        """
        # Generate secure password (user never sees it)
        password = secrets.token_urlsafe(32)
        matrix_user_id = f"@{username}:matrix.workshelf.dev"
        
        client = AsyncClient(MATRIX_HOMESERVER, matrix_user_id)
        
        try:
            # Try to register
            response = await client.register(username, password)
            
            if hasattr(response, 'user_id') and response.user_id:
                # Login to get access token
                login_response = await client.login(password)
                if isinstance(login_response, LoginResponse):
                    await client.close()
                    return response.user_id, login_response.access_token
        except Exception as e:
            print(f"Matrix registration failed: {e}")
        finally:
            await client.close()
        
        return None, None
    
    @staticmethod
    async def create_dm_room(user_access_token: str, user_id: str, other_user_id: str) -> Optional[str]:
        """
        Create a direct message room between two users
        Returns room_id on success
        """
        client = AsyncClient(MATRIX_HOMESERVER, user_id)
        client.access_token = user_access_token
        
        try:
            response = await client.room_create(
                is_direct=True,
                invite=[other_user_id]
            )
            if isinstance(response, RoomCreateResponse):
                room_id = response.room_id
                await client.close()
                return room_id
        except Exception as e:
            print(f"Room creation failed: {e}")
        finally:
            await client.close()
        
        return None
    
    @staticmethod
    async def send_message(user_access_token: str, user_id: str, room_id: str, content: str) -> bool:
        """Send a text message to a room"""
        client = AsyncClient(MATRIX_HOMESERVER, user_id)
        client.access_token = user_access_token
        
        try:
            response = await client.room_send(
                room_id=room_id,
                message_type="m.room.message",
                content={
                    "msgtype": "m.text",
                    "body": content
                }
            )
            success = hasattr(response, 'event_id') and response.event_id is not None
            await client.close()
            return success
        except Exception as e:
            print(f"Message send failed: {e}")
            return False
        finally:
            await client.close()
