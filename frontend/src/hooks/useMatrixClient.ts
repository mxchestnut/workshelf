/**
 * Matrix Client Hook & Provider
 * Manages Matrix SDK client initialization and shared state
 * Enables Facebook-style chat popups and Element app sync
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import * as matrix from 'matrix-js-sdk'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface MatrixContextType {
  client: matrix.MatrixClient | null
  isReady: boolean
  openChat: (userId: string, userName: string, userAvatar?: string) => Promise<void>
  unreadCount: number
}

const MatrixContext = createContext<MatrixContextType | null>(null)

interface MatrixProviderProps {
  children: ReactNode
}

export function MatrixProvider({ children }: MatrixProviderProps) {
  const [client, setClient] = useState<matrix.MatrixClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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
        const matrixClient = matrix.createClient({
          baseUrl: homeserver || 'https://matrix.workshelf.dev',
          accessToken: matrix_access_token,
          userId: matrix_user_id,
          store: new matrix.MemoryStore(), // Use IndexedDBStore for production
        })

        // Initialize crypto for end-to-end encryption
        try {
          await matrixClient.initCrypto()
          console.log('[Matrix] Crypto initialized')
        } catch (error) {
          console.warn('[Matrix] Crypto init failed (non-critical):', error)
        }
        
        // Start syncing
        await matrixClient.startClient({ initialSyncLimit: 10 })

        // Wait for initial sync
        matrixClient.once('sync', (state) => {
          if (state === 'PREPARED') {
            console.log('[Matrix] Client ready')
            setIsReady(true)
            updateUnreadCount(matrixClient)
          }
        })

        // Listen for new messages to update unread count
        matrixClient.on('Room.timeline', () => {
          updateUnreadCount(matrixClient)
        })

        setClient(matrixClient)
      } catch (error) {
        console.error('[Matrix] Initialization failed:', error)
      }
    }

    initMatrix()

    return () => {
      if (client) {
        client.stopClient()
      }
    }
  }, [])

  const updateUnreadCount = (matrixClient: matrix.MatrixClient) => {
    const rooms = matrixClient.getRooms()
    const unread = rooms.reduce((count, room) => {
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
          preset: matrix.Preset.TrustedPrivateChat,
          is_direct: true,
          invite: [userId],
          visibility: matrix.Visibility.Private
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
function findExistingDM(client: matrix.MatrixClient, userId: string): string | null {
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
  client: matrix.MatrixClient, 
  room: matrix.Room
): matrix.RoomMember | null {
  const members = room.getJoinedMembers()
  return members.find(m => m.userId !== client.getUserId()) || null
}
