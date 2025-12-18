import { useState, useEffect } from 'react'
import { User, Edit2, Save, X, ArrowLeft, ExternalLink, BookOpen, DollarSign, Lock, Users as UsersIcon, UserMinus, Loader2, Download, Shield, Settings, UserCircle } from 'lucide-react'
import { useAuth } from "../contexts/AuthContext"
import { Navigation } from '../components/Navigation'

type ProfileTab = 'settings' | 'profile' | 'writer' | 'beta' | 'reader'

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
  github_handle: string | null
  matrix_username: string | null
  location: string | null
  profile_visibility: 'public' | 'private' | 'followers'
  newsletter_opt_in: boolean
  sms_opt_in: boolean
  show_email: boolean
  email_notifications: boolean
  timezone: string
  language: string
  theme: string
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
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')

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
    github_handle: '',
    matrix_username: '',
    profile_visibility: 'public' as 'public' | 'private' | 'followers',
    newsletter_opt_in: false,
    sms_opt_in: false,
    show_email: false,
    email_notifications: true,
    timezone: 'UTC',
    language: 'en',
    theme: 'system'
  })

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    loadProfile()
    loadAvailableInterests()
    checkMatrixConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'settings') {
      loadConnections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const checkMatrixConnection = async () => {
    try {
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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

      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
      if (!token) {
        setError('Not authenticated')
        return
      }

      // Mock data for local development
      if (import.meta.env.VITE_MOCK_AUTH === 'true') {
        const mockProfile: UserProfile = {
          id: 1,
          email: 'dev@local.test',
          username: 'localdev',
          phone_number: null,
          birth_year: null,
          interests: ['fiction', 'sci-fi', 'creative-writing'],
          display_name: 'Local Developer',
          bio: 'This is a mock profile for local development',
          avatar_url: null,
          website_url: null,
          twitter_handle: null,
          github_handle: null,
          matrix_username: null,
          location: null,
          profile_visibility: 'public',
          newsletter_opt_in: false,
          sms_opt_in: false,
          show_email: false,
          email_notifications: true,
          timezone: 'UTC',
          language: 'en',
          theme: 'system'
        }
        
        setProfile(mockProfile)
        setFormData({
          username: mockProfile.username,
          phone_number: mockProfile.phone_number || '',
          birth_year: mockProfile.birth_year?.toString() || '',
          interests: mockProfile.interests,
          bio: mockProfile.bio || '',
          location: mockProfile.location || '',
          website_url: mockProfile.website_url || '',
          twitter_handle: mockProfile.twitter_handle || '',
          github_handle: mockProfile.github_handle || '',
          matrix_username: mockProfile.matrix_username || '',
          profile_visibility: mockProfile.profile_visibility,
          newsletter_opt_in: mockProfile.newsletter_opt_in,
          sms_opt_in: mockProfile.sms_opt_in,
          show_email: mockProfile.show_email,
          email_notifications: mockProfile.email_notifications,
          timezone: mockProfile.timezone,
          language: mockProfile.language,
          theme: mockProfile.theme
        })
        setLoading(false)
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
        github_handle: data.github_handle || '',
        matrix_username: data.matrix_username || '',
        profile_visibility: data.profile_visibility || 'public',
        newsletter_opt_in: data.newsletter_opt_in ?? false,
        sms_opt_in: data.sms_opt_in ?? false,
        show_email: data.show_email ?? false,
        email_notifications: data.email_notifications ?? true,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        theme: data.theme || 'system'
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

      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
          github_handle: formData.github_handle || null,
          profile_visibility: formData.profile_visibility,
          show_email: formData.show_email,
          email_notifications: formData.email_notifications,
          timezone: formData.timezone,
          language: formData.language,
          theme: formData.theme
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
        github_handle: profile.github_handle || '',
        matrix_username: profile.matrix_username || '',
        profile_visibility: profile.profile_visibility || 'public',
        newsletter_opt_in: profile.newsletter_opt_in ?? false,
        sms_opt_in: profile.sms_opt_in ?? false,
        show_email: profile.show_email ?? false,
        email_notifications: profile.email_notifications ?? true,
        timezone: profile.timezone || 'UTC',
        language: profile.language || 'en',
        theme: profile.theme || 'system'
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
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
        <Navigation user={null} onLogin={() => login()} onLogout={() => logout()} currentPage="me" />
        <div className="ml-0 md:ml-80 transition-all duration-300">
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'hsl(var(--primary))' }}></div>
              <p className="mt-4 text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={null} onLogin={() => login()} onLogout={() => logout()} currentPage="me" />
        <div className="ml-0 md:ml-80 transition-all duration-300">
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center py-12">
              <p className="text-primary">{error || 'Profile not found'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={profile as any} onLogin={() => login()} onLogout={() => logout()} currentPage="me" />
      <div className="ml-0 md:ml-80 transition-all duration-300">
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
        <nav className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'settings' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'settings' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'profile' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'profile' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <UserCircle className="w-4 h-4" />
            Profile
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
            Beta Profile
          </button>
          <button
            onClick={() => setActiveTab('reader')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'reader' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-white'
            }`}
            style={{ 
              borderColor: activeTab === 'reader' ? 'hsl(var(--primary))' : 'transparent'
            }}
          >
            <BookOpen className="w-4 h-4" />
            Reader Profile
          </button>
        </nav>
      </div>

      {/* Tab Content */}
        {activeTab === 'settings' && (
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
                    const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
                          const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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
                        const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`); const token = authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null
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

            {/* Show Email on Profile */}
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_email}
                  onChange={(e) => setFormData({ ...formData, show_email: e.target.checked })}
                  disabled={!editing}
                  className="mt-1 rounded disabled:opacity-50"
                />
                <div className="flex-1">
                  <div className="font-semibold text-foreground">Show Email on Public Profile</div>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your email address when viewing your profile
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Only enable this if you want to receive direct contact from readers
                  </p>
                </div>
              </label>
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
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.email_notifications}
                    onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                    disabled={!editing}
                    className="mt-1 rounded disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Email Notifications</div>
                    <p className="text-sm text-muted-foreground">
                      Receive email alerts for comments, mentions, and important updates
                    </p>
                  </div>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                You can unsubscribe from these communications at any time
              </p>
            </div>

            {/* Display & Language Preferences */}
            <div className="p-4 rounded-lg border border-border bg-background/50">
              <h3 className="font-semibold mb-3 text-foreground">Display & Language</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Theme</label>
                  <select
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-2 rounded-lg border bg-background text-foreground disabled:opacity-50"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-2 rounded-lg border bg-background text-foreground disabled:opacity-50"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-2 rounded-lg border bg-background text-foreground disabled:opacity-50"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for displaying timestamps in your local time
                  </p>
                </div>
              </div>
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

            {/* Twitter Handle */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Twitter/X Handle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <input
                  type="text"
                  value={formData.twitter_handle}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitter_handle: e.target.value }))}
                  disabled={!editing}
                  placeholder="your_twitter_handle"
                  className="w-full pl-8 pr-4 py-2 border rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
                />
              </div>
            </div>

            {/* GitHub Handle */}
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                GitHub Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <input
                  type="text"
                  value={formData.github_handle}
                  onChange={(e) => setFormData(prev => ({ ...prev, github_handle: e.target.value }))}
                  disabled={!editing}
                  placeholder="your_github_username"
                  className="w-full pl-8 pr-4 py-2 border rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Matrix Username (for real-time messaging)
              </label>
              <input
                type="text"
                value={formData.matrix_username || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, matrix_username: e.target.value }))}
                disabled={!editing}
                placeholder="@username:matrix.org"
                className="w-full px-4 py-2 border rounded-lg disabled:opacity-50"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your Matrix ID for messaging via Element or other Matrix clients
              </p>
            </div>
          </div>
        </div>
      </div>
        </div>
        )}

        {activeTab === 'writer' && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Writer Profile</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-border" />
                <div>
                  <div className="font-medium text-foreground">Make Writer Profile Public</div>
                  <div className="text-sm text-muted-foreground">Allow other users to discover you as a writer</div>
                </div>
              </label>
            </div>
            <div className="text-center py-8">
              <Edit2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Writer Profile</h3>
              <p className="mb-4 text-muted-foreground">
                Showcase your published works, writing style, and connect with readers.
              </p>
              <p className="text-sm text-muted-foreground">
                Coming soon: Writer bio, published works, writing genres, and reader engagement stats.
              </p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'beta' && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Beta Reader Profile</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-border" />
                <div>
                  <div className="font-medium text-foreground">Make Beta Profile Public</div>
                  <div className="text-sm text-muted-foreground">Allow writers to find you and request beta reading services</div>
                </div>
              </label>
            </div>
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Beta Reader Profile</h3>
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
        </div>
        )}

        {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Public Profile</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This is your basic public profile visible to other users.
            </p>
            {/* Basic profile fields: display name, bio, avatar, location, website, social links */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Display Name</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!editing}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Website</label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  disabled={!editing}
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">Twitter Handle</label>
                  <input
                    type="text"
                    value={formData.twitter_handle}
                    onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-muted-foreground">GitHub Handle</label>
                  <input
                    type="text"
                    value={formData.github_handle}
                    onChange={(e) => setFormData({ ...formData, github_handle: e.target.value })}
                    disabled={!editing}
                    className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground disabled:opacity-50"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'reader' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Reader Profile</h2>
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-border" />
                <div>
                  <div className="font-medium text-foreground">Make Reader Profile Public</div>
                  <div className="text-sm text-muted-foreground">Show your reading activity and bookshelf to others</div>
                </div>
              </label>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Reader Profile will be enabled when the bookshelf feature is reintroduced. 
              This will show your reading history, favorite books, and reading preferences.
            </p>
          </div>
        </div>
        )}
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

        </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
