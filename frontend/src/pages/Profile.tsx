import { useState, useEffect } from 'react'
import { User, Edit2, Save, X, ArrowLeft, ExternalLink, BookOpen, DollarSign, Lock } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'

type ProfileTab = 'general' | 'beta' | 'writer'

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
  const [matrixPassword, setMatrixPassword] = useState('')
  const [matrixPassword2, setMatrixPassword2] = useState('')
  const [availableInterests, setAvailableInterests] = useState<string[]>(DEFAULT_INTERESTS)
  const [activeTab, setActiveTab] = useState<ProfileTab>('general')

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    phone_number: '',
    birth_year: '',
    interests: [] as string[],
    bio: '',
    location: '',
    website_url: '',
    twitter_handle: ''
  })

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    loadProfile()
    loadAvailableInterests()
  }, [])

  const loadAvailableInterests = async () => {
    try {
      const response = await fetch(`${API_URL}/v1/interests`)
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

      const response = await fetch(`${API_URL}/v1/users/me/profile`, {
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
        twitter_handle: data.twitter_handle || ''
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
          interests: formData.interests
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
          twitter_handle: formData.twitter_handle || null
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
        twitter_handle: profile.twitter_handle || ''
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

        {/* Messaging: Set Matrix Password */}
        <div className="rounded-lg p-6 border bg-card border-border">
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-foreground">
            <Lock className="w-5 h-5" /> Messaging
          </h2>
          <p className="text-sm mb-4 text-muted-foreground">
            Your messages sync across devices with Element. Set a password to sign in on mobile or desktop and continue your conversations anywhere.
          </p>

          <div className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}>
            <h3 className="font-semibold mb-2 text-white">Sign into Element</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p><strong>Homeserver:</strong> https://matrix.workshelf.dev</p>
              <p><strong>Username:</strong> {profile.username}</p>
              <p><strong>Password:</strong> Set below</p>
            </div>
            <div className="mt-3 flex gap-3">
              <a
                href="https://element.io/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white hover:opacity-80"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                <ExternalLink className="w-4 h-4" />
                Download Element
              </a>
            </div>
          </div>

          {matrixPwMessage && (
            <div className={`mb-4 p-3 rounded border ${matrixPwMessage.type === 'success' ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
              {matrixPwMessage.text}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">New Matrix Password</label>
              <input
                type="password"
                value={matrixPassword2}
                onChange={(e) => setMatrixPassword2(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-background border-border text-foreground"
                placeholder="Confirm password"
              />v>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Confirm Password</label>
              <input
                type="password"
                value={matrixPassword2}
                onChange={(e) => setMatrixPassword2(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                style={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'white' }}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={async () => {
                setMatrixPwMessage(null)
                if (!matrixPassword || matrixPassword.length < 8) {
                  setMatrixPwMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
                  return
                }
                if (matrixPassword !== matrixPassword2) {
                  setMatrixPwMessage({ type: 'error', text: 'Passwords do not match.' })
                  return
                }
                try {
                  setMatrixPwLoading(true)
                  const token = authService.getToken()
                  if (!token) {
                    setMatrixPwMessage({ type: 'error', text: 'Not authenticated.' })
                    return
                  }
                  const resp = await fetch(`${API_URL}/api/v1/matrix/set-password`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password: matrixPassword })
                  })
                  if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}))
                    setMatrixPwMessage({ type: 'error', text: err.detail || 'Failed to set password.' })
                  } else {
                    setMatrixPwMessage({ type: 'success', text: 'Matrix password updated. You can now sign into Element.' })
                    setMatrixPassword('')
                    setMatrixPassword2('')
                  }
                } catch (e) {
                  setMatrixPwMessage({ type: 'error', text: 'Unexpected error. Please try again.' })
                } finally {
                  setMatrixPwLoading(false)
                }
              }}
              disabled={matrixPwLoading}
              className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              {matrixPwLoading ? 'Saving…' : 'Set Matrix Password'}
            </button>
          </div>
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
    </div>
    </div>
  )
}
