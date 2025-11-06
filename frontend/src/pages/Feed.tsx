/**
 * Personal Feed Page
 * User's personalized feed after login
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { BookOpen, Users, Pin, Clock, Search, User as UserIcon } from 'lucide-react'

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
        if (!currentUser) {
          window.location.href = '/'
          return
        }
        setUser(currentUser)
        
        // Load feed posts
        await loadFeed()
      } catch (error) {
        console.error('Failed to load user:', error)
        window.location.href = '/'
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-neutral">Loading your feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-lightest">
      {/* Header */}
      <div className="bg-white border-b border-neutral-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-neutral-darkest">Feed</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.location.href = '/profile'}
                className="p-2 hover:bg-neutral-lightest rounded-lg transition-colors"
                title="Profile"
              >
                <UserIcon className="w-5 h-5 text-neutral" />
              </button>
              <button className="p-2 hover:bg-neutral-lightest rounded-lg transition-colors">
                <Search className="w-5 h-5 text-neutral" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'bg-primary text-white'
                  : 'text-neutral hover:bg-neutral-lightest'
              }`}
            >
              Your Feed
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'discover'
                  ? 'bg-primary text-white'
                  : 'text-neutral hover:bg-neutral-lightest'
              }`}
            >
              Discover
            </button>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-12 text-center">
            <BookOpen className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-darkest mb-2">
              {activeTab === 'feed' ? 'Your feed is empty' : 'No posts to discover'}
            </h2>
            <p className="text-neutral mb-6">
              {activeTab === 'feed' 
                ? 'Join groups to see posts from your communities.' 
                : 'Check back later for new posts from public groups.'}
            </p>
            {activeTab === 'feed' && (
              <button 
                onClick={() => setActiveTab('discover')}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
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
                className="bg-white rounded-lg shadow-sm border border-neutral-light p-6 hover:shadow-md transition-shadow"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {post.author.display_name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-darkest">
                          {post.author.display_name}
                        </span>
                        {post.author.username && (
                          <span className="text-neutral text-sm">@{post.author.username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral">
                        <span>in</span>
                        <span className="font-medium text-primary hover:underline cursor-pointer">
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
                    <div className="flex items-center gap-1 text-primary text-sm">
                      <Pin className="w-4 h-4" />
                      <span>Pinned</span>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <h3 className="text-xl font-bold text-neutral-darkest mb-2">
                  {post.title}
                </h3>
                <p className="text-neutral whitespace-pre-wrap mb-4">
                  {post.content.length > 300 
                    ? post.content.substring(0, 300) + '...' 
                    : post.content}
                </p>

                {/* Post Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-neutral-light">
                  <button className="text-neutral hover:text-primary transition-colors text-sm font-medium">
                    Reply
                  </button>
                  <button className="text-neutral hover:text-primary transition-colors text-sm font-medium">
                    React
                  </button>
                  <button className="text-neutral hover:text-primary transition-colors text-sm font-medium">
                    Share
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* User Info (for debugging) */}
        {user?.is_staff && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              <strong>Staff Account:</strong> You have platform administration access
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
