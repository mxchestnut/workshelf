import { useState, useEffect } from 'react'
import { User, MapPin, Calendar, ExternalLink, Globe, Twitter, BookOpen, FileText } from 'lucide-react'

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

export default function PublicProfile() {
  const [profile, setProfile] = useState<PublicProfileData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'documents'>('about')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      // Extract username from URL path
      const path = window.location.pathname
      const username = path.substring(1) // Remove leading slash
      
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
          </div>
        </div>
      </div>
    </div>
  )
}
