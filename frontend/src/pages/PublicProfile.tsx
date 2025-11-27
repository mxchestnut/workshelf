import { useState, useEffect } from 'react'
import { User, MapPin, Calendar, ExternalLink, Globe, Twitter, BookOpen, FileText, Book, Star, UserPlus, UserMinus, MessageCircle } from 'lucide-react'
import { useMatrix } from '../hooks/useMatrixClient.tsx'

interface PublicProfileData {
  id: number
  username: string
  display_name: string
  bio?: string
  avatar_url?: string
  location?: string
  website?: string
  twitter_handle?: string
  created_at: string
  interests?: string[]
  document_count?: number
  public_document_count?: number
  followers_count?: number
  following_count?: number
}

interface Document {
  id: number
  title: string
  description?: string
  word_count: number
  reading_time: number
  updated_at: string
  status: string
}

interface BookshelfItem {
  id: number
  item_type: 'document' | 'book'
  document_id?: number
  document_title?: string
  isbn?: string
  title?: string
  author?: string
  cover_url?: string
  publisher?: string
  publish_year?: number
  page_count?: number
  description?: string
  status: string
  rating?: number
  review?: string
  is_favorite: boolean
  finished_reading?: string
}

export default function PublicProfile() {
  const { openChat, isReady } = useMatrix()
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [bookshelf, setBookshelf] = useState<BookshelfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'documents' | 'bookshelf'>('about')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  const checkIfFollowing = async (userId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return
      
      const response = await fetch(`${API_URL}/api/v1/relationships/following`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const following = data.following || []
        setIsFollowing(following.some((f: any) => f.id === userId))
      }
    } catch (err) {
      console.error('Failed to check follow status:', err)
    }
  }

  const followUser = async () => {
    if (!profile || followLoading) return
    
    try {
      setFollowLoading(true)
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please log in to follow users')
        setFollowLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/relationships/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ following_id: profile.id })
      })

      if (response.ok) {
        setIsFollowing(true)
        setFollowersCount(prev => prev + 1)
      } else {
        alert('Failed to follow user')
      }
    } catch (err) {
      console.error('Error following user:', err)
      alert('Failed to follow user')
    } finally {
      setFollowLoading(false)
    }
  }

  const unfollowUser = async () => {
    if (!profile || followLoading) return
    
    try {
      setFollowLoading(true)
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please log in to unfollow users')
        setFollowLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/relationships/unfollow/${profile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setIsFollowing(false)
        setFollowersCount(prev => prev - 1)
      } else {
        alert('Failed to unfollow user')
      }
    } catch (err) {
      console.error('Error unfollowing user:', err)
      alert('Failed to unfollow user')
    } finally {
      setFollowLoading(false)
    }
  }

  const messageUser = async () => {
    if (!profile) return
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please log in to send a message')
        return
      }
      // Look up the recipient's Matrix ID
      const resp = await fetch(`${API_URL}/api/v1/matrix/lookup-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ work_shelf_user_id: profile.id })
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        console.error('[Message] Lookup failed:', data)
        alert(data.detail || 'User has not set up messaging yet')
        return
      }
      const data = await resp.json()
      const matrixUserId = data.matrix_user_id as string
      const displayName = profile.display_name || profile.username
      await openChat(matrixUserId, displayName, profile.avatar_url)
    } catch (err) {
      console.error('[Message] Failed to open chat:', err)
      alert('Failed to open chat')
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Extract username from URL path: /users/:username
      const path = window.location.pathname
      const parts = path.split('/').filter(p => p) // Remove empty strings
      
      if (parts.length < 2 || parts[0] !== 'users') {
        setError('Invalid profile URL')
        setLoading(false)
        return
      }
      
      const username = parts[1]
      
      if (!username) {
        setError('Invalid profile URL')
        setLoading(false)
        return
      }

      // Fetch public profile
      const response = await fetch(`${API_URL}/api/v1/users/username/${username}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found')
        } else {
          setError('Failed to load profile')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setProfile(data)
      
      // Set follower counts
      setFollowersCount(data.followers_count || 0)
      setFollowingCount(data.following_count || 0)
      
      // Check if viewing own profile
      const token = localStorage.getItem('access_token')
      if (token) {
        try {
          const currentUserResponse = await fetch(`${API_URL}/api/v1/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (currentUserResponse.ok) {
            const currentUser = await currentUserResponse.json()
            setIsOwnProfile(currentUser.id === data.id)
            
            // Check if following this user
            if (currentUser.id !== data.id) {
              await checkIfFollowing(data.id)
            }
          }
        } catch (err) {
          console.error('Failed to check current user:', err)
        }
      }

      // Fetch public documents
      try {
        const docsResponse = await fetch(`${API_URL}/api/v1/users/${data.id}/documents/public`)
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          setDocuments(docsData.documents || [])
        }
      } catch (err) {
        console.error('Failed to load documents:', err)
      }

      // Fetch public bookshelf
      try {
        const bookshelfResponse = await fetch(`${API_URL}/api/v1/bookshelf/public/${username}`)
        if (bookshelfResponse.ok) {
          const bookshelfData = await bookshelfResponse.json()
          setBookshelf(bookshelfData || [])
        }
      } catch (err) {
        console.error('Failed to load bookshelf:', err)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatReadingTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min read'
    return `${minutes} min read`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading profile...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || 'Profile not found'}
          </h1>
          <p className="text-gray-400 mb-6">
            This user doesn't exist or their profile is private
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 pb-32">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => window.location.href = '/'}
            className="text-white hover:text-gray-200 mb-8"
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="max-w-5xl mx-auto px-6 -mt-24">
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
          {/* Profile Header */}
          <div className="p-8">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-gray-700">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-white mb-1">
                  {profile.display_name}
                </h1>
                <p className="text-gray-400 mb-4">@{profile.username}</p>
                
                {/* Follower Counts */}
                <div className="flex items-center gap-4 text-sm mb-4">
                  <button className="text-gray-300 hover:text-white">
                    <span className="font-semibold">{followersCount}</span>
                    <span className="text-gray-400"> {followersCount === 1 ? 'follower' : 'followers'}</span>
                  </button>
                  <button className="text-gray-300 hover:text-white">
                    <span className="font-semibold">{followingCount}</span>
                    <span className="text-gray-400"> following</span>
                  </button>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {formatDate(profile.created_at)}
                  </div>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {profile.twitter_handle && (
                    <a
                      href={`https://twitter.com/${profile.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      <Twitter className="w-4 h-4" />
                      @{profile.twitter_handle}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              
              {/* Follow Button */}
              {!isOwnProfile && (
                <div className="flex-shrink-0 flex items-center gap-3">
                  {/* Message Button */}
                  <button
                    onClick={messageUser}
                    disabled={!isReady}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isReady ? 'Send Message' : 'Messaging not ready yet'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                  {isFollowing ? (
                    <button
                      onClick={unfollowUser}
                      disabled={followLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserMinus className="w-4 h-4" />
                      {followLoading ? 'Updating...' : 'Unfollow'}
                    </button>
                  ) : (
                    <button
                      onClick={followUser}
                      disabled={followLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-4 h-4" />
                      {followLoading ? 'Updating...' : 'Follow'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-gray-300 text-lg leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-700">
            <div className="flex gap-8 px-8">
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'about'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  About
                </div>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'documents'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Public Documents ({documents.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('bookshelf')}
                className={`py-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'bookshelf'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Book className="w-4 h-4" />
                  Bookshelf ({bookshelf.length})
                </div>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'about' && (
              <div className="text-center text-gray-400 py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>More details coming soon...</p>
              </div>
            )}

            {activeTab === 'documents' && (
              <div>
                {documents.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No public documents yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/document?id=${doc.id}`}
                      >
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-gray-400 mb-4 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{doc.word_count.toLocaleString()} words</span>
                          <span>•</span>
                          <span>{formatReadingTime(doc.reading_time)}</span>
                          <span>•</span>
                          <span>Updated {formatDate(doc.updated_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bookshelf' && (
              <div>
                {bookshelf.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No public book reviews yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {bookshelf.map((item) => {
                      const bookTitle = item.title || item.document_title || 'Untitled'
                      const bookAuthor = item.author || 'Unknown Author'
                      
                      return (
                        <div
                          key={item.id}
                          className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-650 transition-colors"
                        >
                          {/* Book Cover */}
                          {item.cover_url ? (
                            <img
                              src={item.cover_url}
                              alt={bookTitle}
                              className="w-full h-64 object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                              <BookOpen className="w-16 h-16 text-white opacity-50" />
                            </div>
                          )}

                          {/* Book Info */}
                          <div className="p-4">
                            <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
                              {bookTitle}
                            </h3>
                            <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                              {bookAuthor}
                            </p>

                            {/* Rating */}
                            {item.rating && (
                              <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= item.rating!
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Review */}
                            {item.review && (
                              <p className="text-xs text-gray-300 line-clamp-3 mt-2 italic">
                                "{item.review}"
                              </p>
                            )}

                            {/* Status Badge */}
                            <div className="mt-3">
                              <span className="inline-block px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">
                                {item.status === 'read' && '✅ Read'}
                                {item.status === 'reading' && '📖 Reading'}
                                {item.status === 'want-to-read' && '📚 Want to Read'}
                                {item.status === 'favorites' && '⭐ Favorite'}
                                {item.status === 'dnf' && '❌ DNF'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
