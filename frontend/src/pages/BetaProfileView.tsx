import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { User, authService } from '../services/auth'
import { BookOpen, Star, DollarSign, Users, Link as LinkIcon, Award, CheckCircle, MessageSquare, Send } from 'lucide-react'
import { toast } from '../components/Toast'

interface PortfolioLink {
  title: string
  url: string
  description?: string
}

interface BetaProfile {
  id: number
  user_id: number
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
  portfolio_links: PortfolioLink[] | null
  preferred_contact: string | null
}

interface Review {
  id: number
  reviewer_display_name: string
  rating: number
  comment: string
  created_at: string
}

export default function BetaProfileView() {
  const params = new URLSearchParams(window.location.search)
  const userId = params.get('userId')
  const [viewer, setViewer] = useState<User | null>(null)
  const [profile, setProfile] = useState<BetaProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [newReview, setNewReview] = useState<{ rating: number; comment: string }>({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const load = async () => {
    setLoading(true)
    const currentUser = await authService.getCurrentUser()
    setViewer(currentUser)
    try {
      const response = await fetch(`/api/v1/beta-profiles/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
      // Load reviews (if endpoint exists)
      try {
        setReviewsLoading(true)
        const r = await fetch(`/api/v1/beta-profiles/${userId}/reviews`)
        if (r.ok) {
          const rd = await r.json()
          setReviews(rd.reviews || rd || [])
        }
      } catch (e) {
        // Silently ignore if not available
      } finally {
        setReviewsLoading(false)
      }
    } catch (e) {
      console.error('Error loading beta profile:', e)
    } finally {
      setLoading(false)
    }
  }

  const requestBetaRead = () => {
    if (!profile) return
    window.location.href = `/beta-request?user_id=${profile.user_id}`
  }

  const submitReview = async () => {
    if (!userId) return
    setSubmittingReview(true)
    setReviewMessage(null)
    try {
      const token = await authService.getAccessToken()
      const resp = await fetch(`/api/v1/beta-profiles/${userId}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating: newReview.rating, comment: newReview.comment })
      })
      if (resp.ok) {
        toast.success('Review submitted!')
        setReviewMessage('Review submitted!')
        setNewReview({ rating: 5, comment: '' })
        // Reload reviews
        try {
          setReviewsLoading(true)
          const r = await fetch(`/api/v1/beta-profiles/${userId}/reviews`)
          if (r.ok) {
            const rd = await r.json()
            setReviews(rd.reviews || rd || [])
          }
        } finally {
          setReviewsLoading(false)
        }
      } else {
        const err = await resp.json().catch(() => ({}))
        const msg = err.detail || 'Failed to submit review'
        toast.error(msg)
        setReviewMessage(msg)
      }
    } catch (e) {
      toast.error('Network error submitting review')
      setReviewMessage('Network error submitting review')
    } finally {
      setSubmittingReview(false)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={viewer} onLogin={() => {}} onLogout={() => authService.logout()} />
        <div className="max-w-5xl mx-auto px-6 py-12 text-center text-foreground">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={viewer} onLogin={() => {}} onLogout={() => authService.logout()} />
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-foreground">Profile not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={viewer} onLogin={() => {}} onLogout={() => authService.logout()} />
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">{profile.display_name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getAvailabilityColor(profile.availability)}`}>
                {profile.availability}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {profile.has_beta_master_badge && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-600/30 text-purple-300 border border-purple-600 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Beta Master
                </span>
              )}
              {profile.has_author_badge && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-600/30 text-blue-300 border border-blue-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Author
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-foreground font-medium">{profile.beta_score}/5</span>
                <span>Beta Score</span>
              </div>
              <div>{profile.total_projects_completed} projects completed</div>
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
          {/* Request Actions */}
          <div className="flex flex-col gap-2 ml-6">
            <button onClick={requestBetaRead} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground flex items-center gap-2">
              <Send className="w-4 h-4" /> Request Beta Read
            </button>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-6">
            <p className="text-muted-foreground whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* Genres & Specialties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Genres</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.genres || []).map(genre => (
                <span key={genre} className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                  {genre}
                </span>
              ))}
              {(!profile.genres || profile.genres.length === 0) && (
                <span className="text-muted-foreground">No genres listed</span>
              )}
            </div>
          </div>
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Specialties</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile.specialties || []).map(spec => (
                <span key={spec} className="px-2 py-1 rounded text-xs font-medium bg-muted text-foreground">
                  {spec}
                </span>
              ))}
              {(!profile.specialties || profile.specialties.length === 0) && (
                <span className="text-muted-foreground">No specialties listed</span>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-4 h-4 text-primary" />
            <span className="text-foreground font-medium">Portfolio</span>
          </div>
          <div className="space-y-4">
            {(profile.portfolio_links || []).map((link, i) => (
              <div key={i} className="p-4 bg-muted rounded-lg">
                <a href={link.url} target="_blank" rel="noreferrer" className="text-primary font-medium">
                  {link.title || link.url}
                </a>
                {link.description && (
                  <p className="text-muted-foreground mt-1">{link.description}</p>
                )}
              </div>
            ))}
            {(!profile.portfolio_links || profile.portfolio_links.length === 0) && (
              <p className="text-muted-foreground">No portfolio items added</p>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-8 bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-foreground font-medium">Reviews</span>
            </div>
          </div>
          {reviewsLoading && (
            <p className="text-muted-foreground">Loading reviews...</p>
          )}
          {!reviewsLoading && reviews.length === 0 && (
            <p className="text-muted-foreground">No reviews yet.</p>
          )}
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-foreground font-medium">{rev.reviewer_display_name}</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-foreground">{rev.rating}/5</span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 whitespace-pre-line">{rev.comment}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(rev.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          {/* Submit Review */}
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-foreground font-medium">Leave a Review</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setNewReview(prev => ({ ...prev, rating: n }))}
                  className={`p-2 rounded ${newReview.rating >= n ? 'bg-yellow-600/30 border border-yellow-600' : 'bg-muted'}`}
                >
                  <Star className={`w-4 h-4 ${newReview.rating >= n ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience working with this beta reader..."
              className="w-full p-3 rounded-lg bg-muted text-foreground border border-border"
              rows={4}
            />
            <div className="mt-3 flex items-center gap-3">
              <button onClick={submitReview} disabled={submittingReview || !newReview.comment.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              {reviewMessage && <span className="text-muted-foreground">{reviewMessage}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
