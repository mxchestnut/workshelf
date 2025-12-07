/**
 * Personal Feed Page
 * User's personalized feed after login with multiple tabs
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { SaveToCollectionModal } from '../components/SaveToCollectionModal'
import { BookOpen, Pin, Clock, Users, Bell, Sparkles, Globe } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

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
  upvotes: number
  downvotes: number
  score: number
}

export function Feed() {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FeedTab>('personal')
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<{ id: number; title: string } | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'top' | 'controversial'>('newest')

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[Feed] Loading user...')
        const currentUser = await authService.getCurrentUser()
        console.log('[Feed] User loaded:', currentUser)
        setUser(currentUser)
        
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
  }, [activeTab, sortBy])

  const loadFeed = async (tab: FeedTab, sort: string = sortBy) => {
    try {
      const token = authService.getToken()
      
      // Map tabs to API endpoints
      const endpointMap: Record<FeedTab, string> = {
        'personal': '/api/v1/feed',
        'updates': '/api/v1/feed/updates',
        'beta-feed': '/api/v1/feed/beta',
        'groups': '/api/v1/feed',
        'global': '/api/v1/feed/global',
        'discover': '/api/v1/feed/discover'
      }
      
      const endpoint = endpointMap[tab] || '/api/v1/feed'
      const sortParam = sort !== 'newest' ? `?sort=${sort}` : ''
      
      const response = await fetch(`${API_URL}${endpoint}${sortParam}`, {
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
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="feed" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse text-foreground" />
            <p className="text-muted-foreground">Loading your feed...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="feed" />
      
      {/* Feed Tabs */}
      <div className="border-b border-border bg-muted">
        <div className="max-w-4xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'personal' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ 
                borderColor: activeTab === 'personal' ? 'hsl(var(--primary))' : 'transparent'
              }}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'updates' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ 
                borderColor: activeTab === 'updates' ? 'hsl(var(--primary))' : 'transparent'
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
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{ 
                  borderColor: activeTab === 'beta-feed' ? 'hsl(var(--primary))' : 'transparent'
                }}
              >
                Beta Feed
              </button>
            )}
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'groups' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ 
                borderColor: activeTab === 'groups' ? 'hsl(var(--primary))' : 'transparent'
              }}
            >
              <Users className="w-4 h-4" />
              Groups
            </button>
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'global' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ 
                borderColor: activeTab === 'global' ? 'hsl(var(--primary))' : 'transparent'
              }}
            >
              <Globe className="w-4 h-4" />
              Global
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === 'discover' 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ 
                borderColor: activeTab === 'discover' ? 'hsl(var(--primary))' : 'transparent'
              }}
            >
              <Sparkles className="w-4 h-4" />
              Discover
            </button>
          </nav>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'top' | 'controversial')}
            className="px-3 py-1.5 border border-border rounded bg-background text-foreground text-sm"
          >
            <option value="newest">Newest</option>
            <option value="top">Top Voted</option>
            <option value="controversial">Controversial</option>
          </select>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {posts.length === 0 ? (
          <div className="rounded-lg shadow-sm border p-12 text-center bg-muted border-border">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {activeTab === 'personal' && 'Your personal feed is empty'}
              {activeTab === 'updates' && 'No updates yet'}
              {activeTab === 'beta-feed' && 'No beta reading content'}
              {activeTab === 'groups' && 'No group posts yet'}
              {activeTab === 'global' && 'No public posts yet'}
              {activeTab === 'discover' && 'Discover new content'}
            </h2>
            <p className="mb-6 text-muted-foreground">
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
                className="bg-primary text-foreground px-6 py-3 rounded-lg transition-colors hover:opacity-90"
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
                className="rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow bg-muted border-border"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                      <span className="font-semibold text-foreground">
                        {post.author.display_name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {post.author.display_name}
                        </span>
                        {post.author.username && (
                          <span className="text-sm text-muted-foreground">@{post.author.username}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>in</span>
                        <a 
                          href={`/groups/${post.group.slug}`}
                          className="font-medium hover:underline cursor-pointer text-foreground"
                        >
                          {post.group.name}
                        </a>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(post.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {post.is_pinned && (
                    <div className="flex items-center gap-1 text-sm text-foreground">
                      <Pin className="w-4 h-4" />
                      <span>Pinned</span>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <h3 className="text-xl font-bold text-foreground mb-2">
                  <a 
                    href={`/groups/${post.group.slug}/posts/${post.id}`}
                    className="hover:underline"
                  >
                    {post.title}
                  </a>
                </h3>
                <p className="whitespace-pre-wrap mb-4 text-muted-foreground">
                  {post.content.length > 300 
                    ? post.content.substring(0, 300) + '...' 
                    : post.content}
                </p>

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-border">
                  {/* Upvote/Downvote */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        try {
                          const token = await authService.getAccessToken()
                          await fetch(`${API_URL}/api/v1/groups/${post.group.id}/posts/${post.id}/vote?vote_type=upvote`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                          loadFeed(activeTab)
                        } catch (error) {
                          console.error('Vote error:', error)
                        }
                      }}
                      className="transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <span className="text-sm font-medium text-foreground">{post.score}</span>
                    <button 
                      onClick={async () => {
                        try {
                          const token = await authService.getAccessToken()
                          await fetch(`${API_URL}/api/v1/groups/${post.group.id}/posts/${post.id}/vote?vote_type=downvote`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                          loadFeed(activeTab)
                        } catch (error) {
                          console.error('Vote error:', error)
                        }
                      }}
                      className="transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => window.location.href = `/groups/${post.group.slug}/posts/${post.id}`}
                    className="transition-colors text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Reply
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedPost({ id: post.id, title: post.title })
                      setSaveModalOpen(true)
                    }}
                    className="transition-colors text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* User Info (for debugging) */}
        {user?.is_staff && (
          <div className="mt-6 border rounded-lg p-4 bg-muted border-border">
            <p className="text-sm text-foreground">
              <strong>Staff Account:</strong> You have platform administration access
            </p>
          </div>
        )}
      </div>
      
      {/* Save to Collection Modal */}
      {selectedPost && (
        <SaveToCollectionModal
          isOpen={saveModalOpen}
          onClose={() => {
            setSaveModalOpen(false)
            setSelectedPost(null)
          }}
          itemType="post"
          itemId={selectedPost.id}
          itemTitle={selectedPost.title}
        />
      )}
    </div>
  )
}
