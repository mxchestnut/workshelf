/**
 * Matrix Client Hook & Provider
 * Manages Matrix SDK client initialization and shared state
 * Enables Facebook-style chat popups and Element app sync
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type * as Matrix from 'matrix-js-sdk'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface MatrixContextType {
  client: Matrix.MatrixClient | null
  isReady: boolean
  openChat: (userId: string, userName: string, userAvatar?: string) => Promise<void>
  unreadCount: number
}

const MatrixContext = createContext<MatrixContextType | null>(null)

interface MatrixProviderProps {
  children: ReactNode
}

export function MatrixProvider({ children }: MatrixProviderProps): React.JSX.Element {
  const [client, setClient] = useState<Matrix.MatrixClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  // Module-scoped cache of the SDK to avoid reloading
  let MatrixSDK: typeof import('matrix-js-sdk') | null = null

  useEffect(() => {
    const initMatrix = async () => {
      try {
        // Get Matrix credentials from backend
        const response = await fetch(`${API_URL}/api/v1/matrix/credentials`, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('access_token')}` 
          }
        })
        
        if (!response.ok) {
          console.error('[Matrix] Failed to get credentials')
          return
        }

        const { matrix_user_id, matrix_access_token, homeserver } = await response.json()

        console.log('[Matrix] Initializing client for', matrix_user_id)

        // Create Matrix client
        const sdk = MatrixSDK ?? (MatrixSDK = await import('matrix-js-sdk'))
        const matrixClient = sdk.createClient({
          baseUrl: homeserver || 'https://matrix.workshelf.dev',
          accessToken: matrix_access_token,
          userId: matrix_user_id,
          store: new (sdk as any).MemoryStore(),
        })

        // Start syncing
        await matrixClient.startClient({ initialSyncLimit: 10 })

        // Wait for initial sync
        matrixClient.once(sdk.ClientEvent.Sync, (state: any) => {
          if (state === (sdk as any).SyncState.Prepared) {
            console.log('[Matrix] Client ready')
            setIsReady(true)
            updateUnreadCount(matrixClient)
          }
        })

        // Listen for new messages to update unread count
        matrixClient.on(sdk.RoomEvent.Timeline, () => {
          updateUnreadCount(matrixClient)
        })

        setClient(matrixClient)
      } catch (error) {
        console.error('[Matrix] Initialization failed:', error)
      }
    }

    // Only initialize when we have an access token
    const token = localStorage.getItem('access_token')
    if (token) {
      initMatrix()
    } else {
      // Wait for auth to complete in this tab
      const handleAuthReady = () => initMatrix()
      window.addEventListener('auth:logged-in', handleAuthReady, { once: true })
      return () => {
        window.removeEventListener('auth:logged-in', handleAuthReady)
        if (client) {
          client.stopClient()
        }
      }
    }

    return () => {
      if (client) {
        client.stopClient()
      }
    }
  }, [])

  const updateUnreadCount = (matrixClient: Matrix.MatrixClient) => {
    const rooms = matrixClient.getRooms()
    const unread = rooms.reduce((count: number, room: Matrix.Room) => {
      return count + room.getUnreadNotificationCount()
    }, 0)
    setUnreadCount(unread)
  }

  const openChat = async (userId: string, userName: string, userAvatar?: string) => {
    if (!client || !isReady) {
      console.warn('[Matrix] Client not ready')
      return
    }

    try {
      // Find existing DM or create new one
      let roomId = findExistingDM(client, userId)
      
      if (!roomId) {
        console.log('[Matrix] Creating new DM with', userId)
        // Create new DM room
        const { room_id } = await client.createRoom({
          preset: (await import('matrix-js-sdk')).Preset.TrustedPrivateChat,
          is_direct: true,
          invite: [userId],
          visibility: (await import('matrix-js-sdk')).Visibility.Private
        })
        roomId = room_id
        console.log('[Matrix] Created room:', roomId)
      }

      // Trigger chat popup via custom event
      window.dispatchEvent(new CustomEvent('openChat', {
        detail: { roomId, userName, userAvatar }
      }))
    } catch (error) {
      console.error('[Matrix] Failed to open chat:', error)
    }
  }

  return (
    <MatrixContext.Provider value={{ client, isReady, openChat, unreadCount }}>
      {children}
    </MatrixContext.Provider>
  )
}

export const useMatrix = () => {
  const context = useContext(MatrixContext)
  if (!context) {
    throw new Error('useMatrix must be used within MatrixProvider')
  }
  return context
}

/**
 * Helper: Find existing direct message room with a user
 */
function findExistingDM(client: Matrix.MatrixClient, userId: string): string | null {
  const rooms = client.getRooms()
  for (const room of rooms) {
    if (room.getMyMembership() === 'join') {
      const dmTarget = room.guessDMUserId()
      if (dmTarget === userId) {
        return room.roomId
      }
    }
  }
  return null
}

/**
 * Helper: Get other user in a DM room
 */
export function getOtherUserInRoom(
  client: Matrix.MatrixClient, 
  room: Matrix.Room
): Matrix.RoomMember | null {
  const members = room.getJoinedMembers()
  return members.find((m: Matrix.RoomMember) => m.userId !== client.getUserId()) || null
}
