/**
 * Discover Page
 * Browse public groups and posts from the community
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { BookOpen, Pin, Clock } from 'lucide-react'

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

export function Discover() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        
        await loadDiscoverFeed()
      } catch (error) {
        console.error('Failed to load user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const loadDiscoverFeed = async () => {
    try {
      const token = authService.getToken()
      const endpoint = '/api/v1/feed/discover'
      
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
        console.error('Failed to load discover feed:', response.status)
      }
    } catch (error) {
      console.error('Error loading discover feed:', error)
    }
  }

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
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="discover" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: '#B34B0C' }} />
            <p style={{ color: '#B3B2B0' }}>Loading discover feed...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="discover" />
      
      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {posts.length === 0 ? (
          <div className="rounded-lg shadow-sm border p-12 text-center" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h2 className="text-xl font-bold text-white mb-2">
              No posts to discover
            </h2>
            <p className="mb-6" style={{ color: '#B3B2B0' }}>
              Check back later for new posts from public groups.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article 
                key={post.id}
                className="rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
                style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}
              >
                {/* Group & Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  {post.group.avatar_url && (
                    <img 
                      src={post.group.avatar_url} 
                      alt={post.group.name}
                      className="w-10 h-10 rounded-full"
                      loading="lazy"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.location.href = `/group/${post.group.slug}`}
                        className="font-semibold text-white hover:underline truncate"
                      >
                        {post.group.name}
                      </button>
                      {post.is_pinned && (
                        <Pin className="w-4 h-4 flex-shrink-0" style={{ color: '#B34B0C' }} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#B3B2B0' }}>
                      <span>{post.author.display_name}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                <p className="whitespace-pre-wrap" style={{ color: '#B3B2B0' }}>
                  {post.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
