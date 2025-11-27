import { useState, useEffect } from 'react'
import { BookOpen, Star, Heart, Search, Plus, BookMarked, Clock, ThumbsDown, TrendingUp, Sparkles } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import AddBookModal from '../components/AddBookModal'
import BookDetail from './BookDetail'

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
  genres?: string[]
  status: string
  rating?: number
  review?: string
  notes?: string
  is_favorite: boolean
  started_reading?: string
  finished_reading?: string
  added_at: string
}

interface BookRecommendation {
  title: string
  author: string
  isbn?: string
  cover_url?: string
  description?: string
  publisher?: string
  publish_year?: number
  page_count?: number
  genres?: string[]
  reason: string
  favorite_author: string
}

interface BookshelfStats {
  total_books: number
  currently_reading: number
  books_read: number
  want_to_read: number
  favorites: number
  books_read_this_year: number
}

export default function Bookshelf() {
  const [books, setBooks] = useState<BookshelfItem[]>([])
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>([])
  const [stats, setStats] = useState<BookshelfStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    loadUser()
    loadBookshelf()
    loadStats()
    if (activeTab === 'recommendations') {
      loadRecommendations()
    }
  }, [activeTab])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadBookshelf = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      let url = `${API_URL}/api/v1/bookshelf`
      
      // Add filters based on active tab
      if (activeTab !== 'all') {
        if (activeTab === 'favorites') {
          url += '?favorites_only=true'
        } else {
          url += `?status=${activeTab}`
        }
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBooks(data)
      } else {
        // Handle non-OK responses (don't try to parse as JSON if HTML error)
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          console.error('Bookshelf API error:', errorData)
        } else {
          console.error('Bookshelf API error:', response.status, response.statusText)
        }
        
        // If unauthorized, clear token and redirect
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/'
        }
      }
      setLoading(false)
    } catch (err) {
      console.error('Failed to load bookshelf:', err)
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/bookshelf/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoadingRecs(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/bookshelf/recommendations/by-favorite-authors?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations || [])
      }
      setLoadingRecs(false)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
      setLoadingRecs(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reading':
        return <Clock className="w-4 h-4" />
      case 'read':
        return <BookMarked className="w-4 h-4" />
      case 'want-to-read':
        return <BookOpen className="w-4 h-4" />
      case 'favorites':
        return <Heart className="w-4 h-4" />
      case 'dnf':
        return <ThumbsDown className="w-4 h-4" />
      default:
        return <BookOpen className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reading':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'read':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'want-to-read':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'favorites':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'dnf':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredBooks = books.filter(book => {
    // Filter by active tab
    if (activeTab !== 'all' && activeTab !== 'recommendations') {
      if (book.status !== activeTab) {
        return false
      }
    }
    
    // Filter by search query
    const query = searchQuery.toLowerCase()
    const title = book.title || book.document_title || ''
    const author = book.author || ''
    return title.toLowerCase().includes(query) || author.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="bookshelf" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg" style={{ color: 'white' }}>Loading bookshelf...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {selectedBookId ? (
        <BookDetail 
          bookId={selectedBookId} 
          onBack={() => {
            setSelectedBookId(null)
            loadBookshelf() // Refresh in case anything changed
          }} 
        />
      ) : (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="bookshelf" />
      
      {/* Header */}
      <div className="pb-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">My Bookshelf</h1>
              <p className="text-foreground">Track your reading journey</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90"
                className="bg-muted text-foreground"
              >
                <Plus className="w-5 h-5" />
                Add Book
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-3xl font-bold text-foreground">{stats.total_books}</div>
                <div className="text-sm text-foreground">Total Books</div>
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-3xl font-bold text-foreground">{stats.currently_reading}</div>
                <div className="text-sm text-foreground">Reading</div>
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-3xl font-bold text-foreground">{stats.books_read}</div>
                <div className="text-sm text-foreground">Read</div>
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-3xl font-bold text-foreground">{stats.want_to_read}</div>
                <div className="text-sm text-foreground">Want to Read</div>
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <div className="text-3xl font-bold text-foreground">{stats.favorites}</div>
                <div className="text-sm text-foreground">Favorites</div>
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <div className="flex items-center gap-2 text-3xl font-bold text-foreground">
                  {stats.books_read_this_year}
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-sm text-foreground">This Year</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Tabs */}
        <div className="mb-8">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search your books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none bg-muted border-border text-foreground"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className="px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'all' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              All Books
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'reading' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              <Clock className="w-4 h-4" />
              Currently Reading
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'read' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              <BookMarked className="w-4 h-4" />
              Read
            </button>
            <button
              onClick={() => setActiveTab('want-to-read')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'want-to-read' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              <BookOpen className="w-4 h-4" />
              Want to Read
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'favorites' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              <Heart className="w-4 h-4" />
              Favorites
            </button>
            <button
              onClick={() => setActiveTab('dnf')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-opacity hover:opacity-90"
              style={{
                backgroundColor: activeTab === 'dnf' ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                color: 'white'
              }}
            >
              <ThumbsDown className="w-4 h-4" />
              DNF
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'recommendations'
                  ? 'bg-[hsl(var(--primary))] text-foreground'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Recommendations
            </button>
          </div>
        </div>

        {/* Books Grid */}
        {activeTab === 'recommendations' ? (
          loadingRecs ? (
            <div className="text-center text-gray-400 py-12">Loading recommendations...</div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Recommendations Yet</h3>
              <p className="text-gray-400 mb-4">
                Mark some authors as favorites on the Authors page to get personalized book recommendations!
              </p>
              <button
                onClick={() => window.location.href = '/authors'}
                className="px-6 py-3 bg-[hsl(var(--primary))] text-foreground rounded-lg font-semibold hover:bg-[hsl(var(--primary))] transition-colors"
              >
                Go to Authors
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Recommendations from Your Favorite Authors</h2>
                <p className="text-gray-400">Books we think you'll love based on authors you've favorited</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-[hsl(var(--primary))] transition-all">
                    {rec.cover_url && (
                      <img
                        src={rec.cover_url}
                        alt={rec.title}
                        className="w-full h-64 object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2">{rec.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{rec.author}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-orange-300">{rec.reason}</span>
                      </div>
                      {rec.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-3">{rec.description}</p>
                      )}
                      {rec.genres && rec.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {rec.genres.slice(0, 2).map((genre, gidx) => (
                            <span key={gidx} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          // TODO: Add to bookshelf functionality
                          console.log('Add to bookshelf:', rec)
                        }}
                        className="w-full px-4 py-2 bg-[hsl(var(--primary))] text-foreground rounded-lg font-medium hover:bg-[hsl(var(--primary))] transition-colors"
                      >
                        Add to Bookshelf
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchQuery ? 'No books found' : 'Your bookshelf is empty'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Start tracking your reading by adding your first book!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-[hsl(var(--primary))] text-foreground rounded-lg font-semibold hover:bg-[hsl(var(--primary))] transition-colors"
              >
                Add Your First Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => setSelectedBookId(book.id.toString())}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-[hsl(var(--primary))] transition-all hover:shadow-lg hover:shadow-[hsl(var(--primary))]/20 cursor-pointer"
              >
                {/* Book Cover */}
                <div className="aspect-[2/3] bg-gradient-to-br from-[hsl(var(--muted))] to-[hsl(var(--background))] relative">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title || book.document_title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-orange-300 opacity-50" />
                    </div>
                  )}
                  {book.is_favorite && (
                    <div className="absolute top-2 right-2 bg-pink-500 text-foreground p-1.5 rounded-full">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                    {book.title || book.document_title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-1">
                    {book.author || 'Unknown Author'}
                  </p>

                  {/* Status Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mb-3 ${getStatusColor(book.status)}`}>
                    {getStatusIcon(book.status)}
                    {book.status.replace('-', ' ')}
                  </div>

                  {/* Rating */}
                  {book.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= book.rating!
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Page Count */}
                  {book.page_count && (
                    <p className="text-xs text-gray-500">{book.page_count} pages</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onBookAdded={() => {
          loadBookshelf()
          loadStats()
        }}
      />
    </div>
      )}
    </>
  )
}
