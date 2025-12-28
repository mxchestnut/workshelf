/**
 * Public Profile Page - View user profiles with social features
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { toast } from '../services/toast'
import {
  User, MapPin, Calendar, ExternalLink, Globe, Twitter,
  BookOpen, FileText, Book, Star, UserPlus, UserMinus, MessageCircle,
  X
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

interface PublicProfileData {
  user_id: number
  username: string
  email?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  location?: string
  website?: string
  twitter_handle?: string
  created_at: string
  document_count: number
  follower_count: number
  following_count: number
  is_following?: boolean
  reputation_score?: number
}

interface Document {
  id: number
  title: string
  word_count: number
  status: string
  created_at: string
}

interface VaultItem {
  id: number
  title: string
  author: string
  cover_url?: string
  status: string
}

interface FollowUser {
  user_id: number
  username: string
  display_name?: string
  avatar_url?: string
  followed_at?: string
}

export default function PublicProfile() {
  const { user: currentUser, login, logout } = useAuth()
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [vault, setVault] = useState<VaultItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'documents' | 'vault'>('documents')
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const username = params.get('username')

      if (!username) {
        throw new Error('No username provided')
      }

      const token = localStorage.getItem('access_token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}/api/v1/users/${username}/public-profile`, {
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await response.json()
      setProfile(data.profile)
      setDocuments(data.documents || [])
      setVault(data.vault || [])
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!profile || !currentUser) {
      toast.error('Please log in to follow users')
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/relationships/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          following_id: profile.user_id
        })
      })

      if (response.ok) {
        toast.success(`Now following ${profile.display_name || profile.username}`)
        setProfile({ ...profile, is_following: true, follower_count: profile.follower_count + 1 })
      } else {
        toast.error('Failed to follow user')
      }
    } catch (error) {
      console.error('Error following user:', error)
      toast.error('Failed to follow user')
    }
  }

  const handleUnfollow = async () => {
    if (!profile || !currentUser) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/relationships/unfollow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          following_id: profile.user_id
        })
      })

      if (response.ok) {
        toast.success(`Unfollowed ${profile.display_name || profile.username}`)
        setProfile({ ...profile, is_following: false, follower_count: profile.follower_count - 1 })
      } else {
        toast.error('Failed to unfollow user')
      }
    } catch (error) {
      console.error('Error unfollowing user:', error)
      toast.error('Failed to unfollow user')
    }
  }

  const handleMessage = async () => {
    // Matrix messaging was removed
    toast.info('Messaging feature coming soon')
  }

  const openFollowers = async () => {
    if (!profile) return

    setShowFollowersModal(true)
    setLoadingFollowers(true)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/relationships/followers?user_id=${profile.user_id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers || [])
      } else {
        toast.error('Failed to load followers')
      }
    } catch (error) {
      console.error('Error loading followers:', error)
      toast.error('Failed to load followers')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const openFollowing = async () => {
    if (!profile) return

    setShowFollowingModal(true)
    setLoadingFollowers(true)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/relationships/following?user_id=${profile.user_id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following || [])
      } else {
        toast.error('Failed to load following')
      }
    } catch (error) {
      console.error('Error loading following:', error)
      toast.error('Failed to load following')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const closeFollowers = () => setShowFollowersModal(false)
  const closeFollowing = () => setShowFollowingModal(false)

  const renderUserList = (users: FollowUser[], title: string) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => {
      if (e.target === e.currentTarget) {
        title === 'Followers' ? closeFollowers() : closeFollowing()
      }
    }}>
      <div className="rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" style={{ backgroundColor: '#524944' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#F1EEEB' }}>{title}</h2>
          <button
            onClick={title === 'Followers' ? closeFollowers : closeFollowing}
            className="p-2 rounded-lg hover:bg-black/20 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#B3B2B0' }} />
          </button>
        </div>

        {loadingFollowers ? (
          <div className="text-center py-8" style={{ color: '#B3B2B0' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#B3B2B0' }}>No {title.toLowerCase()} yet</div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={`${user.username}'s profile picture`} className="w-12 h-12 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6C6A68' }}>
                      <User className="w-6 h-6" style={{ color: '#B3B2B0' }} />
                    </div>
                  )}
                  <div>
                    <div className="font-medium" style={{ color: '#F1EEEB' }}>
                      {user.display_name || user.username}
                    </div>
                    <div className="text-sm" style={{ color: '#B3B2B0' }}>@{user.username}</div>
                    {user.followed_at && (
                      <div className="text-xs mt-1" style={{ color: '#B3B2B0' }}>
                        Since {new Date(user.followed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = `/profile?username=${user.username}`}
                  className="px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                >
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={currentUser} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading profile...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={currentUser} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div style={{ color: '#B3B2B0' }}>Profile not found</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={currentUser} onLogin={() => login()} onLogout={() => logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">

      <div className="max-w-5xl mx-auto px-6 py-24">
        {/* Profile Header */}
        <div className="rounded-lg p-8 mb-8" style={{ backgroundColor: '#524944' }}>
          <div className="flex items-start gap-6">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={`${profile.username}'s profile picture`} className="w-32 h-32 rounded-full" />
            ) : (
              <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6C6A68' }}>
                <User className="w-16 h-16" style={{ color: '#B3B2B0' }} />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{ color: '#F1EEEB' }}>
                    {profile.display_name || profile.username}
                  </h1>
                  <p className="text-lg" style={{ color: '#B3B2B0' }}>@{profile.username}</p>
                </div>

                {currentUser && currentUser.id !== profile.user_id && (
                  <div className="flex gap-3">
                    {profile.is_following ? (
                      <button
                        onClick={handleUnfollow}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#6C6A68', color: '#F1EEEB' }}
                      >
                        <UserMinus className="w-4 h-4" />
                        Unfollow
                      </button>
                    ) : (
                      <button
                        onClick={handleFollow}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                      >
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </button>
                    )}
                    <button
                      onClick={handleMessage}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#524944', borderColor: '#6C6A68', borderWidth: '1px', color: '#F1EEEB' }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                )}
              </div>

              {profile.bio && (
                <p className="mb-4" style={{ color: '#F1EEEB' }}>{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 mb-4 text-sm" style={{ color: '#B3B2B0' }}>
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: '#EDAC53' }}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {profile.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: '#EDAC53' }}
                  >
                    <Twitter className="w-4 h-4" />
                    <span>@{profile.twitter_handle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex gap-6 text-sm">
                <button
                  onClick={openFollowers}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: '#F1EEEB' }}
                >
                  <span className="font-bold">{profile.follower_count}</span>{' '}
                  <span style={{ color: '#B3B2B0' }}>Followers</span>
                </button>
                <button
                  onClick={openFollowing}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: '#F1EEEB' }}
                >
                  <span className="font-bold">{profile.following_count}</span>{' '}
                  <span style={{ color: '#B3B2B0' }}>Following</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6" style={{ color: '#EDAC53' }} />
              <span className="text-2xl font-bold" style={{ color: '#F1EEEB' }}>{profile.document_count}</span>
            </div>
            <p style={{ color: '#B3B2B0' }}>Documents</p>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6" style={{ color: '#EDAC53' }} />
              <span className="text-2xl font-bold" style={{ color: '#F1EEEB' }}>{vault.length}</span>
            </div>
            <p style={{ color: '#B3B2B0' }}>Books</p>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6" style={{ color: '#EDAC53' }} />
              <span className="text-2xl font-bold" style={{ color: '#F1EEEB' }}>{profile.reputation_score || 0}</span>
            </div>
            <p style={{ color: '#B3B2B0' }}>Reputation</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6" style={{ borderColor: '#6C6A68' }}>
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'documents' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'documents' ? '#EDAC53' : '#B3B2B0',
                borderColor: activeTab === 'documents' ? '#EDAC53' : 'transparent'
              }}
            >
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === 'vault' ? 'border-b-2' : ''
              }`}
              style={{
                color: activeTab === 'vault' ? '#EDAC53' : '#B3B2B0',
                borderColor: activeTab === 'vault' ? '#EDAC53' : 'transparent'
              }}
            >
              Vault ({vault.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'documents' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.length === 0 ? (
              <div className="col-span-2 text-center py-12" style={{ color: '#B3B2B0' }}>
                No public documents yet
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg p-6 hover:scale-105 transition-transform cursor-pointer"
                  style={{ backgroundColor: '#524944' }}
                  onClick={() => window.location.href = `/document?id=${doc.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <FileText className="w-6 h-6" style={{ color: '#EDAC53' }} />
                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#6C6A68', color: '#F1EEEB' }}>
                      {doc.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#F1EEEB' }}>
                    {doc.title || 'Untitled'}
                  </h3>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>
                    {doc.word_count.toLocaleString()} words
                  </p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {vault.length === 0 ? (
              <div className="col-span-4 text-center py-12" style={{ color: '#B3B2B0' }}>
                No books on shelf yet
              </div>
            ) : (
              vault.map((book) => (
                <div key={book.id} className="rounded-lg overflow-hidden hover:scale-105 transition-transform">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={`Book cover for ${book.title}`} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] flex items-center justify-center" style={{ backgroundColor: '#524944' }}>
                      <Book className="w-12 h-12" style={{ color: '#B3B2B0' }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showFollowersModal && renderUserList(followers, 'Followers')}
      {showFollowingModal && renderUserList(following, 'Following')}
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
