/**
 * Personal Feed Page
 * User's personalized feed after login with multiple tabs
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { MatrixOnboardingModal } from '../components/MatrixOnboardingModal'
import { BookOpen, Pin, Clock, Users, Bell, Sparkles, Globe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

type FeedTab = 'personal' | 'updates' | 'beta-feed' | 'groups' | 'global' | 'discover'

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
  const [activeTab, setActiveTab] = useState<FeedTab>('personal')
  const [showMatrixOnboarding, setShowMatrixOnboarding] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[Feed] Loading user...')
        const currentUser = await authService.getCurrentUser()
        console.log('[Feed] User loaded:', currentUser)
        setUser(currentUser)
        
        // Check if user needs to see Matrix onboarding
        if (currentUser && currentUser.username && !currentUser.matrix_onboarding_seen) {
          setShowMatrixOnboarding(true)
        }
        
        // Only load feed if we have a user
        if (currentUser) {
          await loadFeed(activeTab)
        } else {
          console.warn('[Feed] No user found, redirecting to login')
          authService.login()
        }
      } catch (error) {
        console.error('[Feed] Failed to load user:', error)
        // Redirect to login if user fetch fails
        authService.login()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeTab])

  const loadFeed = async (tab: FeedTab) => {
    try {
      const token = authService.getToken()
      
      // Map tabs to API endpoints
      const endpointMap: Record<FeedTab, string> = {
        'personal': '/api/v1/feed/personal',
        'updates': '/api/v1/feed/updates',
        'beta-feed': '/api/v1/feed/beta',
        'groups': '/api/v1/feed/groups',
        'global': '/api/v1/feed/global',
        'discover': '/api/v1/feed/discover'
      }
      
      const endpoint = endpointMap[tab] || '/api/v1/feed'
      
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
      
      {/* Feed Tabs */}
      <div className="border-b" style={{ borderColor: '#6C6A68', backgroundColor: '#524944' }}>
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'personal' 
                  ? 'text-white' 
                  : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ 
                borderColor: activeTab === 'personal' ? '#B34B0C' : 'transparent'
              }}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'updates' 
                  ? 'text-white' 
                  : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ 
                borderColor: activeTab === 'updates' ? '#B34B0C' : 'transparent'
              }}
            >
              <Bell className="w-4 h-4" />
              Updates
            </button>
            {user?.groups && user.groups.length > 0 && (
              <button
                onClick={() => setActiveTab('beta-feed')}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === 'beta-feed' 
                    ? 'text-white' 
                    : 'text-[#B3B2B0] hover:text-white'
                }`}
                style={{ 
                  borderColor: activeTab === 'beta-feed' ? '#B34B0C' : 'transparent'
                }}
              >
                Beta Feed
              </button>
            )}
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'groups' 
                  ? 'text-white' 
                  : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ 
                borderColor: activeTab === 'groups' ? '#B34B0C' : 'transparent'
              }}
            >
              <Users className="w-4 h-4" />
              Groups
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'global' 
                  ? 'text-white' 
                  : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ 
                borderColor: activeTab === 'global' ? '#B34B0C' : 'transparent'
              }}
            >
              <Globe className="w-4 h-4" />
              Global
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'discover' 
                  ? 'text-white' 
                  : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ 
                borderColor: activeTab === 'discover' ? '#B34B0C' : 'transparent'
              }}
            >
              <Sparkles className="w-4 h-4" />
              Discover
            </button>
          </nav>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {posts.length === 0 ? (
          <div className="rounded-lg shadow-sm border p-12 text-center" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h2 className="text-xl font-bold text-white mb-2">
              {activeTab === 'personal' && 'Your personal feed is empty'}
              {activeTab === 'updates' && 'No updates yet'}
              {activeTab === 'beta-feed' && 'No beta reading content'}
              {activeTab === 'groups' && 'No group posts yet'}
              {activeTab === 'global' && 'No public posts yet'}
              {activeTab === 'discover' && 'Discover new content'}
            </h2>
            <p className="mb-6" style={{ color: '#B3B2B0' }}>
              {activeTab === 'personal' && 'Follow friends and writers to see their posts here.'}
              {activeTab === 'updates' && 'Updates from your followed stories, writers, and books will appear here.'}
              {activeTab === 'beta-feed' && 'Beta reading content will appear here if you\'re a beta reader.'}
              {activeTab === 'groups' && 'Join groups to see posts from your communities.'}
              {activeTab === 'global' && 'Public posts from across the platform will appear here.'}
              {activeTab === 'discover' && 'Personalized recommendations based on your interests.'}
            </p>
            {(activeTab === 'groups' || activeTab === 'discover') && (
              <button 
                onClick={() => window.location.href = '/groups'}
                className="text-white px-6 py-3 rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: '#B34B0C' }}
              >
                {activeTab === 'groups' ? 'Browse Groups' : 'Explore Content'}
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

      {/* Matrix Onboarding Modal for Existing Users */}
      {showMatrixOnboarding && (
        <MatrixOnboardingModal onClose={() => setShowMatrixOnboarding(false)} />
      )}
    </div>
  )
}
