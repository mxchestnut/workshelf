/**
 * Matrix Client Hook
 * Provides Matrix client instance for messaging functionality
 */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import * as matrix from 'matrix-js-sdk'

interface MatrixContextType {
  client: matrix.MatrixClient | null
  isReady: boolean
  openChat?: (userId: string, displayName?: string, avatarUrl?: string) => void
}

const MatrixContext = createContext<MatrixContextType>({
  client: null,
  isReady: false
})

export function MatrixProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<matrix.MatrixClient | null>(null)
  const [isReady, setIsReady] = useState(false)

  const openChat = (userId: string, displayName?: string, avatarUrl?: string) => {
    // Placeholder for opening chat - can be implemented later
    console.log('Opening chat with:', userId, displayName, avatarUrl)
  }

  useEffect(() => {
    // Initialize Matrix client if user has credentials
    const initClient = async () => {
      try {
        const accessToken = localStorage.getItem('matrix_access_token')
        const userId = localStorage.getItem('matrix_user_id')
        const homeserver = localStorage.getItem('matrix_homeserver') || 'https://matrix.org'

        if (accessToken && userId) {
          const matrixClient = matrix.createClient({
            baseUrl: homeserver,
            accessToken: accessToken,
            userId: userId,
          })

          await matrixClient.startClient({ initialSyncLimit: 10 })
          
          matrixClient.once('sync' as any, (state: string) => {
            if (state === 'PREPARED') {
              setClient(matrixClient)
              setIsReady(true)
            }
          })
        }
      } catch (error) {
        console.error('Failed to initialize Matrix client:', error)
      }
    }

    initClient()

    return () => {
      if (client) {
        client.stopClient()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MatrixContext.Provider value={{ client, isReady, openChat }}>
      {children}
    </MatrixContext.Provider>
  )
}

export function useMatrix() {
  return useContext(MatrixContext)
}
