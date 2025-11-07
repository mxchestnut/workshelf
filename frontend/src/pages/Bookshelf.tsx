import { useState, useEffect } from 'react'
import { BookOpen, Star, Plus, Search, TrendingUp, BookMarked, Clock, Heart, ThumbsDown } from 'lucide-react'

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
  const [stats, setStats] = useState<BookshelfStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadBookshelf()
    loadStats()
  }, [activeTab])

  const loadBookshelf = async () => {
    try {
      const token = localStorage.getItem('token')
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
      }
      setLoading(false)
    } catch (err) {
      console.error('Failed to load bookshelf:', err)
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token')
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
    const query = searchQuery.toLowerCase()
    const title = book.title || book.document_title || ''
    const author = book.author || ''
    return title.toLowerCase().includes(query) || author.toLowerCase().includes(query)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading bookshelf...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 pb-8">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Bookshelf</h1>
              <p className="text-purple-100">Track your reading journey</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Book
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{stats.total_books}</div>
                <div className="text-sm text-purple-100">Total Books</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{stats.currently_reading}</div>
                <div className="text-sm text-purple-100">Reading</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{stats.books_read}</div>
                <div className="text-sm text-purple-100">Read</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{stats.want_to_read}</div>
                <div className="text-sm text-purple-100">Want to Read</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{stats.favorites}</div>
                <div className="text-sm text-purple-100">Favorites</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 text-3xl font-bold text-white">
                  {stats.books_read_this_year}
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-sm text-purple-100">This Year</div>
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
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search your books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Books
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'reading'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Currently Reading
            </button>
            <button
              onClick={() => setActiveTab('read')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'read'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              Read
            </button>
            <button
              onClick={() => setActiveTab('want-to-read')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'want-to-read'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Want to Read
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'favorites'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Heart className="w-4 h-4" />
              Favorites
            </button>
            <button
              onClick={() => setActiveTab('dnf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === 'dnf'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              DNF
            </button>
          </div>
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
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
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
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
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-500/20"
              >
                {/* Book Cover */}
                <div className="aspect-[2/3] bg-gradient-to-br from-purple-900 to-indigo-900 relative">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title || book.document_title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-purple-300 opacity-50" />
                    </div>
                  )}
                  {book.is_favorite && (
                    <div className="absolute top-2 right-2 bg-pink-500 text-white p-1.5 rounded-full">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1 line-clamp-2">
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

      {/* Add Book Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Add Book</h2>
            <p className="text-gray-400 mb-6">
              Coming soon: Search by ISBN or add manually!
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
