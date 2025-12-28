# Matrix Integration Guide

## Overview

NPC has a dual messaging system:
1. **Simple Internal Messaging** (current) - Database-stored conversations
2. **Matrix Protocol** (future) - Federated, real-time messaging with full features

This guide explains how to connect the two systems.

---

## Current Architecture

### Database Tables
- `message_threads` - Conversation metadata (participant_ids, is_group, title)
- `messages` - Individual messages (conversation_id, sender_id, content, read_by)

### Backend API
- `/api/v1/messaging/*` - Current REST API for conversations and messages
- Uses PostgreSQL for storage
- No real-time sync (requires polling or WebSockets)

### Frontend
- `/messages` page - Custom React UI
- User search via `/api/v1/search/users`
- Simple chat interface

---

## Matrix Setup (Already Configured!)

### Docker Compose
Matrix Synapse is already running in your docker-compose.yml:
```yaml
synapse:
  image: matrixdotorg/synapse:latest
  container_name: npc-synapse
  environment:
    SYNAPSE_SERVER_NAME: matrix.localhost
  ports:
    - "8008:8008"
```

### Production URL
- Homeserver URL: `http://synapse:8008` (internal Docker network)
- Public URL: Should be `https://matrix.nerdchurchpartners.org` (requires nginx config)

---

## Integration Strategy

### Option 1: Hybrid Approach (Recommended for MVP)
Keep both systems running in parallel:
- **Internal messaging** - Simple DMs, notification storage
- **Matrix** - Optional advanced features (group chat, threads, reactions)

**Pros:**
- Simple to implement
- Gradual migration
- Works offline

**Cons:**
- Two systems to maintain
- No unified inbox

### Option 2: Matrix-First (Future)
Replace internal messaging entirely with Matrix:
- All conversations are Matrix rooms
- Backend API becomes a proxy to Matrix
- Real-time sync built-in

**Pros:**
- Federation support
- Rich features (threads, reactions, E2EE)
- Industry-standard protocol

**Cons:**
- More complex setup
- Requires Matrix SDK knowledge
- Harder to customize

---

## Implementation Steps

### Phase 1: Matrix Account Creation

#### 1. Install Matrix SDK
```bash
cd backend
pip install matrix-nio  # Python Matrix SDK
```

Add to `requirements.txt`:
```txt
matrix-nio==0.24.0
```

#### 2. Create Matrix Service
Create `backend/app/services/matrix_service.py`:

```python
"""Matrix protocol integration service"""
import os
from typing import Optional, List
import asyncio
from nio import AsyncClient, LoginResponse, RoomCreateResponse, RoomInviteResponse

MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "http://synapse:8008")
MATRIX_BOT_USER = os.getenv("MATRIX_BOT_USER", "@bot:matrix.nerdchurchpartners.org")
MATRIX_BOT_PASSWORD = os.getenv("MATRIX_BOT_PASSWORD", "change_me")


class MatrixService:
    """Service for Matrix protocol operations"""
    
    @staticmethod
    async def register_user(username: str, password: str) -> Optional[str]:
        """
        Register a new Matrix user
        Returns matrix_user_id on success
        """
        client = AsyncClient(MATRIX_HOMESERVER, f"@{username}:matrix.nerdchurchpartners.org")
        
        try:
            response = await client.register(username, password)
            if response.user_id:
                return response.user_id
        except Exception as e:
            print(f"Matrix registration failed: {e}")
        finally:
            await client.close()
        
        return None
    
    @staticmethod
    async def create_dm_room(user_access_token: str, other_user_id: str) -> Optional[str]:
        """
        Create a direct message room between two users
        Returns room_id on success
        """
        client = AsyncClient(MATRIX_HOMESERVER)
        client.access_token = user_access_token
        
        try:
            response = await client.room_create(
                is_direct=True,
                invite=[other_user_id]
            )
            if isinstance(response, RoomCreateResponse):
                return response.room_id
        except Exception as e:
            print(f"Room creation failed: {e}")
        finally:
            await client.close()
        
        return None
    
    @staticmethod
    async def send_message(user_access_token: str, room_id: str, content: str) -> bool:
        """Send a text message to a room"""
        client = AsyncClient(MATRIX_HOMESERVER)
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
            return response.event_id is not None
        except Exception as e:
            print(f"Message send failed: {e}")
            return False
        finally:
            await client.close()
```

#### 3. Add Matrix Endpoints
Add to `backend/app/api/matrix.py`:

```python
"""Matrix protocol endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service, matrix_service
from app.models.user import User

router = APIRouter(prefix="/matrix", tags=["matrix"])


@router.post("/initialize")
async def initialize_matrix_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Matrix account for the current user if they don't have one
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if already has Matrix account
    if user.matrix_user_id:
        return {
            "matrix_user_id": user.matrix_user_id,
            "matrix_homeserver": user.matrix_homeserver,
            "status": "already_exists"
        }
    
    # Generate secure password (user never sees it)
    import secrets
    matrix_password = secrets.token_urlsafe(32)
    
    # Register with Matrix
    matrix_user_id = await matrix_service.MatrixService.register_user(
        username=user.username,
        password=matrix_password
    )
    
    if not matrix_user_id:
        raise HTTPException(status_code=500, detail="Failed to create Matrix account")
    
    # Login to get access token
    from nio import AsyncClient, LoginResponse
    client = AsyncClient(matrix_service.MATRIX_HOMESERVER, matrix_user_id)
    response = await client.login(matrix_password)
    
    if not isinstance(response, LoginResponse):
        raise HTTPException(status_code=500, detail="Failed to login to Matrix")
    
    # Store credentials
    user.matrix_user_id = matrix_user_id
    user.matrix_access_token = response.access_token
    user.matrix_homeserver = matrix_service.MATRIX_HOMESERVER
    await db.commit()
    
    await client.close()
    
    return {
        "matrix_user_id": matrix_user_id,
        "matrix_homeserver": matrix_service.MATRIX_HOMESERVER,
        "status": "created"
    }


@router.post("/rooms/create")
async def create_matrix_room(
    other_user_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a Matrix DM room with another user
    """
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Ensure current user has Matrix account
    if not user.matrix_access_token:
        raise HTTPException(status_code=400, detail="No Matrix account. Call /initialize first")
    
    # Get other user's Matrix ID
    other_user = await user_service.get_user_by_id(db, other_user_id)
    if not other_user or not other_user.matrix_user_id:
        raise HTTPException(status_code=404, detail="Other user doesn't have Matrix account")
    
    # Create room
    room_id = await matrix_service.MatrixService.create_dm_room(
        user_access_token=user.matrix_access_token,
        other_user_id=other_user.matrix_user_id
    )
    
    if not room_id:
        raise HTTPException(status_code=500, detail="Failed to create Matrix room")
    
    return {
        "room_id": room_id,
        "matrix_user_id": other_user.matrix_user_id
    }
```

Register in `backend/app/main.py`:
```python
from app.api import matrix
app.include_router(matrix.router, prefix="/api/v1")
```

### Phase 2: Frontend Integration

#### 1. Install Matrix JS SDK
```bash
cd frontend
npm install matrix-js-sdk
```

#### 2. Create Matrix Context
Create `frontend/src/contexts/MatrixContext.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as sdk from 'matrix-js-sdk'
import { authService } from '../services/auth'

const API_URL = import.meta.env.VITE_API_URL || 'https://nerdchurchpartners.org'

interface MatrixContextType {
  client: sdk.MatrixClient | null
  initialized: boolean
  initializeMatrix: () => Promise<void>
}

const MatrixContext = createContext<MatrixContextType>({
  client: null,
  initialized: false,
  initializeMatrix: async () => {}
})

export function MatrixProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<sdk.MatrixClient | null>(null)
  const [initialized, setInitialized] = useState(false)

  const initializeMatrix = async () => {
    try {
      const token = await authService.getAccessToken()
      
      // Initialize Matrix account on backend
      const response = await fetch(`${API_URL}/api/v1/matrix/initialize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      // Create Matrix client
      const matrixClient = sdk.createClient({
        baseUrl: data.matrix_homeserver,
        accessToken: data.matrix_access_token,
        userId: data.matrix_user_id
      })
      
      await matrixClient.startClient({ initialSyncLimit: 10 })
      
      setClient(matrixClient)
      setInitialized(true)
    } catch (error) {
      console.error('Matrix initialization failed:', error)
    }
  }

  return (
    <MatrixContext.Provider value={{ client, initialized, initializeMatrix }}>
      {children}
    </MatrixContext.Provider>
  )
}

export const useMatrix = () => useContext(MatrixContext)
```

#### 3. Update Messages Page
Modify `frontend/src/pages/Messages.tsx`:

```tsx
import { useMatrix } from '../contexts/MatrixContext'

export default function Messages() {
  const { client, initialized, initializeMatrix } = useMatrix()
  
  useEffect(() => {
    if (!initialized) {
      initializeMatrix()
    }
  }, [initialized])
  
  // Use Matrix client for real-time sync
  useEffect(() => {
    if (!client) return
    
    // Listen for new messages
    client.on('Room.timeline', (event, room) => {
      if (event.getType() === 'm.room.message') {
        // Update UI with new message
        console.log('New message:', event.getContent().body)
      }
    })
  }, [client])
  
  // ... rest of component
}
```

---

## Migration Path

### Step 1: Deploy Matrix Endpoints
1. Add `matrix-nio` to requirements.txt
2. Create `matrix_service.py` and `matrix.py` API
3. Deploy backend
4. Test with Postman: `POST /api/v1/matrix/initialize`

### Step 2: Optional Matrix for Users
1. Add "Enable Matrix Chat" toggle in Profile settings
2. Show Matrix badge on profiles with Matrix enabled
3. "Start Matrix Chat" button creates Matrix room instead of internal conversation

### Step 3: Gradual Migration
1. Keep both systems running
2. New users default to Matrix
3. Old conversations stay in internal system
4. Add "Upgrade to Matrix" button for old conversations

### Step 4: Full Matrix (Future)
1. Migrate all conversations to Matrix rooms
2. Remove internal messaging tables
3. Backend becomes Matrix API proxy only

---

## Environment Variables

Add to `.env`:
```bash
MATRIX_HOMESERVER=http://synapse:8008
MATRIX_BOT_USER=@bot:matrix.nerdchurchpartners.org
MATRIX_BOT_PASSWORD=your_secure_password
```

Add to production `.env`:
```bash
MATRIX_HOMESERVER=https://matrix.nerdchurchpartners.org
```

---

## Next Steps

1. **Set up Matrix admin account**
   ```bash
   docker exec -it npc-synapse register_new_matrix_user http://localhost:8008 -c /data/homeserver.yaml -u admin -p your_password --admin
   ```

2. **Test Matrix registration**
   - Use Postman to call `/api/v1/matrix/initialize`
   - Verify user appears in Synapse database
   - Test creating a DM room

3. **Configure nginx for Matrix federation**
   - Add `matrix.nerdchurchpartners.org` subdomain
   - Proxy to port 8008
   - Set up SSL cert

4. **Frontend integration**
   - Wrap App.tsx in MatrixProvider
   - Add Matrix initialization to Messages page
   - Show "Matrix enabled" status in UI

---

## Testing

### Manual Testing
1. Create two test accounts (user1, user2)
2. Call `/api/v1/matrix/initialize` for both
3. User1 creates room with user2
4. Send messages through Matrix SDK
5. Verify messages appear in both clients

### Element Web (Debug Tool)
Point Element Web to your homeserver to debug:
1. Go to https://app.element.io
2. Click "Sign in"
3. Click "Edit" next to homeserver
4. Enter `https://matrix.nerdchurchpartners.org`
5. Login with Matrix credentials from database
6. See all rooms and messages

---

## Resources

- [Matrix Protocol Docs](https://matrix.org/docs/guides/)
- [matrix-nio Python SDK](https://github.com/poljar/matrix-nio)
- [matrix-js-sdk Docs](https://matrix.org/docs/guides/usage-of-the-matrix-js-sdk)
- [Synapse Admin Guide](https://matrix-org.github.io/synapse/latest/)
