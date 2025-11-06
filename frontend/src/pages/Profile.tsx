import { useState, useEffect } from 'react'
import { User, Edit2, Save, X } from 'lucide-react'
import { authService } from '../services/auth'

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

const INTEREST_OPTIONS = [
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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadProfile()
  }, [])

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
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-400">{error || 'Profile not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
            <p className="text-gray-400">@{profile.username}</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

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
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          
          <div className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                disabled={!editing}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                disabled={!editing}
                placeholder="+1234567890"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>

            {/* Birth Year */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Birth Year
              </label>
              <input
                type="number"
                value={formData.birth_year}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value }))}
                disabled={!editing}
                placeholder="1990"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Your Interests</h2>
          <p className="text-gray-400 text-sm mb-4">
            Select your interests to get better group recommendations
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {INTEREST_OPTIONS.map(interest => (
              <label
                key={interest}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.interests.includes(interest)
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                } ${!editing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={formData.interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  disabled={!editing}
                  className="w-4 h-4 text-amber-500 bg-gray-700 border-gray-600 rounded focus:ring-amber-500"
                />
                <span className="text-sm capitalize">{interest.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Details</h2>
          
          <div className="space-y-4">
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                disabled={!editing}
                rows={4}
                maxLength={500}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                disabled={!editing}
                placeholder="City, Country"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                disabled={!editing}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>

            {/* Twitter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Twitter Handle
              </label>
              <input
                type="text"
                value={formData.twitter_handle}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter_handle: e.target.value }))}
                disabled={!editing}
                placeholder="@username"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
