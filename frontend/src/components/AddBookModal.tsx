import { useState } from 'react'
import { X, Search, BookOpen, Plus, Loader2, Sparkles } from 'lucide-react'

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onBookAdded: () => void
}

interface BookSearchResult {
  isbn: string
  title: string
  author: string
  cover_url?: string
  publisher?: string
  publish_year?: number
  page_count?: number
  description?: string
  genres?: string[]
}

interface EnhancedData {
  isbn?: string
  page_count?: number
  description?: string
  genres?: string[]
  ai_enhanced: boolean
  fields_enhanced: string[]
}

export default function AddBookModal({ isOpen, onClose, onBookAdded }: AddBookModalProps) {
  const [searchMode, setSearchMode] = useState<'search' | 'manual'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([])
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [enhancing, setEnhancing] = useState<number | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  
  // Recommendations state
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [recommendedBooks, setRecommendedBooks] = useState<BookSearchResult[]>([])
  const [lastAddedBook, setLastAddedBook] = useState<BookSearchResult | null>(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)

  // Manual entry form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    cover_url: '',
    publisher: '',
    publish_year: '',
    page_count: '',
    description: '',
    status: 'want-to-read' as string,
    rating: '',
  })

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setSearchResults([])
    setSearchPerformed(false)

    try {
      // Search Google Books API
      // Support ISBN, title, author, or any combination
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=10`
      )
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const results: BookSearchResult[] = data.items.map((item: any) => {
          const book = item.volumeInfo
          const industryIdentifiers = book.industryIdentifiers || []
          const isbn13 = industryIdentifiers.find((id: any) => id.type === 'ISBN_13')?.identifier
          const isbn10 = industryIdentifiers.find((id: any) => id.type === 'ISBN_10')?.identifier
          
          return {
            isbn: isbn13 || isbn10 || '',
            title: book.title || '',
            author: book.authors?.join(', ') || '',
            cover_url: book.imageLinks?.thumbnail?.replace('http://', 'https://') || 
                       book.imageLinks?.smallThumbnail?.replace('http://', 'https://') || '',
            publisher: book.publisher || '',
            publish_year: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : undefined,
            page_count: book.pageCount || undefined,
            description: book.description || '',
            genres: book.categories || [],
          }
        })
        setSearchResults(results)
      }
      setSearchPerformed(true)
    } catch (error) {
      console.error('Failed to search books:', error)
      alert('Failed to search for books. Please try manual entry.')
    } finally {
      setSearching(false)
    }
  }

  const handleSuggestBook = async () => {
    setSuggesting(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/book-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          reason: 'Not found in search results'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit suggestion')
      }

      alert('Thank you! Your book suggestion has been submitted for review by our staff.')
      setSearchQuery('')
      setSearchResults([])
      setSearchPerformed(false)
    } catch (error) {
      console.error('Failed to suggest book:', error)
      alert('Failed to submit suggestion. Please try again.')
    } finally {
      setSuggesting(false)
    }
  }

  const handleAddFromSearch = async (book: BookSearchResult) => {
    setAdding(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_type: 'book',
          isbn: book.isbn || undefined,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url || undefined,
          publisher: book.publisher || undefined,
          publish_year: book.publish_year,
          page_count: book.page_count,
          description: book.description || undefined,
          genres: book.genres || undefined,
          status: 'want-to-read',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add book')
      }

      // Show recommendations instead of closing
      setLastAddedBook(book)
      setSearchResults([])
      await loadRecommendations(book)
      
    } catch (error: any) {
      console.error('Failed to add book:', error)
      alert(error.message || 'Failed to add book to shelf')
    } finally {
      setAdding(false)
    }
  }

  const loadRecommendations = async (book: BookSearchResult) => {
    setShowRecommendations(true)
    setLoadingRecommendations(true)
    
    try {
      const token = localStorage.getItem('access_token')
      
      // Load more books by the same author
      const authorResponse = await fetch(
        `${API_URL}/api/v1/authors/search/${encodeURIComponent(book.author)}/books?max_results=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (authorResponse.ok) {
        const authorData = await authorResponse.json()
        setRecommendedBooks(authorData.books || [])
      }
      
    } catch (error) {
      console.error('Failed to load recommendations:', error)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleEnhanceBook = async (book: BookSearchResult, index: number) => {
    setEnhancing(index)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf/enhance-book-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          publisher: book.publisher,
          publish_year: book.publish_year,
          isbn: book.isbn || null,
          page_count: book.page_count || null,
          description: book.description || null,
          genres: book.genres || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to enhance book data')
      }

      const enhanced: EnhancedData = await response.json()

      if (enhanced.ai_enhanced) {
        // Update the book in search results with enhanced data
        const updatedResults = [...searchResults]
        updatedResults[index] = {
          ...book,
          isbn: enhanced.isbn || book.isbn,
          page_count: enhanced.page_count || book.page_count,
          description: enhanced.description || book.description,
          genres: enhanced.genres || book.genres,
        }
        setSearchResults(updatedResults)

        // Show which fields were enhanced
        alert(
          `✨ AI Enhanced!\n\nImproved fields: ${enhanced.fields_enhanced.join(', ')}\n\nThe book data has been updated with more complete information.`
        )
      } else {
        alert('This book already has complete data!')
      }
    } catch (error: any) {
      console.error('Failed to enhance book:', error)
      alert(error.message || 'Failed to enhance book data. Please try again.')
    } finally {
      setEnhancing(null)
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.author) {
      alert('Title and author are required')
      return
    }

    setAdding(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_type: 'book',
          isbn: formData.isbn || undefined,
          title: formData.title,
          author: formData.author,
          cover_url: formData.cover_url || undefined,
          publisher: formData.publisher || undefined,
          publish_year: formData.publish_year ? parseInt(formData.publish_year) : undefined,
          page_count: formData.page_count ? parseInt(formData.page_count) : undefined,
          description: formData.description || undefined,
          status: formData.status,
          rating: formData.rating ? parseInt(formData.rating) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add book')
      }

      // Reset and close
      setFormData({
        title: '',
        author: '',
        isbn: '',
        cover_url: '',
        publisher: '',
        publish_year: '',
        page_count: '',
        description: '',
        status: 'want-to-read',
        rating: '',
      })
      onBookAdded()
      onClose()
    } catch (error: any) {
      console.error('Failed to add book:', error)
      alert(error.message || 'Failed to add book to shelf')
    } finally {
      setAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#524944] to-[#37322E] text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold">Add Book to Shelf</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode('search')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchMode === 'search'
                  ? 'bg-white text-[#B34B0C] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              Search Books
            </button>
            <button
              onClick={() => setSearchMode('manual')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchMode === 'manual'
                  ? 'bg-white text-[#B34B0C] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {searchMode === 'search' ? (
            <div className="space-y-4">
              {/* Book Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for a Book
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="ISBN, title, author, or keywords..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !searchQuery.trim()}
                    className="px-6 py-2 bg-[#B34B0C] text-white rounded-lg hover:bg-[#8A3809] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Powered by Google Books - Search by ISBN, title, author, or any keywords
                </p>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map((book, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex gap-4">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-20 h-28 object-cover rounded-lg shadow-md flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-28 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base text-gray-900 mb-1 line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1">{book.author || 'Unknown Author'}</p>
                          {book.publisher && (
                            <p className="text-xs text-gray-500">
                              {book.publisher}
                              {book.publish_year && ` (${book.publish_year})`}
                            </p>
                          )}
                          {book.page_count && (
                            <p className="text-xs text-gray-500">
                              {book.page_count} pages
                            </p>
                          )}
                          {book.isbn && (
                            <p className="text-xs text-gray-400 mt-1">
                              ISBN: {book.isbn}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFromSearch(book)}
                        disabled={adding}
                        className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                      >
                        {adding ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Add to Bookshelf
                          </>
                        )}
                      </button>

                      {/* AI Enhancement Button - Show if data is incomplete */}
                      {(!book.isbn || !book.page_count || !book.description || (book.description && book.description.length < 100) || !book.genres || book.genres.length === 0) && (
                        <button
                          onClick={() => handleEnhanceBook(book, index)}
                          disabled={enhancing === index}
                          className="w-full mt-2 px-4 py-2 bg-orange-50 text-[#B34B0C] border-2 border-[#B34B0C]/30 rounded-lg hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                        >
                          {enhancing === index ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enhancing with AI...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              ✨ Enhance with AI
                              <span className="text-xs ml-1">
                                (Missing: {[
                                  !book.isbn && 'ISBN',
                                  !book.page_count && 'pages',
                                  (!book.description || book.description.length < 100) && 'description',
                                  (!book.genres || book.genres.length === 0) && 'genres'
                                ].filter(Boolean).join(', ')})
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No Results - Show Suggest Book */}
              {searchPerformed && searchResults.length === 0 && !searching && (
                <div className="mt-4 p-6 bg-orange-50 border-2 border-[#B34B0C]/30 rounded-lg">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 text-[#B34B0C] mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No books found for "{searchQuery}"
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      We couldn't find any books matching your search. You can:
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleSuggestBook}
                        disabled={suggesting}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors disabled:opacity-50"
                      >
                        {suggesting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Submitting Suggestion...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Suggest This Book to Staff
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setSearchMode('manual')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#B34B0C] text-[#B34B0C] rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                        Add Book Manually
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Book suggestions are reviewed by staff and added to our library if approved.
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {showRecommendations && lastAddedBook && (
                <div className="mt-6 border-t-2 border-[#B34B0C]/30 pt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      ✨ Book Added Successfully!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Added "{lastAddedBook.title}" by {lastAddedBook.author}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-[#524944] mb-2 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      More by {lastAddedBook.author}
                    </h4>
                    {loadingRecommendations ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-[#B34B0C] animate-spin" />
                      </div>
                    ) : recommendedBooks.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {recommendedBooks.map((book, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-[#B34B0C]/20">
                            <div className="flex gap-3">
                              {book.cover_url ? (
                                <img
                                  src={book.cover_url}
                                  alt={book.title}
                                  className="w-12 h-16 object-cover rounded flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                  <BookOpen className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-gray-900 line-clamp-1">
                                  {book.title}
                                </h5>
                                {book.publish_year && (
                                  <p className="text-xs text-gray-500">{book.publish_year}</p>
                                )}
                                {book.genres && book.genres.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {book.genres.slice(0, 2).map((genre, gidx) => (
                                      <span key={gidx} className="px-2 py-0.5 bg-orange-100 text-[#B34B0C] text-xs rounded">
                                        {genre}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAddFromSearch(book)}
                              disabled={adding}
                              className="w-full mt-2 px-3 py-1.5 bg-[#B34B0C] text-white rounded text-xs font-medium hover:bg-[#8A3809] disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {adding ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Add to Shelf
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 text-center py-4">
                        No other books found by this author
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRecommendations(false)
                        setRecommendedBooks([])
                        setLastAddedBook(null)
                        setSearchQuery('')
                        onBookAdded()
                        onClose()
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => {
                        setShowRecommendations(false)
                        setRecommendedBooks([])
                        setLastAddedBook(null)
                        setSearchQuery('')
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                    >
                      Add Another Book
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddManual} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Book title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                  required
                />
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN (optional)
                </label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="ISBN-10 or ISBN-13"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                >
                  <option value="want-to-read">📚 Want to Read</option>
                  <option value="reading">📖 Currently Reading</option>
                  <option value="read">✅ Read</option>
                  <option value="dnf">❌ Did Not Finish</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="Optional rating"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                />
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                />
              </div>

              {/* Publisher & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Publisher"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year (optional)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="2100"
                    value={formData.publish_year}
                    onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                    placeholder="2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Page Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Count (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.page_count}
                  onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                  placeholder="Number of pages"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Book description or synopsis"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B34B0C] focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={adding}
                className="w-full px-4 py-3 bg-[#B34B0C] text-white rounded-lg hover:bg-[#8A3809] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Book...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Bookshelf
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
