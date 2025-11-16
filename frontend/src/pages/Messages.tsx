/**
 * Messages Page
 * Email-style inbox view for all direct messages
 * Works alongside popup chats and Element app
 */
import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useMatrix, getOtherUserInRoom } from '../hooks/useMatrixClient.tsx'
import { authService, User } from '../services/auth'
import { MessageSquare, Search, Loader2 } from 'lucide-react'
import * as matrix from 'matrix-js-sdk'

interface RoomInfo {
  roomId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar?: string
  lastMessage: string
  lastMessageTime: number
  unreadCount: number
}

export default function Messages() {
  const [user, setUser] = useState<User | null>(null)
  const { client, isReady } = useMatrix()
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!client || !isReady) return

    const loadRooms = () => {
      const directRooms = client
        .getRooms()
        .filter(room => {
          // Only show DM rooms where user is joined
          return room.getMyMembership() === 'join' && room.guessDMUserId()
        })
        .map(room => {
          const otherUser = getOtherUserInRoom(client, room)
          const timeline = room.getLiveTimeline().getEvents()
          const messageEvents = timeline.filter(e => e.getType() === 'm.room.message')
          const lastMessage = messageEvents[messageEvents.length - 1]

          return {
            roomId: room.roomId,
            otherUserId: otherUser?.userId || '',
            otherUserName: otherUser?.name || 'Unknown User',
            otherUserAvatar: otherUser?.getAvatarUrl(
              client.baseUrl,
              40,
              40,
              'crop',
              false,
              false
            ) || undefined,
            lastMessage: lastMessage?.getContent().body || 'No messages yet',
            lastMessageTime: lastMessage?.getTs() || room.getLastActiveTimestamp(),
            unreadCount: room.getUnreadNotificationCount()
          } as RoomInfo
        })
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime)
      
      setRooms(directRooms)
      setLoading(false)
    }

    loadRooms()

    // Update room list when new messages arrive
    client.on(matrix.RoomEvent.Timeline, loadRooms)
    
    return () => {
      client.off(matrix.RoomEvent.Timeline, loadRooms)
    }
  }, [client, isReady])

  const handleRoomClick = (roomId: string) => {
    setSelectedRoom(roomId)
    
    // Open in popup chat instead of inline (user preference)
    const room = rooms.find(r => r.roomId === roomId)
    if (room) {
      window.dispatchEvent(new CustomEvent('openChat', {
        detail: {
          roomId: room.roomId,
          userName: room.otherUserName,
          userAvatar: room.otherUserAvatar
        }
      }))
    }
  }

  const filteredRooms = rooms.filter(room =>
    room.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#37322E' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#B34B0C' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation 
        user={user}
        onLogin={() => {}}
        onLogout={async () => {
          await authService.logout()
          window.location.href = '/'
        }}
        currentPage="messages"
      />

      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '600px' }}>
          <div className="flex h-full">
            {/* Sidebar - Conversation List */}
            <div className="w-80 border-r flex flex-col" style={{ backgroundColor: '#F9F9F9' }}>
              {/* Header */}
              <div className="p-4 border-b bg-white">
                <h1 className="text-2xl font-bold mb-4" style={{ color: '#37322E' }}>
                  Messages
                </h1>
                
                {/* Search */}
                <div className="relative">
                  <Search 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                    style={{ color: '#B3B2B0' }} 
                  />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B34B0C]"
                    style={{ 
                      borderColor: '#E5E5E5'
                    }}
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#B34B0C' }} />
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
                    <MessageSquare className="w-12 h-12 mb-4" style={{ color: '#B3B2B0' }} />
                    <p className="text-gray-600 mb-2">
                      {searchQuery ? 'No conversations found' : 'No messages yet'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {searchQuery 
                        ? 'Try a different search term'
                        : 'Start a conversation with another user'}
                    </p>
                  </div>
                ) : (
                  filteredRooms.map((room) => (
                    <button
                      key={room.roomId}
                      onClick={() => handleRoomClick(room.roomId)}
                      className={`w-full p-4 border-b cursor-pointer hover:bg-white transition-colors text-left ${
                        selectedRoom === room.roomId ? 'bg-white' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {room.otherUserAvatar ? (
                          <img 
                            src={room.otherUserAvatar} 
                            className="w-12 h-12 rounded-full flex-shrink-0"
                            alt={room.otherUserName}
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: '#B34B0C' }}
                          >
                            <span className="text-white font-bold text-lg">
                              {room.otherUserName[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium truncate" style={{ color: '#37322E' }}>
                              {room.otherUserName}
                            </h3>
                            {room.unreadCount > 0 && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full text-white font-bold"
                                style={{ backgroundColor: '#B34B0C' }}
                              >
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {room.lastMessage}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(room.lastMessageTime).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FAFAFA' }}>
              <div className="text-center px-4">
                <MessageSquare className="w-16 h-16 mx-auto mb-4" style={{ color: '#B3B2B0' }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: '#37322E' }}>
                  Select a conversation
                </h2>
                <p className="text-gray-600 mb-4">
                  Click on a conversation to open it in a chat popup
                </p>
                <p className="text-sm text-gray-500">
                  You can also use the Element app on desktop or mobile<br />
                  to continue these conversations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
