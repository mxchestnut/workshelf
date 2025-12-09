/**
 * Beta Feed
 * Shows documents released to the user by writers who appointed them as beta readers
 */
import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { BookOpen, Clock, CheckCircle, MessageSquare, Calendar } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface BetaRelease {
  id: number
  appointment_id: number
  document_id: number
  document_title: string
  document_word_count: number
  writer_username: string
  writer_display_name: string
  release_message: string | null
  release_date: string
  deadline: string | null
  status: 'unread' | 'reading' | 'completed'
  started_reading_at: string | null
  completed_reading_at: string | null
  feedback_submitted: boolean
  feedback_submitted_at: string | null
}

export default function BetaFeed() {
  const [user, setUser] = useState<any>(null)
  const [releases, setReleases] = useState<BetaRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'reading' | 'completed'>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      if (currentUser) {
        loadReleases()
      } else {
        setLoading(false)
      }
    }
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadReleases = async () => {
    setLoading(true)
    try {
      const token = authService.getAccessToken()
      const url = filter === 'all' 
        ? `${API_URL}/api/v1/beta-appointments/my-feed`
        : `${API_URL}/api/v1/beta-appointments/my-feed?status_filter=${filter}`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setReleases(data)
      } else {
        setError('Failed to load beta feed')
      }
    } catch (err) {
      console.error('Failed to load releases:', err)
      setError('Failed to load beta feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadReleases()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleLogin = () => {
    authService.login()
  }

  const handleLogout = async () => {
    await authService.logout()
    setUser(null)
    window.location.href = '/'
  }

  const updateReleaseStatus = async (releaseId: number, newStatus: 'reading' | 'completed') => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/beta-appointments/releases/${releaseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        loadReleases()
      } else {
        setError(`Failed to update status`)
      }
    } catch (err) {
      setError(`Failed to update status`)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatWordCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k words`
    }
    return `${count} words`
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#B34B0C' }} />
          <h1 className="text-2xl font-bold text-white mb-4">Beta Reader Feed</h1>
          <p className="text-gray-400 mb-6">Please log in to view documents released to you.</p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#B34B0C' }}
          >
            Log In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="/beta-feed" />
      
      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-3xl font-bold text-white">Beta Reader Feed</h1>
          </div>
          <p className="text-gray-400">Documents released to you for beta reading</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#5C1F1F', borderLeft: '4px solid #EF4444' }}>
            <p className="text-white">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: '#6C6A68' }}>
          {[
            { key: 'all', label: 'All', count: releases.length },
            { key: 'unread', label: 'Unread', count: releases.filter(r => r.status === 'unread').length },
            { key: 'reading', label: 'Reading', count: releases.filter(r => r.status === 'reading').length },
            { key: 'completed', label: 'Completed', count: releases.filter(r => r.status === 'completed').length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-3 font-medium transition-colors ${
                filter === tab.key ? 'text-white border-b-2' : 'text-gray-400'
              }`}
              style={filter === tab.key ? { borderColor: '#B34B0C' } : {}}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#B34B0C' }}></div>
            <p className="text-gray-400 mt-4">Loading releases...</p>
          </div>
        ) : releases.length === 0 ? (
          <div className="p-12 rounded-lg text-center" style={{ backgroundColor: '#524944' }}>
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#B34B0C' }} />
            <h2 className="text-xl font-bold text-white mb-2">No releases yet</h2>
            <p className="text-gray-400">
              {filter === 'all' 
                ? "You haven't been appointed as a beta reader yet, or no documents have been released to you."
                : `No ${filter} documents.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {releases.map(release => (
              <div key={release.id} className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{release.document_title}</h2>
                    <p className="text-sm text-gray-400">
                      by {release.writer_display_name || release.writer_username}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium text-white ${
                      release.status === 'unread' ? 'bg-blue-600' :
                      release.status === 'reading' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}
                  >
                    {release.status === 'unread' ? 'New' :
                     release.status === 'reading' ? 'Reading' :
                     'Completed'}
                  </span>
                </div>

                {/* Release Message */}
                {release.release_message && (
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#37322E' }}>
                    <p className="text-sm text-gray-300 italic">"{release.release_message}"</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {formatWordCount(release.document_word_count)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Released {formatDate(release.release_date)}
                  </div>
                  {release.deadline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Due {formatDate(release.deadline)}
                    </div>
                  )}
                  {release.feedback_submitted && (
                    <div className="flex items-center gap-2 text-green-400">
                      <MessageSquare className="w-4 h-4" />
                      Feedback submitted
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.href = `/documents/${release.document_id}`}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#B34B0C' }}
                  >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Read Document
                  </button>
                  
                  {release.status === 'unread' && (
                    <button
                      onClick={() => updateReleaseStatus(release.id, 'reading')}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#7C3306' }}
                    >
                      Mark as Reading
                    </button>
                  )}
                  
                  {release.status === 'reading' && (
                    <button
                      onClick={() => updateReleaseStatus(release.id, 'completed')}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#10B981' }}
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Mark Complete
                    </button>
                  )}
                  
                  {release.status === 'completed' && !release.feedback_submitted && (
                    <button
                      onClick={() => window.location.href = `/documents/${release.document_id}#feedback`}
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: '#7C3306' }}
                    >
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      Submit Feedback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
