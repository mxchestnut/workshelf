import { useState, useEffect } from 'react'
import { BookOpen, Search, Download, Plus, Loader2, BookMarked, TrendingUp } from 'lucide-react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface FreeBook {
  id: string
  title: string
  author: string
  cover_url?: string
  epub_url?: string
  source: string
  source_id: string
  is_free: boolean
  license: string
  download_count: number
  genres: string[]
  language: string
  description?: string
}

export default function FreeBooks() {
  const [books, setBooks] = useState<FreeBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [addingBook, setAddingBook] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'popular' | 'search'>('popular')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    loadPopularBooks()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadPopularBooks = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/free-books/popular?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBooks(data.results || [])
        setViewMode('popular')
      }
    } catch (error) {
      console.error('Failed to load popular books:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchBooks = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/free-books/search?query=${encodeURIComponent(searchQuery)}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setBooks(data.results || [])
        setViewMode('search')
      }
    } catch (error) {
      console.error('Failed to search books:', error)
    } finally {
      setSearching(false)
    }
  }

  const addToShelf = async (book: FreeBook) => {
    setAddingBook(book.id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/free-books/add-to-shelf/${book.id}?status=want-to-read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        alert(`"${book.title}" added to your bookshelf!`)
        // Remove from list
        setBooks(books.filter(b => b.id !== book.id))
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to add book')
      }
    } catch (error) {
      console.error('Failed to add book:', error)
      alert('Failed to add book to shelf')
    } finally {
      setAddingBook(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBooks()
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="free-books" />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      {/* Header */}
      <div className="text-white py-16" style={{ 
        background: 'linear-gradient(135deg, #B34B0C 0%, #7C3306 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <BookMarked className="w-10 h-10" />
              Free Books Library
            </h1>
            <p className="text-white opacity-90">70,000+ public domain books from Project Gutenberg</p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search by title, author, or subject..."
              className="w-full px-4 py-3 pl-12 pr-24 rounded-lg transition-all text-gray-900"
              style={{ 
                backgroundColor: '#FFFFFF',
                border: '2px solid #6C6A68'
              }}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              onClick={searchBooks}
              disabled={searching || !searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
              style={{ backgroundColor: '#7C3306' }}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* View Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadPopularBooks}
              className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
              style={viewMode === 'popular' 
                ? { backgroundColor: '#FFFFFF', color: '#B34B0C' }
                : { backgroundColor: '#7C3306', color: '#FFFFFF' }
              }
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Most Popular
            </button>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: '#B34B0C' }} />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#B3B2B0' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#B3B2B0' }}>
              {viewMode === 'search' ? 'No books found' : 'No books available'}
            </h3>
            <p style={{ color: '#B3B2B0' }}>
              {viewMode === 'search' ? 'Try a different search term' : 'Try searching for books'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {viewMode === 'popular' ? 'Most Popular Books' : `Search Results for "${searchQuery}"`}
              </h2>
              <p style={{ color: '#B3B2B0' }}>{books.length} books found</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
                  style={{ backgroundColor: '#524944' }}
                >
                  {/* Book Cover */}
                  <div className="aspect-[2/3] relative" style={{ 
                    background: 'linear-gradient(135deg, #6C6A68 0%, #524944 100%)'
                  }}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16" style={{ color: '#B3B2B0' }} />
                      </div>
                    )}
                    
                    {/* Download Count Badge */}
                    {book.download_count > 0 && (
                      <div className="absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: '#B34B0C' }}>
                        <Download className="w-3 h-3" />
                        {book.download_count > 1000 
                          ? `${(book.download_count / 1000).toFixed(1)}k` 
                          : book.download_count
                        }
                      </div>
                    )}

                    {/* Add Button Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => addToShelf(book)}
                        disabled={addingBook === book.id}
                        className="px-4 py-2 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2 hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#B34B0C' }}
                      >
                        {addingBook === book.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add to Shelf
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 line-clamp-2 min-h-[2.5rem]">
                      {book.title}
                    </h3>
                    <p className="text-sm mb-2 line-clamp-1" style={{ color: '#B3B2B0' }}>
                      {book.author}
                    </p>

                    {/* Genres */}
                    {book.genres && book.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {book.genres.slice(0, 2).map((genre, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: '#37322E', color: '#B34B0C' }}
                          >
                            {genre.length > 15 ? genre.substring(0, 15) + '...' : genre}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Source Badge */}
                    <div className="flex items-center justify-between text-xs" style={{ color: '#B3B2B0' }}>
                      <span className="flex items-center gap-1">
                        <BookMarked className="w-3 h-3" />
                        {book.source}
                      </span>
                      {book.epub_url && (
                        <span className="font-medium" style={{ color: '#B34B0C' }}>EPUB</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
