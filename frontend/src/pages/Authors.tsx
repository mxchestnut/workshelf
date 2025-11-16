import { useState, useEffect } from 'react'
import { Users, Star, Heart, Search, BookOpen, Clock, TrendingUp, Plus, X, Loader } from 'lucide-react'

interface BookResult {
  title: string
  author: string
  isbn?: string
  cover_url?: string
  description?: string
  publisher?: string
  publish_year?: number
  page_count?: number
  genres?: string[]
}

interface AuthorFollow {
  id: number
  author_name: string
  author_bio?: string
  author_photo_url?: string
  author_website?: string
  genres?: string[]
  status: string
  is_favorite: boolean
  notes?: string
  discovery_source?: string
  added_at: string
  created_at: string
  updated_at: string
}

interface AuthorStats {
  total_authors: number
  currently_reading: number
  authors_read: number
  want_to_read: number
  favorites: number
}

export default function Authors() {
  const [authors, setAuthors] = useState<AuthorFollow[]>([])
  const [stats, setStats] = useState<AuthorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAuthorName, setNewAuthorName] = useState('')
  const [newAuthorStatus, setNewAuthorStatus] = useState('want-to-read')
  const [addingAuthor, setAddingAuthor] = useState(false)
  
  // Books modal state
  const [showBooksModal, setShowBooksModal] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState<string>('')
  const [authorBooks, setAuthorBooks] = useState<BookResult[]>([])
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [addingBook, setAddingBook] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    loadAuthors()
    loadStats()
  }, [activeTab])

  const loadAuthors = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      let url = `${API_URL}/api/v1/authors`
      
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
        setAuthors(data)
      }
      setLoading(false)
    } catch (err) {
      console.error('Failed to load authors:', err)
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/authors/stats`, {
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

  const toggleFavorite = async (authorId: number, currentFavorite: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_favorite: !currentFavorite
        })
      })

      if (response.ok) {
        loadAuthors()
        loadStats()
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const updateStatus = async (authorId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      if (response.ok) {
        loadAuthors()
        loadStats()
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const addAuthor = async () => {
    if (!newAuthorName.trim()) return

    setAddingAuthor(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/authors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          author_name: newAuthorName.trim(),
          status: newAuthorStatus,
          discovery_source: 'manual'
        })
      })

      if (response.ok) {
        setShowAddModal(false)
        setNewAuthorName('')
        setNewAuthorStatus('want-to-read')
        loadAuthors()
        loadStats()
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to add author')
      }
    } catch (err) {
      console.error('Failed to add author:', err)
      alert('Failed to add author')
    } finally {
      setAddingAuthor(false)
    }
  }

  const loadAuthorBooks = async (authorName: string) => {
    setSelectedAuthor(authorName)
    setShowBooksModal(true)
    setLoadingBooks(true)
    setAuthorBooks([])

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `${API_URL}/api/v1/authors/search/${encodeURIComponent(authorName)}/books?max_results=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setAuthorBooks(data.books || [])
      } else {
        alert('Failed to load books')
      }
    } catch (err) {
      console.error('Failed to load author books:', err)
      alert('Failed to load books')
    } finally {
      setLoadingBooks(false)
    }
  }

  const addBookToShelf = async (book: BookResult) => {
    setAddingBook(book.title)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_type: 'book',
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          cover_url: book.cover_url,
          description: book.description,
          publisher: book.publisher,
          publish_year: book.publish_year,
          page_count: book.page_count,
          genres: book.genres,
          status: 'want-to-read'
        })
      })

      if (response.ok) {
        // Remove from books list
        setAuthorBooks(prev => prev.filter(b => b.title !== book.title))
        alert('Book added to your bookshelf!')
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to add book')
      }
    } catch (err) {
      console.error('Failed to add book:', err)
      alert('Failed to add book')
    } finally {
      setAddingBook(null)
    }
  }

  const filteredAuthors = authors.filter(author =>
    author.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const badges = {
      'reading': { color: 'bg-blue-100 text-blue-800', label: 'Reading' },
      'read': { color: 'bg-green-100 text-green-800', label: 'Read' },
      'want-to-read': { color: 'bg-yellow-100 text-yellow-800', label: 'Want to Read' },
      'favorites': { color: 'bg-purple-100 text-purple-800', label: 'Favorite' }
    }
    return badges[status as keyof typeof badges] || badges['want-to-read']
  }

  const tabs = [
    { id: 'all', label: 'All Authors', icon: Users },
    { id: 'reading', label: 'Currently Reading', icon: BookOpen },
    { id: 'read', label: 'Read', icon: Clock },
    { id: 'want-to-read', label: 'Want to Read', icon: TrendingUp },
    { id: 'favorites', label: 'Favorites', icon: Star }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              My Authors
            </h1>
            <p className="mt-2 text-gray-600">
              Track your favorite authors and discover new voices
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Author
          </button>
        </div>

        {/* Add Author Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Author</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    placeholder="e.g., Anne Rice"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addAuthor()
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newAuthorStatus}
                    onChange={(e) => setNewAuthorStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="want-to-read">Want to Read</option>
                    <option value="reading">Reading</option>
                    <option value="read">Read</option>
                    <option value="favorites">Favorites</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addAuthor}
                    disabled={addingAuthor || !newAuthorName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingAuthor ? 'Adding...' : 'Add Author'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Authors</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_authors}</p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reading</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.currently_reading}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Read</p>
                  <p className="text-2xl font-bold text-green-600">{stats.authors_read}</p>
                </div>
                <Clock className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Want to Read</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.want_to_read}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Favorites</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.favorites}</p>
                </div>
                <Star className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Authors List */}
        {filteredAuthors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No authors yet</h3>
            <p className="text-gray-600">
              Add books to your bookshelf to automatically track authors!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuthors.map(author => {
              const badge = getStatusBadge(author.status)
              return (
                <div key={author.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {author.author_name}
                        </h3>
                        {author.discovery_source && (
                          <p className="text-xs text-gray-500">
                            Found via: {author.discovery_source}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFavorite(author.id, author.is_favorite)}
                        className="ml-2"
                      >
                        <Heart
                          className={`w-6 h-6 ${
                            author.is_favorite
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Bio */}
                    {author.author_bio && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {author.author_bio}
                      </p>
                    )}

                    {/* Genres */}
                    {author.genres && author.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {author.genres.slice(0, 3).map((genre, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                        {author.genres.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            +{author.genres.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Status Change Buttons */}
                    <div className="flex flex-col gap-2">
                      <select
                        value={author.status}
                        onChange={(e) => updateStatus(author.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="reading">Reading</option>
                        <option value="read">Read</option>
                        <option value="want-to-read">Want to Read</option>
                        <option value="favorites">Favorites</option>
                      </select>
                      <button
                        onClick={() => loadAuthorBooks(author.author_name)}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-center rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        View Books
                      </button>
                    </div>

                    {/* Notes */}
                    {author.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600 italic">{author.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Books Modal */}
        {showBooksModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Books by {selectedAuthor}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {loadingBooks ? 'Searching...' : `${authorBooks.length} books found`}
                  </p>
                </div>
                <button
                  onClick={() => setShowBooksModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {loadingBooks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                  </div>
                ) : authorBooks.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
                    <p className="text-gray-600">
                      We couldn't find any books by this author that aren't already in your bookshelf.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {authorBooks.map((book, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        {book.cover_url && (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-64 object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[3rem]">
                            {book.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{book.author}</p>
                          
                          {book.description && (
                            <p className="text-xs text-gray-500 mb-3 line-clamp-3">
                              {book.description}
                            </p>
                          )}
                          
                          {book.genres && book.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {book.genres.slice(0, 2).map((genre, gidx) => (
                                <span
                                  key={gidx}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {genre}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            {book.publish_year && <span>{book.publish_year}</span>}
                            {book.page_count && <span>{book.page_count} pages</span>}
                          </div>
                          
                          <button
                            onClick={() => addBookToShelf(book)}
                            disabled={addingBook === book.title}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {addingBook === book.title ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader className="w-4 h-4 animate-spin" />
                                Adding...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add to Bookshelf
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
