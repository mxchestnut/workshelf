/**
 * My Beta Profile Page
 * Settings page for beta readers to set up their marketplace profile
 */
import { useEffect, useState } from 'react'
import { User, authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { BookOpen, DollarSign, Clock, Users, Plus, Trash2, Save } from 'lucide-react'

interface PortfolioLink {
  title: string
  url: string
  description?: string
}

interface BetaProfile {
  availability: string
  bio: string
  genres: string[]
  specialties: string[]
  hourly_rate: number | null
  per_word_rate: number | null
  per_manuscript_rate: number | null
  turnaround_days: number | null
  max_concurrent_projects: number
  portfolio_links: PortfolioLink[]
  preferred_contact: string
  is_active: boolean
}

const GENRE_OPTIONS = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Middle Grade', 'Contemporary', 'Paranormal', 'Urban Fantasy',
  'Dystopian', 'Adventure', 'Crime', 'Women\'s Fiction', 'LGBTQ+',
  'Non-Fiction', 'Memoir', 'Other'
]

const SPECIALTY_OPTIONS = [
  'Plot Holes', 'Character Development', 'Pacing', 'Dialogue',
  'World Building', 'Grammar & Spelling', 'Consistency',
  'Emotional Impact', 'Structure', 'Voice', 'Setting',
  'Conflict & Tension', 'Theme', 'POV Issues', 'Show vs Tell'
]

export default function MyBetaProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<BetaProfile>({
    availability: 'available',
    bio: '',
    genres: [],
    specialties: [],
    hourly_rate: null,
    per_word_rate: null,
    per_manuscript_rate: null,
    turnaround_days: null,
    max_concurrent_projects: 3,
    portfolio_links: [],
    preferred_contact: 'platform',
    is_active: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)

      const response = await fetch('/api/v1/beta-profiles/my-profile', {
        headers: { 'Authorization': `Bearer ${await authService.getAccessToken()}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data) {
          setProfile({
            availability: data.availability,
            bio: data.bio || '',
            genres: data.genres || [],
            specialties: data.specialties || [],
            hourly_rate: data.hourly_rate,
            per_word_rate: data.per_word_rate,
            per_manuscript_rate: data.per_manuscript_rate,
            turnaround_days: data.turnaround_days,
            max_concurrent_projects: data.max_concurrent_projects,
            portfolio_links: data.portfolio_links || [],
            preferred_contact: data.preferred_contact,
            is_active: data.is_active
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/v1/beta-profiles/my-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await authService.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.detail || 'Failed to save profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setProfile(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }))
  }

  const toggleSpecialty = (specialty: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }

  const addPortfolioLink = () => {
    setProfile(prev => ({
      ...prev,
      portfolio_links: [...prev.portfolio_links, { title: '', url: '', description: '' }]
    }))
  }

  const updatePortfolioLink = (index: number, field: keyof PortfolioLink, value: string) => {
    setProfile(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }))
  }

  const removePortfolioLink = (index: number) => {
    setProfile(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-white">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-3xl font-bold text-white">My Beta Reader Profile</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
            style={{ backgroundColor: '#B34B0C' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
            <p className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>{message.text}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Availability */}
          <div className="bg-white/5 rounded-lg p-6">
            <label className="block text-white font-medium mb-3">Availability Status</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'available', label: 'Available', color: '#10b981' },
                { value: 'busy', label: 'Busy', color: '#f59e0b' },
                { value: 'not_accepting', label: 'Not Accepting', color: '#ef4444' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setProfile(prev => ({ ...prev, availability: option.value }))}
                  className={`p-3 rounded-lg border-2 transition-all ${profile.availability === option.value ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: option.color + '20', color: option.color }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white/5 rounded-lg p-6">
            <label className="block text-white font-medium mb-3">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell writers about your experience, what you offer, and what you're looking for..."
              className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
              rows={5}
              maxLength={2000}
            />
            <p className="text-sm mt-2" style={{ color: '#B3B2B0' }}>{profile.bio.length}/2000 characters</p>
          </div>

          {/* Genres */}
          <div className="bg-white/5 rounded-lg p-6">
            <label className="block text-white font-medium mb-3">Genres I Read</label>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map(genre => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    profile.genres.includes(genre)
                      ? 'text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  style={profile.genres.includes(genre) ? { backgroundColor: '#B34B0C' } : {}}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div className="bg-white/5 rounded-lg p-6">
            <label className="block text-white font-medium mb-3">My Specialties</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(specialty => (
                <button
                  key={specialty}
                  onClick={() => toggleSpecialty(specialty)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    profile.specialties.includes(specialty)
                      ? 'text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                  style={profile.specialties.includes(specialty) ? { backgroundColor: '#B34B0C' } : {}}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div className="bg-white/5 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5" style={{ color: '#B34B0C' }} />
              <label className="text-white font-medium">Rates (optional - leave blank for free)</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: '#B3B2B0' }}>Hourly Rate ($)</label>
                <input
                  type="number"
                  value={profile.hourly_rate ? profile.hourly_rate / 100 : ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, hourly_rate: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                  placeholder="25.00"
                  className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#B3B2B0' }}>Per Word ($)</label>
                <input
                  type="number"
                  step="0.001"
                  value={profile.per_word_rate ? profile.per_word_rate / 100 : ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, per_word_rate: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                  placeholder="0.01"
                  className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: '#B3B2B0' }}>Per Manuscript ($)</label>
                <input
                  type="number"
                  value={profile.per_manuscript_rate ? profile.per_manuscript_rate / 100 : ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, per_manuscript_rate: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                  placeholder="500.00"
                  className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="bg-white/5 rounded-lg p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5" style={{ color: '#B34B0C' }} />
                <label className="text-white font-medium">Turnaround Time (days)</label>
              </div>
              <input
                type="number"
                value={profile.turnaround_days || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, turnaround_days: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="14"
                className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5" style={{ color: '#B34B0C' }} />
                <label className="text-white font-medium">Max Concurrent Projects</label>
              </div>
              <input
                type="number"
                value={profile.max_concurrent_projects}
                onChange={(e) => setProfile(prev => ({ ...prev, max_concurrent_projects: parseInt(e.target.value) || 3 }))}
                min="1"
                max="20"
                className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Portfolio Links */}
          <div className="bg-white/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white font-medium">Portfolio Links</label>
              <button
                onClick={addPortfolioLink}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                style={{ backgroundColor: '#B34B0C' }}
              >
                <Plus className="w-4 h-4" />
                Add Link
              </button>
            </div>
            <div className="space-y-4">
              {profile.portfolio_links.map((link, index) => (
                <div key={index} className="p-4 bg-white/10 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={link.title}
                      onChange={(e) => updatePortfolioLink(index, 'title', e.target.value)}
                      placeholder="Link Title"
                      className="flex-1 p-2 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                    />
                    <button
                      onClick={() => removePortfolioLink(index)}
                      className="ml-3 p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updatePortfolioLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-full p-2 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={link.description || ''}
                    onChange={(e) => updatePortfolioLink(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full p-2 rounded-lg bg-white/10 text-white border border-white/20 focus:border-white/40 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="bg-white/5 rounded-lg p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.is_active}
                onChange={(e) => setProfile(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-5 h-5"
              />
              <span className="text-white font-medium">Show my profile in the marketplace</span>
            </label>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
            style={{ backgroundColor: '#B34B0C' }}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
