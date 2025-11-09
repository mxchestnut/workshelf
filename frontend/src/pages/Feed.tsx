/**
 * Personal Feed Page
 * User's personalized feed after login
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { BookOpen, Pin, Clock, Search, User as UserIcon } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface PostAuthor {
  id: number
  username: string | null
  display_name: string
  avatar_url: string | null
}

interface GroupInfo {
  id: number
  name: string
  slug: string
  avatar_url: string | null
}

interface FeedPost {
  id: number
  title: string
  content: string
  created_at: string
  is_pinned: boolean
  author: PostAuthor
  group: GroupInfo
}

export function Feed() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'feed' | 'discover'>('feed')

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        
        // Only load feed if we have a user
        if (currentUser) {
          await loadFeed()
        }
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const loadFeed = async () => {
    try {
      const token = authService.getToken()
      const endpoint = activeTab === 'feed' ? '/api/v1/feed' : '/api/v1/feed/discover'
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        mode: 'cors'
      })

      if (response.ok) {
        const feedPosts = await response.json()
        setPosts(feedPosts)
      } else {
        console.error('Failed to load feed:', response.status)
      }
    } catch (error) {
      console.error('Error loading feed:', error)
    }
  }

  useEffect(() => {
    if (user) {
      loadFeed()
    }
  }, [activeTab])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="feed" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: '#B34B0C' }} />
            <p style={{ color: '#B3B2B0' }}>Loading your feed...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="feed" />
      
      {/* Header */}
      <div className="border-b sticky top-0 z-10" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Feed</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.location.href = '/me'}
                className="p-2 rounded-lg transition-colors text-white hover:bg-opacity-20"
                title="Profile"
              >
                <UserIcon className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg transition-colors text-white hover:bg-opacity-20">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'text-white'
                  : 'text-white hover:bg-opacity-20'
              }`}
              style={activeTab === 'feed' ? { backgroundColor: '#B34B0C' } : {}}
            >
              Your Feed
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'discover'
                  ? 'text-white'
                  : 'text-white hover:bg-opacity-20'
              }`}
              style={activeTab === 'discover' ? { backgroundColor: '#B34B0C' } : {}}
            >
              Discover
            </button>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {posts.length === 0 ? (
          <div className="rounded-lg shadow-sm border p-12 text-center" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h2 className="text-xl font-bold text-white mb-2">
              {activeTab === 'feed' ? 'Your feed is empty' : 'No posts to discover'}
            </h2>
            <p className="mb-6" style={{ color: '#B3B2B0' }}>
              {activeTab === 'feed' 
                ? 'Join groups to see posts from your communities.' 
                : 'Check back later for new posts from public groups.'}
            </p>
            {activeTab === 'feed' && (
              <button 
                onClick={() => setActiveTab('discover')}
                className="text-white px-6 py-3 rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#B34B0C' }}
              >
                Discover Groups
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article 
                key={post.id}
                className="rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                      <span className="font-semibold" style={{ color: '#B34B0C' }}>
                        {post.author.display_name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {post.author.display_name}
                        </span>
                        {post.author.username && (
                          <span className="text-sm" style={{ color: '#B3B2B0' }}>@{post.author.username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#B3B2B0' }}>
                        <span>in</span>
                        <span className="font-medium hover:underline cursor-pointer" style={{ color: '#B34B0C' }}>
                          {post.group.name}
                        </span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {post.is_pinned && (
                    <div className="flex items-center gap-1 text-sm" style={{ color: '#B34B0C' }}>
                      <Pin className="w-4 h-4" />
                      <span>Pinned</span>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {post.title}
                </h3>
                <p className="whitespace-pre-wrap mb-4" style={{ color: '#B3B2B0' }}>
                  {post.content.length > 300 
                    ? post.content.substring(0, 300) + '...' 
                    : post.content}
                </p>

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-4 border-t" style={{ borderColor: '#6C6A68' }}>
                  <button className="transition-colors text-sm font-medium text-white hover:opacity-80" style={{ color: '#B3B2B0' }}>
                    Reply
                  </button>
                  <button className="transition-colors text-sm font-medium hover:opacity-80" style={{ color: '#B3B2B0' }}>
                    React
                  </button>
                  <button className="transition-colors text-sm font-medium hover:opacity-80" style={{ color: '#B3B2B0' }}>
                    Share
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* User Info (for debugging) */}
        {user?.is_staff && (
          <div className="mt-6 border rounded-lg p-4" style={{ backgroundColor: 'rgba(179, 75, 12, 0.1)', borderColor: '#B34B0C' }}>
            <p className="text-sm" style={{ color: '#B34B0C' }}>
              <strong>Staff Account:</strong> You have platform administration access
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
