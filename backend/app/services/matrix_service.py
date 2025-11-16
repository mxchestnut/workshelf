"""
Matrix service for Space and room management integration with groups.
"""
import os
import requests
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev")


class MatrixService:
    """Service for Matrix Space and room operations."""
    
    @staticmethod
    async def create_space_for_group(
        db: AsyncSession,
        group_id: int,
        group_name: str,
        group_description: Optional[str],
        creator_user_id: int
    ) -> Optional[str]:
        """
        Create a Matrix Space for a group and return the space_id.
        
        Args:
            db: Database session
            group_id: Work Shelf group ID
            group_name: Name for the Space
            group_description: Description/topic for the Space
            creator_user_id: ID of the user creating the group (must have Matrix credentials)
            
        Returns:
            space_id (str) if successful, None otherwise
        """
        try:
            # Get creator's Matrix credentials
            result = await db.execute(
                text("""
                SELECT matrix_user_id, matrix_access_token
                FROM users
                WHERE id = :user_id
                """),
                {"user_id": creator_user_id}
            )
            row = result.fetchone()
            
            if not row or not row[0] or not row[1]:
                print(f"[MatrixService] Creator {creator_user_id} has no Matrix credentials, skipping Space creation")
                return None
            
            matrix_user_id = row[0]
            matrix_access_token = row[1]
            
            # Create Space
            resp = requests.post(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/createRoom",
                headers={
                    "Authorization": f"Bearer {matrix_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "name": group_name,
                    "topic": group_description or f"Discussion space for {group_name}",
                    "preset": "public_chat",
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
                            "m.space.child": 50
                        }
                    }
                },
                timeout=15
            )
            
            if not resp.ok:
                print(f"[MatrixService] Failed to create Space: {resp.status_code} {resp.text}")
                return None
            
            data = resp.json()
            space_id = data.get("room_id")
            
            print(f"[MatrixService] Created Space {space_id} for group {group_id} by {matrix_user_id}")
            
            # Update group with space_id
            await db.execute(
                text("""
                UPDATE groups
                SET matrix_space_id = :space_id
                WHERE id = :group_id
                """),
                {"space_id": space_id, "group_id": group_id}
            )
            await db.commit()
            
            return space_id
            
        except Exception as e:
            print(f"[MatrixService] Error creating Space for group {group_id}: {str(e)}")
            return None
    
    @staticmethod
    async def invite_user_to_space(
        db: AsyncSession,
        space_id: str,
        user_id: int,
        inviter_user_id: Optional[int] = None
    ) -> bool:
        """
        Invite a user to a Matrix Space.
        
        Args:
            db: Database session
            space_id: Matrix Space ID
            user_id: Work Shelf user ID to invite
            inviter_user_id: Optional user ID who is inviting (must have power in Space)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get invitee's Matrix ID
            result = await db.execute(
                text("""
                SELECT matrix_user_id
                FROM users
                WHERE id = :user_id
                """),
                {"user_id": user_id}
            )
            row = result.fetchone()
            
            if not row or not row[0]:
                print(f"[MatrixService] User {user_id} has no Matrix account, skipping Space invite")
                return False
            
            invitee_matrix_id = row[0]
            
            # Get inviter's access token (use first admin/owner if not specified)
            if inviter_user_id:
                inviter_result = await db.execute(
                    text("""
                    SELECT matrix_access_token
                    FROM users
                    WHERE id = :user_id
                    """),
                    {"user_id": inviter_user_id}
                )
                inviter_row = inviter_result.fetchone()
                if not inviter_row or not inviter_row[0]:
                    print(f"[MatrixService] Inviter {inviter_user_id} has no Matrix credentials")
                    return False
                inviter_token = inviter_row[0]
            else:
                # Try to get any admin token from the group
                # For now, we'll just skip if no inviter specified
                print(f"[MatrixService] No inviter specified for Space invite, skipping")
                return False
            
            # Invite user to Space
            resp = requests.post(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/rooms/{space_id}/invite",
                headers={
                    "Authorization": f"Bearer {inviter_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "user_id": invitee_matrix_id
                },
                timeout=15
            )
            
            if not resp.ok:
                print(f"[MatrixService] Failed to invite {invitee_matrix_id} to Space {space_id}: {resp.status_code} {resp.text}")
                return False
            
            print(f"[MatrixService] Invited {invitee_matrix_id} to Space {space_id}")
            return True
            
        except Exception as e:
            print(f"[MatrixService] Error inviting user {user_id} to Space {space_id}: {str(e)}")
            return False
    
    @staticmethod
    async def create_room_in_space(
        db: AsyncSession,
        space_id: str,
        room_name: str,
        room_topic: Optional[str],
        creator_user_id: int
    ) -> Optional[str]:
        """
        Create a topic room within a Space.
        
        Args:
            db: Database session
            space_id: Parent Space ID
            room_name: Name for the new room
            room_topic: Optional topic/description
            creator_user_id: User creating the room
            
        Returns:
            room_id if successful, None otherwise
        """
        try:
            # Get creator's Matrix credentials
            result = await db.execute(
                text("""
                SELECT matrix_access_token
                FROM users
                WHERE id = :user_id
                """),
                {"user_id": creator_user_id}
            )
            row = result.fetchone()
            
            if not row or not row[0]:
                print(f"[MatrixService] Creator {creator_user_id} has no Matrix credentials")
                return None
            
            matrix_access_token = row[0]
            
            # Create the room
            resp = requests.post(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/createRoom",
                headers={
                    "Authorization": f"Bearer {matrix_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "name": room_name,
                    "topic": room_topic or "",
                    "preset": "public_chat",
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
                    ]
                },
                timeout=15
            )
            
            if not resp.ok:
                print(f"[MatrixService] Failed to create room: {resp.status_code} {resp.text}")
                return None
            
            data = resp.json()
            room_id = data.get("room_id")
            
            # Add room to Space (set parent-child relationship)
            add_resp = requests.put(
                f"{MATRIX_HOMESERVER}/_matrix/client/r0/rooms/{space_id}/state/m.space.child/{room_id}",
                headers={
                    "Authorization": f"Bearer {matrix_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "via": [MATRIX_HOMESERVER.replace("https://", "").replace("http://", "")],
                    "suggested": True
                },
                timeout=15
            )
            
            if not add_resp.ok:
                print(f"[MatrixService] Failed to add room to Space: {add_resp.status_code} {add_resp.text}")
                # Room was created but not added to Space - still return room_id
            
            print(f"[MatrixService] Created room {room_id} in Space {space_id}")
            return room_id
            
        except Exception as e:
            print(f"[MatrixService] Error creating room in Space: {str(e)}")
            return None
