/**
 * ChatBar Component
 * Floating chat dock at bottom of screen with Messages and AI Assistant tabs
 */
import { useState, useEffect } from 'react'
import { MessageCircle, Bot, X, Minus } from 'lucide-react'
import AIChat from './AIChat'
import MessagesChat from './MessagesChat'
import { chatBarEvents } from '../utils/chatBarEvents'

type ChatTab = 'messages' | 'ai' | null

export default function ChatBar() {
  const [activeTab, setActiveTab] = useState<ChatTab>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [aiContext, setAiContext] = useState<string | undefined>()

  // Listen for events to open AI chat with context
  useEffect(() => {
    const unsubscribe = chatBarEvents.subscribe(({ initialContext }) => {
      setAiContext(initialContext)
      setActiveTab('ai')
      setIsMinimized(false)
    })
    return unsubscribe
  }, [])

  const openTab = (tab: ChatTab) => {
    setActiveTab(tab)
    setIsMinimized(false)
    if (tab === 'ai') {
      setAiContext(undefined) // Clear context when manually opening
    }
  }

  const closeChat = () => {
    setActiveTab(null)
    setIsMinimized(false)
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  return (
    <>
      {/* Floating Chat Window */}
      {activeTab && (
        <div className={`fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-2xl transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-[600px]'
        } w-96 flex flex-col z-50`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              {activeTab === 'ai' ? (
                <>
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-semibold">AI Assistant</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Messages</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-accent rounded transition-colors"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="p-1 hover:bg-accent rounded transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              {activeTab === 'ai' ? <AIChat initialContext={aiContext} /> : <MessagesChat />}
            </div>
          )}
        </div>
      )}

      {/* Floating Dock */}
      <div className="fixed bottom-6 right-6 flex gap-3 z-50">
        <button
          onClick={() => openTab('messages')}
          className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 ${
            activeTab === 'messages' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
          }`}
          aria-label="Open messages"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <button
          onClick={() => openTab('ai')}
          className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 ${
            activeTab === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'
          }`}
          aria-label="Open AI assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    </>
  )
}
