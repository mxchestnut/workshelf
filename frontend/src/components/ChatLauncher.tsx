/**
 * ChatLauncher Component
 * Floating messenger button + mini inbox tray (Facebook-style)
 * Lists direct chats and opens ChatPopup via ChatManager
 */
import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, ChevronUp, ChevronDown } from 'lucide-react'
import * as matrix from 'matrix-js-sdk'
import { useMatrix, getOtherUserInRoom } from '../hooks/useMatrixClient.tsx'

interface DMRoomItem {
  roomId: string
  name: string
  avatarUrl?: string
  lastMessage?: string
  lastTs?: number
  unread: number
}

export function ChatLauncher() {
  const { client, isReady, openChat, unreadCount } = useMatrix()
  const [isOpen, setIsOpen] = useState(false)
  const [dmRooms, setDmRooms] = useState<DMRoomItem[]>([])

  // Build a DM list from rooms
  const refreshDmList = () => {
    if (!client) return
    const rooms = client.getRooms()

    const items: DMRoomItem[] = []
    for (const room of rooms) {
      // Only joined rooms
      if (room.getMyMembership() !== 'join') continue

      // Heuristic: if it looks like a DM
      const dmTarget = (room as any).guessDMUserId?.() || null
      if (!dmTarget) continue

      const other = getOtherUserInRoom(client, room)
      const name = other?.rawDisplayName || other?.name || room.name || dmTarget
      const avatarUrl = other?.getAvatarUrl(client.getHomeserverUrl(), 30, 30, 'scale', true, true) || undefined

      // Last message
      const events = room.getLiveTimeline().getEvents()
      const last = [...events].reverse().find(e => e.getType() === 'm.room.message')
      const lastBody = last?.getContent()?.body as string | undefined
      const lastTs = last?.getTs()

      items.push({
        roomId: room.roomId,
        name: name || dmTarget,
        avatarUrl,
        lastMessage: lastBody,
        lastTs,
        unread: room.getUnreadNotificationCount() || 0,
      })
    }

    // Sort by last activity desc
    items.sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0))
    setDmRooms(items)
  }

  useEffect(() => {
    if (!client) return
    refreshDmList()

  const onTimeline = (_event: matrix.MatrixEvent, room?: matrix.Room) => {
      if (room) {
        // Update when new messages arrive
        refreshDmList()
      }
    }

    client.on(matrix.RoomEvent.Timeline, onTimeline)
    return () => {
      client.off(matrix.RoomEvent.Timeline, onTimeline)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isReady])

  // Listen for global toggle events from ChatBar
  useEffect(() => {
    const handler = () => setIsOpen((v) => !v)
    window.addEventListener('toggleChatTray', handler)
    return () => window.removeEventListener('toggleChatTray', handler)
  }, [])

  const badge = useMemo(() => {
    if (!unreadCount) return null
    return (
      <span
        className="absolute -top-1 -right-1 text-xs font-bold rounded-full px-1.5 py-0.5"
        style={{ backgroundColor: '#B34B0C', color: 'white' }}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )
  }, [unreadCount])

  const toggleTray = () => {
    if (!isReady) return
    setIsOpen(v => !v)
    if (!isOpen) refreshDmList()
  }

  const onOpenRoom = async (item: DMRoomItem) => {
    if (!client) return
    // Try to get a human name for the popup
    await openChat(item.roomId, item.name, item.avatarUrl)
    setIsOpen(false)
  }

  // Hidden until Matrix is ready
  if (!isReady) return null

  return (
    <div style={{ position: 'fixed', bottom: 64, right: 16, zIndex: 9998 }}>
      {/* Tray */}
      {isOpen && (
        <div
          className="mb-3 w-80 rounded-lg shadow-2xl overflow-hidden border"
          style={{ background: 'white', borderColor: '#E5E5E5' }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ background: '#37322E' }}>
            <span className="text-white font-medium">Messages</span>
            <button
              className="text-white/90 hover:text-white transition-colors"
              onClick={toggleTray}
              aria-label="Close messages"
            >
              <ChevronDown size={18} />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {dmRooms.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No messages yet</div>
            ) : (
              dmRooms.map((item) => (
                <button
                  key={item.roomId}
                  onClick={() => onOpenRoom(item)}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  {item.avatarUrl ? (
                    <img src={item.avatarUrl} alt={item.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#B34B0C' }}>
                      {item.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      {item.unread > 0 && (
                        <span className="text-xs rounded-full px-1.5 py-0.5" style={{ background: '#B34B0C', color: 'white' }}>
                          {item.unread}
                        </span>
                      )}
                    </div>
                    {item.lastMessage && (
                      <div className="text-xs text-gray-500 truncate">{item.lastMessage}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Launcher Button */}
      <button
        onClick={toggleTray}
        className="relative rounded-full shadow-xl hover:opacity-90 transition-opacity"
        style={{ width: 56, height: 56, backgroundColor: '#37322E', color: 'white' }}
        aria-label="Open messages"
      >
        <MessageCircle size={24} />
        {badge}
        {isOpen && (
          <div className="absolute -top-8 right-1 text-xs text-white/90 flex items-center gap-1">
            <ChevronUp size={14} />
          </div>
        )}
      </button>
    </div>
  )
}
