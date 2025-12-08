import { useState, useEffect } from 'react'
import { User, Edit2, Save, X, ArrowLeft, ExternalLink, BookOpen, DollarSign, Lock, Users as UsersIcon, UserMinus, Loader2, Download, Shield } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'

type ProfileTab = 'general' | 'beta' | 'writer' | 'connections'

interface UserProfile {
  id: number
  email: string
  username: string
  phone_number: string | null
  birth_year: number | null
  interests: string[]
  display_name: string
  bio: string | null
  avatar_url: string | null
  website_url: string | null
  twitter_handle: string | null
  location: string | null
  profile_visibility: 'public' | 'private' | 'followers'
  newsletter_opt_in: boolean
  sms_opt_in: boolean
}

// Default interests if no groups exist yet
const DEFAULT_INTERESTS = [
  'fiction', 'non-fiction', 'poetry', 
  'sci-fi', 'fantasy', 'romance', 
  'mystery', 'thriller', 'horror', 
  'memoir', 'creative-writing', 'screenwriting'
]

export function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [matrixPwMessage, setMatrixPwMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [matrixPwLoading, setMatrixPwLoading] = useState(false)
  
  // Matrix connection state
  const [matrixConnected, setMatrixConnected] = useState(false)
  const [matrixUserId, setMatrixUserId] = useState('')
  const [matrixHomeserver, setMatrixHomeserver] = useState('')
  const [matrixConnectionLoading, setMatrixConnectionLoading] = useState(false)
  const [showManualConnect, setShowManualConnect] = useState(false)
  
  // Manual connection form
  const [manualUserId, setManualUserId] = useState('')
  const [manualAccessToken, setManualAccessToken] = useState('')
  const [manualHomeserver, setManualHomeserver] = useState('https://matrix.org')
  
  // Login connection form
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginHomeserver, setLoginHomeserver] = useState('https://matrix.org')
  
  const [availableInterests, setAvailableInterests] = useState<string[]>(DEFAULT_INTERESTS)
  const [activeTab, setActiveTab] = useState<ProfileTab>('general')

  // Connections state
  interface ConnectionUser {
    id: number
    email: string
    full_name: string | null
    avatar_url: string | null
    followed_at: string
  }

  const [followers, setFollowers] = useState<ConnectionUser[]>([])
  const [following, setFollowing] = useState<ConnectionUser[]>([])
  const [followersTotal, setFollowersTotal] = useState(0)
  const [followingTotal, setFollowingTotal] = useState(0)
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [unfollowingId, setUnfollowingId] = useState<number | null>(null)

  // GDPR Export state
  const [exportLoading, setExportLoading] = useState(false)
  const [exportMessage, setExportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    phone_number: '',
    birth_year: '',
    interests: [] as string[],
    bio: '',
    location: '',
    website_url: '',
    twitter_handle: '',
    profile_visibility: 'public' as 'public' | 'private' | 'followers',
    newsletter_opt_in: false,
    sms_opt_in: false
  })

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    loadProfile()
    loadAvailableInterests()
    checkMatrixConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'connections') {
      loadConnections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const checkMatrixConnection = async () => {
    try {
      const token = authService.getToken()
      if (!token) return
      
      const response = await fetch(`${API_URL}/api/v1/matrix/connection-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMatrixConnected(data.connected)
        if (data.connected) {
          setMatrixUserId(data.matrix_user_id || '')
          setMatrixHomeserver(data.matrix_homeserver || '')
        }
      }
    } catch (err) {
      console.error('Failed to check Matrix connection:', err)
    }
  }

  const loadAvailableInterests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/interests`)
      if (response.ok) {
        const interests = await response.json()
        setAvailableInterests(interests)
      }
      // If fetch fails, we'll use the default interests
    } catch (err) {
      console.error('Failed to load interests:', err)
      // Keep using DEFAULT_INTERESTS
    }
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = authService.getToken()
      if (!token) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`${API_URL}/api/v1/users/me/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await response.json()
      setProfile(data)
      
      // Initialize form data
      setFormData({
        username: data.username || '',
        phone_number: data.phone_number || '',
        birth_year: data.birth_year?.toString() || '',
        interests: data.interests || [],
        bio: data.bio || '',
        location: data.location || '',
        website_url: data.website_url || '',
        twitter_handle: data.twitter_handle || '',
        profile_visibility: data.profile_visibility || 'public',
        newsletter_opt_in: data.newsletter_opt_in ?? false,
        sms_opt_in: data.sms_opt_in ?? false
      })
    } catch (err) {
      setError('Failed to load profile')
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Validation
      if (formData.username && formData.username.length < 3) {
        setError('Username must be at least 3 characters')
        setSaving(false)
        return
      }

      if (formData.username && !/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
        setError('Username can only contain letters, numbers, dashes, and underscores')
        setSaving(false)
        return
      }

      if (formData.birth_year) {
        const year = parseInt(formData.birth_year)
        const currentYear = new Date().getFullYear()
        if (year < 1900 || year > currentYear - 13) {
          setError('Please enter a valid birth year (must be at least 13 years old)')
          setSaving(false)
          return
        }
      }

      if (formData.website_url && formData.website_url.length > 0) {
        try {
          new URL(formData.website_url)
        } catch {
          setError('Please enter a valid website URL (e.g., https://example.com)')
          setSaving(false)
          return
        }
      }

      if (formData.twitter_handle && formData.twitter_handle.length > 0) {
        // Remove @ if user included it
        const handle = formData.twitter_handle.replace('@', '')
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
          setError('Twitter handle must be 1-15 characters (letters, numbers, underscore only)')
          setSaving(false)
          return
        }
        formData.twitter_handle = handle
      }

      const token = authService.getToken()
      if (!token) {
        setError('Not authenticated')
        return
      }

      // Update account information (username, interests, etc)
      const accountResponse = await fetch(`${API_URL}/api/v1/users/me/account`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username || null,
          phone_number: formData.phone_number || null,
          birth_year: formData.birth_year ? parseInt(formData.birth_year) : null,
          interests: formData.interests,
          newsletter_opt_in: formData.newsletter_opt_in,
          sms_opt_in: formData.sms_opt_in
        })
      })

      if (!accountResponse.ok) {
        const errorData = await accountResponse.json()
        throw new Error(errorData.detail || 'Failed to update account')
      }

      // Update profile information (bio, location, etc)
      const profileResponse = await fetch(`${API_URL}/api/v1/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bio: formData.bio || null,
          location: formData.location || null,
          website_url: formData.website_url || null,
          twitter_handle: formData.twitter_handle || null,
          profile_visibility: formData.profile_visibility
        })
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedProfile = await profileResponse.json()
      setProfile(updatedProfile)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save changes')
      console.error('Error saving profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        phone_number: profile.phone_number || '',
        birth_year: profile.birth_year?.toString() || '',
        interests: profile.interests || [],
        bio: profile.bio || '',
        location: profile.location || '',
        website_url: profile.website_url || '',
        twitter_handle: profile.twitter_handle || '',
        profile_visibility: profile.profile_visibility || 'public',
        newsletter_opt_in: profile.newsletter_opt_in ?? false,
        sms_opt_in: profile.sms_opt_in ?? false
      })
    }
    setEditing(false)
    setError(null)
  }

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  // Connections functions
  const loadConnections = async () => {
    setConnectionsLoading(true)
    try {
      const token = authService.getToken()
      if (!token) return

      // Load followers
      const followersRes = await fetch(`${API_URL}/api/v1/relationships/followers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (followersRes.ok) {
        const followersData = await followersRes.json()
        setFollowers(followersData.followers || [])
        setFollowersTotal(followersData.total || 0)
      }

      // Load following
      const followingRes = await fetch(`${API_URL}/api/v1/relationships/following`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (followingRes.ok) {
        const followingData = await followingRes.json()
        setFollowing(followingData.following || [])
        setFollowingTotal(followingData.total || 0)
      }
    } catch (error) {
      console.error('Failed to load connections:', error)
    } finally {
      setConnectionsLoading(false)
    }
  }

  const unfollowUser = async (userId: number) => {
    setUnfollowingId(userId)
    try {
      const token = authService.getToken()
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/relationships/unfollow/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        // Remove from following list
        setFollowing(prev => prev.filter(u => u.id !== userId))
        setFollowingTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error)
    } finally {
      setUnfollowingId(null)
    }
  }

  const exportGDPRData = async () => {
    setExportLoading(true)
    setExportMessage(null)
    
    try {
      const token = authService.getToken()
      if (!token) {
        setExportMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch(`${API_URL}/api/export/gdpr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to request data export')
      }

      const result = await response.json()
      
      if (result.status === 'completed' && result.file_url) {
        // Download immediately if available
        window.open(result.file_url, '_blank')
        setExportMessage({ 
          type: 'success', 
          text: 'Your data export is ready! Download started automatically.'
        })
      } else {
        // Export job created, will be processed
        setExportMessage({ 
          type: 'success', 
          text: 'Your data export has been requested. You will receive an email when it\'s ready (usually within a few minutes).'
        })
      }
    } catch (error: any) {
      console.error('Failed to export GDPR data:', error)
      setExportMessage({ 
        type: 'error', 
        text: error.message || 'Failed to request data export. Please try again.'
      })
    } finally {
      setExportLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={null} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="me" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'hsl(var(--primary))' }}></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={null} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="me" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-primary">{error || 'Profile not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={profile as any} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="me" />
      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <button
          onClick={() => window.location.href = '/feed'}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </button>
        
        <button
          onClick={() => window.location.href = `/users/${profile.username}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80 text-muted-foreground"
        >
          <ExternalLink className="w-4 h-4" />
          View Public Profile
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90 bg-primary text-primary-foreground"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90 bg-muted text-foreground"
              disabled={saving}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90 bg-primary text-primary-foreground"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Tabs */}
      <div className="border-b mb-6 border-border">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'general' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'general' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            General Profile
          </button>
          <button
            onClick={() => setActiveTab('writer')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'writer' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'writer' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <Edit2 className="w-4 h-4" />
            Writer Profile
          </button>
          <button
            onClick={() => setActiveTab('beta')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'beta' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'beta' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <BookOpen className="w-4 h-4" />
            Beta Reader Profile
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'connections' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'connections' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <UsersIcon className="w-4 h-4" />
            Connections
          </button>
        </nav>
      </div>

      {/* Tab Content */}
        {activeTab === 'general' && (
        <div>
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-400">
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-400">
              {error}
            </div>
          )}

      {/* Profile Form */}
      <div className="space-y-6">
        {/* Account Information */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Account Information</h2>
          
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border rounded-lg cursor-not-allowed"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
              />
              <p className="text-xs mt-1 text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                disabled={!editing}
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                disabled={!editing}
                placeholder="+1 (555) 000-0000"
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>

            {/* Birth Year */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Birth Year
              </label>
              <input
                type="number"
                value={formData.birth_year}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value }))}
                disabled={!editing}
                placeholder="1990"
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>
          </div>
        </div>

        {/* Messaging: Connect Matrix Account */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-foreground">
            <Lock className="w-5 h-5" /> Messaging
          </h2>
          <p className="text-sm mb-4 text-muted-foreground">
            Connect your existing Matrix account to use messaging features. You can use any Matrix homeserver like matrix.org or your own.
          </p>

          {matrixConnected ? (
            // Connected state
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-green-700 bg-green-900/40">
                <h3 className="font-semibold mb-2 text-green-300">✓ Matrix Account Connected</h3>
                <div className="text-sm space-y-1 text-green-200">
                  <p><strong>User ID:</strong> {matrixUserId}</p>
                  <p><strong>Homeserver:</strong> {matrixHomeserver}</p>
                </div>
              </div>

              {matrixPwMessage && (
                <div className={`p-3 rounded border ${matrixPwMessage.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
                  {matrixPwMessage.text}
                </div>
              )}

              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to disconnect your Matrix account?')) return
                  try {
                    setMatrixPwLoading(true)
                    const token = authService.getToken()
                    if (!token) return
                    
                    const response = await fetch(`${API_URL}/api/v1/matrix/disconnect-account`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    })
                    
                    if (response.ok) {
                      setMatrixConnected(false)
                      setMatrixUserId('')
                      setMatrixHomeserver('')
                      setMatrixPwMessage({ type: 'success', text: 'Matrix account disconnected.' })
                    } else {
                      const err = await response.json().catch(() => ({}))
                      setMatrixPwMessage({ type: 'error', text: err.detail || 'Failed to disconnect.' })
                    }
                  } catch (e) {
                    setMatrixPwMessage({ type: 'error', text: 'Unexpected error.' })
                  } finally {
                    setMatrixPwLoading(false)
                  }
                }}
                disabled={matrixPwLoading}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {matrixPwLoading ? 'Disconnecting…' : 'Disconnect Account'}
              </button>
            </div>
          ) : (
            // Not connected state
            <div className="space-y-4">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
                <h3 className="font-semibold mb-2 text-white">Two Ways to Connect</h3>
                <div className="text-sm space-y-3 text-muted-foreground">
                  <div>
                    <strong className="text-white">Option 1: Login with Username/Password</strong>
                    <p>Enter your Matrix credentials and we'll connect automatically.</p>
                  </div>
                  <div>
                    <strong className="text-white">Option 2: Manual Connection</strong>
                    <p>Get your access token from Element settings and connect manually.</p>
                  </div>
                </div>
              </div>

              {matrixPwMessage && (
                <div className={`p-3 rounded border ${matrixPwMessage.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
                  {matrixPwMessage.text}
                </div>
              )}

              {/* Login with username/password */}
              {!showManualConnect && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-white">Connect with Login</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-muted-foreground">Matrix Username</label>
                      <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                        placeholder="your_username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-muted-foreground">Password</label>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                        placeholder="Your Matrix password"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Homeserver URL</label>
                    <input
                      type="text"
                      value={loginHomeserver}
                      onChange={(e) => setLoginHomeserver(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                      placeholder="https://matrix.org"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setMatrixPwMessage(null)
                        if (!loginUsername || !loginPassword) {
                          setMatrixPwMessage({ type: 'error', text: 'Username and password required.' })
                          return
                        }
                        try {
                          setMatrixConnectionLoading(true)
                          const token = authService.getToken()
                          if (!token) return
                          
                          const response = await fetch(`${API_URL}/api/v1/matrix/login-and-connect`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              username: loginUsername,
                              password: loginPassword,
                              homeserver: loginHomeserver
                            })
                          })
                          
                          if (response.ok) {
                            const data = await response.json()
                            setMatrixConnected(true)
                            setMatrixUserId(data.matrix_user_id)
                            setMatrixHomeserver(data.matrix_homeserver)
                            setMatrixPwMessage({ type: 'success', text: 'Matrix account connected successfully!' })
                            setLoginUsername('')
                            setLoginPassword('')
                          } else {
                            const err = await response.json().catch(() => ({}))
                            setMatrixPwMessage({ type: 'error', text: err.detail || 'Failed to connect account.' })
                          }
                        } catch (e) {
                          setMatrixPwMessage({ type: 'error', text: 'Unexpected error. Please try again.' })
                        } finally {
                          setMatrixConnectionLoading(false)
                        }
                      }}
                      disabled={matrixConnectionLoading}
                      className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
                      {matrixConnectionLoading ? 'Connecting…' : 'Connect with Login'}
                    </button>
                    <button
                      onClick={() => setShowManualConnect(true)}
                      className="px-4 py-2 rounded-lg font-medium border border-border text-foreground hover:bg-accent"
                    >
                      Use Manual Connection
                    </button>
                  </div>
                </div>
              )}

              {/* Manual connection with access token */}
              {showManualConnect && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Manual Connection</h3>
                    <button
                      onClick={() => setShowManualConnect(false)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      ← Back to Login
                    </button>
                  </div>
                  <div className="p-3 bg-blue-900/40 border border-blue-700 rounded text-sm text-blue-200">
                    <strong>Get your access token:</strong> Open Element → Settings → Help & About → Advanced → Access Token
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Matrix User ID</label>
                    <input
                      type="text"
                      value={manualUserId}
                      onChange={(e) => setManualUserId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                      placeholder="@username:matrix.org"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Access Token</label>
                    <input
                      type="password"
                      value={manualAccessToken}
                      onChange={(e) => setManualAccessToken(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                      placeholder="syt_..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-muted-foreground">Homeserver URL</label>
                    <input
                      type="text"
                      value={manualHomeserver}
                      onChange={(e) => setManualHomeserver(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                      placeholder="https://matrix.org"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      setMatrixPwMessage(null)
                      if (!manualUserId || !manualAccessToken) {
                        setMatrixPwMessage({ type: 'error', text: 'User ID and access token required.' })
                        return
                      }
                      try {
                        setMatrixConnectionLoading(true)
                        const token = authService.getToken()
                        if (!token) return
                        
                        const response = await fetch(`${API_URL}/api/v1/matrix/connect-account`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            matrix_user_id: manualUserId,
                            access_token: manualAccessToken,
                            homeserver: manualHomeserver
                          })
                        })
                        
                        if (response.ok) {
                          setMatrixConnected(true)
                          setMatrixUserId(manualUserId)
                          setMatrixHomeserver(manualHomeserver)
                          setMatrixPwMessage({ type: 'success', text: 'Matrix account connected successfully!' })
                          setManualUserId('')
                          setManualAccessToken('')
                        } else {
                          const err = await response.json().catch(() => ({}))
                          setMatrixPwMessage({ type: 'error', text: err.detail || 'Failed to connect account.' })
                        }
                      } catch (e) {
                        setMatrixPwMessage({ type: 'error', text: 'Unexpected error. Please try again.' })
                      } finally {
                        setMatrixConnectionLoading(false)
                      }
                    }}
                    disabled={matrixConnectionLoading}
                    className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                  >
                    {matrixConnectionLoading ? 'Connecting…' : 'Connect Account'}
                  </button>
                </div>
              )}

              <div className="mt-4 p-4 rounded-lg border border-border bg-background/50">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Don't have a Matrix account?</strong> Create one at{' '}
                  <a
                    href="https://app.element.io/#/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Element <ExternalLink className="w-3 h-3" />
                  </a>
                  {' '}or{' '}
                  <a
                    href="https://matrix.org/clients/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    any Matrix client <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Interests */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Your Interests</h2>
          <p className="text-sm mb-4 text-muted-foreground">
            Select interests from active groups to get better recommendations
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableInterests.map((interest: string) => (
              <label
                key={interest}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.interests.includes(interest)
                    ? 'opacity-100'
                    : 'opacity-75 hover:opacity-100'
                } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: formData.interests.includes(interest) ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background))',
                  borderColor: formData.interests.includes(interest) ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  color: formData.interests.includes(interest) ? '#B34B0C' : '#B3B2B0'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  disabled={!editing}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'hsl(var(--primary))' }}
                />
                <span className="text-sm capitalize">{interest.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5" /> Privacy & Data
          </h2>
          <p className="text-sm mb-4 text-muted-foreground">
            Manage your personal data and privacy settings. In compliance with GDPR, you have the right to access and export all your data.
          </p>

          <div className="space-y-4">
            {exportMessage && (
              <div className={`p-4 rounded-lg border ${
                exportMessage.type === 'success' 
                  ? 'bg-green-900/40 border-green-700 text-green-300' 
                  : 'bg-red-900/40 border-red-700 text-red-300'
              }`}>
                {exportMessage.text}
              </div>
            )}

            {/* Profile Visibility */}
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label htmlFor="profile_visibility" className="font-semibold mb-1 block text-foreground">
                    Profile Visibility
                  </label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Control who can see your profile and content
                  </p>
                </div>
                <select
                  id="profile_visibility"
                  value={formData.profile_visibility}
                  onChange={(e) => setFormData({ ...formData, profile_visibility: e.target.value as 'public' | 'private' | 'followers' })}
                  disabled={!editing}
                  className="px-4 py-2 rounded-lg border bg-background text-foreground disabled:opacity-50"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <option value="public">Public - Anyone can see</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private - Only me</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {formData.profile_visibility === 'public' && 'Your profile, posts, and documents are visible to everyone'}
                {formData.profile_visibility === 'followers' && 'Only your followers can see your profile and content'}
                {formData.profile_visibility === 'private' && 'Your profile is completely private'}
              </p>
            </div>

            {/* Communication Preferences */}
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <h3 className="font-semibold mb-3 text-foreground">Communication Preferences</h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newsletter_opt_in}
                    onChange={(e) => setFormData({ ...formData, newsletter_opt_in: e.target.checked })}
                    disabled={!editing}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Email Newsletter</div>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features, writing tips, and community highlights
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sms_opt_in}
                    onChange={(e) => setFormData({ ...formData, sms_opt_in: e.target.checked })}
                    disabled={!editing}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">SMS Notifications</div>
                    <p className="text-sm text-muted-foreground">
                      Get text message alerts for important account activities (requires phone number)
                    </p>
                  </div>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                You can unsubscribe from these communications at any time
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 text-foreground">Export My Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download a complete copy of your data including:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                    <li>• Profile information and account details</li>
                    <li>• All documents and their content</li>
                    <li>• Comments and activity history</li>
                    <li>• Group memberships and settings</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Your data will be prepared as a ZIP file containing JSON files. The download link will be available for 7 days.
                  </p>
                </div>
                <button
                  onClick={exportGDPRData}
                  disabled={exportLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity whitespace-nowrap"
                  style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Data
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-background/50">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Need help or have privacy concerns?</strong> Visit our{' '}
                <a
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </a>
                {' '}or contact support at{' '}
                <a
                  href="mailto:privacy@workshelf.dev"
                  className="text-primary hover:underline"
                >
                  privacy@workshelf.dev
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Profile Details</h2>
          
          <div className="space-y-4">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!editing}
                rows={4}
                maxLength={500}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50 resize-none"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
              <p className="text-xs mt-1 text-muted-foreground">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                disabled={!editing}
                placeholder="City, Country"
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                disabled={!editing}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>

            {/* Social Link */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Social Link
              </label>
              <input
                type="text"
                value={formData.twitter_handle}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter_handle: e.target.value }))}
                disabled={!editing}
                placeholder="https://..."
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>
          </div>
        </div>
      </div>
        </div>
        )}

        {activeTab === 'writer' && (
        <div className="rounded-lg border p-8 bg-card border-border">
          <div className="text-center py-12">
            <Edit2 className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h3 className="text-xl font-semibold mb-2 text-white">Writer Profile</h3>
            <p className="mb-4 text-muted-foreground">
              Showcase your published works, writing style, and connect with readers.
            </p>
            <p className="text-sm text-muted-foreground">
              Coming soon: Writer bio, published works, writing genres, and reader engagement stats.
            </p>
          </div>
        </div>
        )}

        {activeTab === 'beta' && (
        <div className="rounded-lg border p-8 bg-card border-border">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h3 className="text-xl font-semibold mb-2 text-white">Beta Reader Profile</h3>
            <p className="mb-4 text-muted-foreground">
              Set up your beta reading profile to offer feedback services to writers.
            </p>
            <button
              onClick={() => window.location.href = '/my-beta-profile'}
              className="px-6 py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configure Beta Profile
              </div>
            </button>
          </div>
        </div>
        )}

        {activeTab === 'connections' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{followersTotal}</div>
                <div className="text-sm text-muted-foreground mt-1">Followers</div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{followingTotal}</div>
                <div className="text-sm text-muted-foreground mt-1">Following</div>
              </div>
            </div>
          </div>

          {connectionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Followers */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-primary" />
                  Followers ({followersTotal})
                </h3>
                {followers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No followers yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.full_name || user.email} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name || user.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Followed {formatDate(user.followed_at)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => window.location.href = `/users/${user.id}`}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Following */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-primary" />
                  Following ({followingTotal})
                </h3>
                {following.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Not following anyone yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {following.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={`${user.full_name || user.email}'s profile picture`} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name || user.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Following since {formatDate(user.followed_at)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => unfollowUser(user.id)}
                          disabled={unfollowingId === user.id}
                          className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                          {unfollowingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserMinus className="w-4 h-4" />
                              Unfollow
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
    </div>
    </div>
  )
}
