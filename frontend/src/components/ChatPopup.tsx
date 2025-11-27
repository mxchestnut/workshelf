/**
 * ChatPopup Component
 * Facebook-style floating chat window that appears in bottom-right
 * Supports minimize/maximize and works alongside Element app
 */
import { useEffect, useState, useRef } from 'react'
import { X, Minimize2, Maximize2, Send } from 'lucide-react'
import { useMatrix } from '../hooks/useMatrixClient.tsx'
import * as matrix from 'matrix-js-sdk'

interface ChatPopupProps {
  roomId: string
  recipientName: string
  recipientAvatar?: string
  onClose: () => void
  isMinimized: boolean
  onToggleMinimize: () => void
}

interface Message {
  id: string
  sender: string
  body: string
  timestamp: number
  isMe: boolean
}

export function ChatPopup({ 
  roomId, 
  recipientName, 
  recipientAvatar,
  onClose,
  isMinimized,
  onToggleMinimize 
}: ChatPopupProps) {
  const { client } = useMatrix()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!client) return

    const loadMessages = () => {
      const room = client.getRoom(roomId)
      if (!room) {
        console.warn('[ChatPopup] Room not found:', roomId)
        setIsLoading(false)
        return
      }

      const timeline = room.getLiveTimeline().getEvents()
      const messageEvents = timeline
        .filter(e => e.getType() === 'm.room.message')
        .map(event => ({
          id: event.getId() || '',
          sender: event.getSender() || '',
          body: event.getContent().body || '',
          timestamp: event.getTs(),
          isMe: event.getSender() === client.getUserId()
        }))

      setMessages(messageEvents)
      setIsLoading(false)
      setTimeout(scrollToBottom, 100)
    }

    loadMessages()

    // Listen for new messages in this room
    const onTimeline = (event: matrix.MatrixEvent, room: matrix.Room | undefined) => {
      if (room?.roomId === roomId && event.getType() === 'm.room.message') {
        const newMessage: Message = {
          id: event.getId() || '',
          sender: event.getSender() || '',
          body: event.getContent().body || '',
          timestamp: event.getTs(),
          isMe: event.getSender() === client.getUserId()
        }
        setMessages(prev => [...prev, newMessage])
        setTimeout(scrollToBottom, 100)
      }
    }

    client.on(matrix.RoomEvent.Timeline, onTimeline)

    return () => {
      client.off(matrix.RoomEvent.Timeline, onTimeline)
    }
  }, [client, roomId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || !client) return
    
    try {
      await client.sendTextMessage(roomId, inputValue)
      setInputValue('')
    } catch (error) {
      console.error('[ChatPopup] Failed to send message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div 
      className="fixed bottom-0 bg-white rounded-t-lg shadow-2xl flex flex-col"
      style={{ 
        height: isMinimized ? '56px' : '500px',
        width: '320px',
        transition: 'height 0.3s ease',
        zIndex: 9999,
        border: '1px solid #E5E5E5'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer rounded-t-lg bg-muted"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {recipientAvatar ? (
            <img 
              src={recipientAvatar} 
              className="w-8 h-8 rounded-full flex-shrink-0"
              alt={recipientName}
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary"
            >
              <span className="text-primary-foreground text-sm font-bold">
                {recipientName[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <span className="text-foreground font-medium truncate">{recipientName}</span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onToggleMinimize()
            }}
            className="text-foreground hover:bg-accent p-1 rounded transition-colors"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="text-foreground hover:bg-accent p-1 rounded transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs px-4 py-2 rounded-lg break-words ${
                      message.isMe 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 bg-card flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background text-foreground"
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
