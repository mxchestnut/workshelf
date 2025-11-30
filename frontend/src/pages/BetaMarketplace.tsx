/**
 * Beta Reader Marketplace
 * Browse and discover beta readers with filters
 */
import { useEffect, useState } from 'react'
import { User, authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { BookOpen, Star, Clock, DollarSign, Users, Filter, Search, Award, CheckCircle, MessageSquare } from 'lucide-react'
import { toast } from '../services/toast'

interface BetaProfile {
  id: number
  user_id: number
  username: string
  display_name: string
  availability: string
  bio: string | null
  genres: string[] | null
  specialties: string[] | null
  hourly_rate: number | null
  per_word_rate: number | null
  per_manuscript_rate: number | null
  turnaround_days: number | null
  max_concurrent_projects: number
  total_projects_completed: number
  average_rating: number
  beta_score: number
  reading_score: number
  writer_score: number
  has_beta_master_badge: boolean
  has_author_badge: boolean
}

const GENRE_OPTIONS = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Middle Grade', 'Contemporary', 'Paranormal', 'Urban Fantasy',
  'Dystopian', 'Adventure', 'Crime', 'Women\'s Fiction', 'LGBTQ+',
  'Non-Fiction', 'Memoir', 'Other'
]

export default function BetaMarketplace() {
  const [user, setUser] = useState<User | null>(null)
  const [profiles, setProfiles] = useState<BetaProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filters
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [availability, setAvailability] = useState<string>('')
  const [minBetaScore, setMinBetaScore] = useState<number | null>(null)
  const [onlyFree, setOnlyFree] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortBy, setSortBy] = useState<'rating' | 'turnaround' | 'price' | ''>('')

  useEffect(() => {
    loadUser()
    loadProfiles()
  }, [page, selectedGenres, selectedSpecialties, availability, minBetaScore, onlyFree, searchQuery, sortBy])

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser()
    setUser(currentUser)
  }

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '20'
      })
      
      if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','))
      if (availability) params.append('availability', availability)
      if (minBetaScore !== null) params.append('min_beta_score', minBetaScore.toString())
      if (onlyFree) params.append('only_free', 'true')
      if (searchQuery) params.append('search', searchQuery)
      if (sortBy) params.append('sort', sortBy)
      if (selectedSpecialties.length > 0) params.append('specialties', selectedSpecialties.join(','))

      const response = await fetch(`/api/v1/beta-profiles/marketplace?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles)
        setTotal(data.total)
        setTotalPages(data.total_pages)
        if ((selectedSpecialties.length > 0 || !!sortBy) && Array.isArray(data.profiles)) {
          toast.success('Marketplace filters applied')
        }
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast.error('Failed to load marketplace profiles')
    } finally {
      setLoading(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
    setPage(1)
  }

  const toggleSpecialty = (spec: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
    setPage(1)
  }

  const formatRate = (cents: number | null) => {
    if (!cents) return 'Free'
    return `$${(cents / 100).toFixed(2)}`
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-600'
      case 'busy': return 'bg-yellow-600'
      case 'not_accepting': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  const getAvailabilityLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available'
      case 'busy': return 'Busy'
      case 'not_accepting': return 'Not Accepting'
      default: return status
    }
  }

  const navigateToProfile = (userId: number) => {
    window.location.href = `/profile/${userId}`
  }

  const contactBetaReader = (e: React.MouseEvent, profile: BetaProfile) => {
    e.stopPropagation()
    window.history.pushState({}, '', '/messages')
    window.dispatchEvent(new CustomEvent('openChatByUserId', { detail: { userId: profile.user_id, displayName: profile.display_name } }))
    toast.success('Opening conversation...')
  }

  if (loading && profiles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-foreground">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4">Loading marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Beta Reader Marketplace</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Discover talented beta readers to help improve your manuscript
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search by name or bio..."
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted text-foreground border border-border focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                className="px-4 py-3 rounded-lg bg-muted text-foreground border border-border"
              >
                <option value="">Sort: Default</option>
                <option value="rating">Sort: Rating</option>
                <option value="turnaround">Sort: Turnaround</option>
                <option value="price">Sort: Price</option>
              </select>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
              {/* Availability */}
              <div>
                <label className="block text-foreground font-medium mb-2">Availability</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAvailability(''); setPage(1); }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      !availability ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { setAvailability('available'); setPage(1); }}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      availability === 'available' ? 'bg-green-600 text-white border border-green-700' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Available
                  </button>
                </div>
              </div>

              {/* Min Beta Score */}
              <div>
                <label className="block text-foreground font-medium mb-2">Minimum Beta Score</label>
                <div className="flex gap-2">
                  {[null, 3, 4, 5].map(score => (
                    <button
                      key={score || 'all'}
                      onClick={() => { setMinBetaScore(score); setPage(1); }}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        minBetaScore === score ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {score ? `${score}+ ⭐` : 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Only Free */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyFree}
                    onChange={(e) => { setOnlyFree(e.target.checked); setPage(1); }}
                    className="w-5 h-5"
                  />
                  <span className="text-foreground font-medium">Show only free beta readers</span>
                </label>
              </div>

              {/* Genres */}
              <div>
                <label className="block text-foreground font-medium mb-2">Genres</label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedGenres.includes(genre)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-foreground font-medium mb-2">Specialties</label>
                <div className="flex flex-wrap gap-2">
                  {['Plot Holes','Character Development','Pacing','Dialogue','World Building','Grammar & Spelling','Consistency','Emotional Impact','Structure','Voice','Setting','Conflict & Tension','Theme','POV Issues','Show vs Tell'].map(spec => (
                    <button
                      key={spec}
                      onClick={() => toggleSpecialty(spec)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedSpecialties.includes(spec)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6 text-foreground">
          <p>{total} beta reader{total !== 1 ? 's' : ''} found</p>
        </div>

        {/* Profile Cards */}
        <div className="space-y-6">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="bg-card rounded-lg p-6 hover:bg-card/80 transition-all cursor-pointer border border-border"
              onClick={() => navigateToProfile(profile.user_id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{profile.display_name}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getAvailabilityColor(profile.availability)}`}
                    >
                      {getAvailabilityLabel(profile.availability)}
                    </span>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2">
                    {profile.has_beta_master_badge && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600/30 text-purple-300 border border-purple-600 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        Beta Master
                      </span>
                    )}
                    {profile.has_author_badge && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600/30 text-blue-300 border border-blue-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Author
                      </span>
                    )}
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-foreground font-medium">{profile.beta_score}/5</span>
                      <span className="text-muted-foreground">Beta Score</span>
                    </div>
                    <div className="text-muted-foreground">
                      {profile.total_projects_completed} projects completed
                    </div>
                  </div>
                </div>

                {/* Rates */}
                <div className="text-right">
                  {profile.hourly_rate && (
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{formatRate(profile.hourly_rate)}/hr</span>
                    </div>
                  )}
                  {profile.per_word_rate && (
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{formatRate(profile.per_word_rate)}/word</span>
                    </div>
                  )}
                  {profile.per_manuscript_rate && (
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{formatRate(profile.per_manuscript_rate)}/manuscript</span>
                    </div>
                  )}
                  {!profile.hourly_rate && !profile.per_word_rate && !profile.per_manuscript_rate && (
                    <span className="text-green-400 font-medium">Free</span>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mb-4 line-clamp-3 text-muted-foreground">
                  {profile.bio}
                </p>
              )}

              {/* Genres & Specialties */}
              <div className="space-y-2">
                {profile.genres && profile.genres.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {profile.genres.slice(0, 5).map(genre => (
                      <span key={genre} className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                        {genre}
                      </span>
                    ))}
                    {profile.genres.length > 5 && (
                      <span className="text-xs text-muted-foreground">+{profile.genres.length - 5} more</span>
                    )}
                  </div>
                )}
                {profile.specialties && profile.specialties.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 text-primary" />
                    {profile.specialties.slice(0, 4).map(spec => (
                      <span key={spec} className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                        {spec}
                      </span>
                    ))}
                    {profile.specialties.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{profile.specialties.length - 4} more</span>
                    )}
                  </div>
                )}
                
                {profile.turnaround_days && (
                  <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Typical turnaround: {profile.turnaround_days} days</span>
                </div>
              )}
            </div>

            {/* Contact Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                onClick={(e) => contactBetaReader(e, profile)}
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Contact
              </button>
            </div>
          </div>
        ))}
      </div>        {/* Empty State */}
        {profiles.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-foreground mb-2">No beta readers found</p>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
