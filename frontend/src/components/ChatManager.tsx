/**
 * ChatManager Component
 * Manages multiple floating chat popups (Facebook-style)
 * Handles positioning, state, and coordinates with Matrix SDK
 */
import { useState, useEffect } from 'react'
import { ChatPopup } from './ChatPopup'

interface Chat {
  id: string
  roomId: string
  recipientName: string
  recipientAvatar?: string
  isMinimized: boolean
}

export function ChatManager() {
  const [openChats, setOpenChats] = useState<Chat[]>([])

  useEffect(() => {
    // Listen for custom events to open new chats
    const handleOpenChat = (event: CustomEvent) => {
      const { roomId, userName, userAvatar } = event.detail
      openChat(roomId, userName, userAvatar)
    }

    window.addEventListener('openChat', handleOpenChat as EventListener)

    return () => {
      window.removeEventListener('openChat', handleOpenChat as EventListener)
    }
  }, [openChats])

  const openChat = (roomId: string, recipientName: string, recipientAvatar?: string) => {
    // Check if chat already open
    const existingChat = openChats.find(chat => chat.roomId === roomId)
    
    if (existingChat) {
      // Unminimize and bring to front if already open
      setOpenChats(prev => 
        prev.map(chat => 
          chat.roomId === roomId 
            ? { ...chat, isMinimized: false } 
            : chat
        )
      )
      return
    }

    // Limit to 3 open chats max (to prevent screen clutter)
    if (openChats.length >= 3) {
      console.warn('[ChatManager] Maximum 3 chats allowed')
      return
    }

    // Open new chat
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      roomId,
      recipientName,
      recipientAvatar,
      isMinimized: false
    }
    
    setOpenChats(prev => [...prev, newChat])
  }

  const closeChat = (chatId: string) => {
    setOpenChats(prev => prev.filter(chat => chat.id !== chatId))
  }

  const toggleMinimize = (chatId: string) => {
    setOpenChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? { ...chat, isMinimized: !chat.isMinimized }
          : chat
      )
    )
  }

  return (
    <>
      {openChats.map((chat, index) => (
        <div
          key={chat.id}
          style={{
            position: 'fixed',
            bottom: 0,
            right: `${16 + (index * 336)}px`, // 320px width + 16px gap
            zIndex: 9999
          }}
        >
          <ChatPopup
            roomId={chat.roomId}
            recipientName={chat.recipientName}
            recipientAvatar={chat.recipientAvatar}
            onClose={() => closeChat(chat.id)}
            isMinimized={chat.isMinimized}
            onToggleMinimize={() => toggleMinimize(chat.id)}
          />
        </div>
      ))}
    </>
  )
}
