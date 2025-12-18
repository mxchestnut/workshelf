/**
 * Messages Page - Direct messaging interface
 * Connects to existing messaging API backend
 */
import { useState, useEffect, useRef } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { MessageCircle, Send, Search, User as UserIcon, Loader2, X } from 'lucide-react'
import { toast } from '../services/toast'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Message {
  id: number
  conversation_id: number
  sender_id: number
  content: string
  created_at: string
  is_read: boolean
  sender?: {
    id: number
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface Conversation {
  id: number
  participant_ids: number[]
  participants?: ConversationParticipant[]
  is_group: boolean
  title?: string
  last_message?: string
  last_message_at?: string
  unread_count: number
  updated_at: string
}

interface ConversationParticipant {
  id: number
  username: string
  display_name: string
  avatar_url?: string
}

interface SearchUser {
  id: number
  username: string
  display_name: string
  avatar_url?: string
}

export default function Messages() {
  const { user, login, logout, getAccessToken } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  // New conversation modal
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)

  // Matrix integration
  const [hasMatrixAccount, setHasMatrixAccount] = useState(false)
  const [showMatrixPrompt, setShowMatrixPrompt] = useState(false)
  const [showMatrixSetup, setShowMatrixSetup] = useState(false)
  const [matrixUsername, setMatrixUsername] = useState('')
  const [matrixHomeserver, setMatrixHomeserver] = useState('matrix.org')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadConversations()
      checkMatrixStatus()
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadUser = async () => {
    try {
    } catch (error) {
      console.error('Failed to load user:', error)
      login()
    }
  }

  const checkMatrixStatus = async () => {
    // Matrix is optional - messaging works without it
    // Just hide the Matrix prompts for now
    setHasMatrixAccount(true)
    return
  }

  const initializeMatrix = () => {
    setShowMatrixSetup(true)
    setShowMatrixPrompt(false)
  }

  const saveMatrixConnection = async () => {
    if (!matrixUsername.trim()) {
      toast.error('Please enter your Matrix username')
      return
    }

    try {
      const token = await getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matrix_username: matrixUsername,
          matrix_homeserver: matrixHomeserver
        })
      })

      if (response.ok) {
        setHasMatrixAccount(true)
        setShowMatrixSetup(false)
        toast.success('Matrix account connected! Use Element or any Matrix client to chat.')
      } else {
        toast.error('Failed to save Matrix connection')
      }
    } catch (error) {
      console.error('Failed to save Matrix connection:', error)
      toast.error('Failed to save Matrix connection')
    }
  }

  const loadConversations = async () => {
    // Conversations API not yet available
    setConversations([])
    setLoading(false)
  }

  const loadMessages = async (conversationId: number) => {
    try {
      setLoadingMessages(true)
      const token = await getAccessToken()
      const response = await fetch(
        `${API_URL}/api/v1/messaging/conversations/${conversationId}/messages?limit=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setMessages(data.reverse()) // Reverse to show oldest first

        // Mark conversation as read
        await markConversationRead(conversationId)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const markConversationRead = async (conversationId: number) => {
    try {
      const token = await getAccessToken()
      await fetch(`${API_URL}/api/v1/messaging/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Update unread count in UI
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ))
    } catch (error) {
      console.error('Failed to mark conversation as read:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedConversation || sending) return

    setSending(true)
    try {
      const token = await getAccessToken()
      const response = await fetch(
        `${API_URL}/api/v1/messaging/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: messageInput.trim() })
        }
      )

      if (response.ok) {
        const newMessage = await response.json()
        setMessages(prev => [...prev, newMessage])
        setMessageInput('')
        messageInputRef.current?.focus()

        // Update conversation list
        await loadConversations()
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    await loadMessages(conversation.id)
  }

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const token = await getAccessToken()
      const response = await fetch(
        `${API_URL}/api/v1/search/users?q=${encodeURIComponent(searchQuery)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results?.users || [])
      }
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setSearching(false)
    }
  }

  const startConversationWithUser = async (otherUser: SearchUser) => {
    try {
      const token = await getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/messaging/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participant_ids: [otherUser.id],
          is_group: false
        })
      })

      if (response.ok) {
        const conversation = await response.json()
        setShowNewConversation(false)
        setSearchQuery('')
        setSearchResults([])
        await loadConversations()
        await selectConversation(conversation)
      } else {
        toast.error('Failed to create conversation')
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create conversation')
    }
  }

  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.title) return conversation.title
    if (!conversation.participants || conversation.participants.length === 0) {
      return 'Conversation'
    }

    // Convert user.id to number for comparison
    const userId = user ? Number.parseInt((user as any).id, 10) : null

    // For DM, show other participant's name
    const otherParticipants = conversation.participants.filter(p => p.id !== userId)
    if (otherParticipants.length === 1) {
      return otherParticipants[0].display_name || otherParticipants[0].username
    }

    // For groups, show all participant names
    return otherParticipants.map(p => p.display_name || p.username).join(', ')
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-foreground" />
            <p className="mt-4 text-foreground">Loading messages...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />

      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        {/* Matrix Upgrade Banner */}
        {!hasMatrixAccount && !showMatrixPrompt && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Enable Advanced Messaging</p>
                <p className="text-sm opacity-90">Get real-time chat, typing indicators, read receipts & more with Matrix</p>
              </div>
            </div>
            <button
              onClick={() => setShowMatrixPrompt(true)}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-opacity-90"
            >
              Learn More
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages
              </h1>
              <button
                onClick={() => setShowNewConversation(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                New
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start a new conversation to get started!</p>
              </div>
            ) : (
              conversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`w-full p-4 text-left border-b border-border hover:bg-muted transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground truncate">
                          {getConversationTitle(conversation)}
                        </span>
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {formatTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message}
                        </p>
                      )}
                    </div>
                    {conversation.unread_count > 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0">
                        {conversation.unread_count}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <h2 className="text-lg font-semibold text-foreground">
                  {getConversationTitle(selectedConversation)}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {loadingMessages ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const userId = user ? Number.parseInt((user as any).id, 10) : null
                    const isOwn = message.sender_id === userId
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} rounded-lg px-4 py-2`}>
                          {!isOwn && message.sender && (
                            <div className="text-xs font-medium mb-1 opacity-75">
                              {message.sender.display_name || message.sender.username}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <div className={`text-xs mt-1 ${isOwn ? 'opacity-75' : 'opacity-50'}`}>
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <textarea
                    ref={messageInputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                    style={{ minHeight: '42px', maxHeight: '120px' }}
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sending}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center max-w-md px-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Select a conversation to start messaging</p>
                <p className="text-sm mb-4">or click "New" to start a new conversation</p>

                {hasMatrixAccount ? (
                  <div className="mt-6 p-4 bg-muted rounded-lg text-left">
                    <p className="text-sm font-semibold text-foreground mb-2">Matrix Connected</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your Matrix account: <span className="font-mono text-foreground">{matrixUsername}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Use Element or any Matrix client to message other Workshelf users in real-time.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMatrixPrompt(true)}
                    className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
                  >
                    Connect Matrix Account
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-md w-full p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">New Conversation</h2>
              <button
                onClick={() => {
                  setShowNewConversation(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search users..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground"
                />
                <button
                  onClick={searchUsers}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.length === 0 && searchQuery && !searching ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                searchResults.map(searchUser => (
                  <button
                    key={searchUser.id}
                    onClick={() => startConversationWithUser(searchUser)}
                    className="w-full p-3 rounded-lg hover:bg-muted text-left flex items-center gap-3 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {searchUser.display_name || searchUser.username}
                      </div>
                      {searchUser.display_name && (
                        <div className="text-sm text-muted-foreground">@{searchUser.username}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matrix Enable Modal */}
      {showMatrixPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Enable Matrix Chat</h2>
              <button
                onClick={() => setShowMatrixPrompt(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-foreground">
                Connect your Matrix account to enable real-time messaging with Element or any Matrix client.
              </p>

              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Use any Matrix client</strong> - Element, FluffyChat, Nheko, etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Real-time sync</strong> - Messages appear instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>End-to-end encryption</strong> - Secure by default</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Federation</strong> - Connect with users on any Matrix server</span>
                </li>
              </ul>

              <p className="text-sm text-muted-foreground">
                You'll need an existing Matrix account. Don't have one? Create one at{' '}
                <a href="https://app.element.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  element.io
                </a>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMatrixPrompt(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
              >
                Maybe Later
              </button>
              <button
                onClick={initializeMatrix}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                Connect Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Setup Modal */}
      {showMatrixSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Connect Matrix Account</h2>
              <button
                onClick={() => setShowMatrixSetup(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="matrix-username" className="block text-sm font-medium text-foreground mb-2">
                  Matrix Username
                </label>
                <input
                  id="matrix-username"
                  type="text"
                  value={matrixUsername}
                  onChange={(e) => setMatrixUsername(e.target.value)}
                  placeholder="@username:matrix.org"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your full Matrix ID (e.g., @alice:matrix.org)
                </p>
              </div>

              <div>
                <label htmlFor="matrix-homeserver" className="block text-sm font-medium text-foreground mb-2">
                  Homeserver
                </label>
                <input
                  id="matrix-homeserver"
                  type="text"
                  value={matrixHomeserver}
                  onChange={(e) => setMatrixHomeserver(e.target.value)}
                  placeholder="matrix.org"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The Matrix homeserver you're registered on
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-foreground mb-2">
                  <strong>How to find your Matrix ID:</strong>
                </p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Open Element (or your Matrix client)</li>
                  <li>Click on your profile/settings</li>
                  <li>Copy your Matrix ID (starts with @)</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMatrixSetup(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={saveMatrixConnection}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
