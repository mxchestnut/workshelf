import { useState, useEffect } from 'react'
import { 
  BookOpen, Star, Heart, ArrowLeft, Calendar, 
  User, Building2, Hash, FileText, Tag, ShoppingCart 
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface BookshelfItem {
  id: number
  item_type: 'document' | 'book'
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

interface BookDetailProps {
  bookId: string
  onBack: () => void
}

export default function BookDetail({ bookId, onBack }: BookDetailProps) {
  const [book, setBook] = useState<BookshelfItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadBook()
  }, [bookId])

  const loadBook = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf/${bookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setBook(data)
      }
    } catch (error) {
      console.error('Failed to load book:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBook = async (updates: Partial<BookshelfItem>) => {
    if (!book) return

    setUpdating(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const updated = await response.json()
        setBook(updated)
      }
    } catch (error) {
      console.error('Failed to update book:', error)
    } finally {
      setUpdating(false)
    }
  }

  const toggleFavorite = () => {
    if (book) {
      updateBook({ is_favorite: !book.is_favorite })
    }
  }

  const updateStatus = (newStatus: string) => {
    updateBook({ status: newStatus })
  }

  const updateRating = (newRating: number) => {
    updateBook({ rating: newRating })
  }

  const getAmazonSearchUrl = (title?: string, author?: string) => {
    const query = `${title || ''} ${author || ''}`.trim()
    return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&i=digital-text`
  }

  const getGoogleBooksUrl = (isbn?: string, title?: string) => {
    if (isbn) {
      return `https://www.google.com/books/edition/_/${isbn}`
    }
    if (title) {
      return `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(title)}`
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Book not found</h2>
          <button
            onClick={onBack}
            className="text-purple-600 hover:text-purple-700"
          >
            Return to Bookshelf
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Bookshelf
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-64 h-96 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-64 h-96 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg shadow-md flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-purple-300" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={toggleFavorite}
                    disabled={updating}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      book.is_favorite
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${book.is_favorite ? 'fill-current' : ''}`} />
                    {book.is_favorite ? 'Favorited' : 'Add to Favorites'}
                  </button>

                  <a
                    href={getAmazonSearchUrl(book.title, book.author)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Buy on Amazon
                  </a>

                  {getGoogleBooksUrl(book.isbn, book.title) && (
                    <a
                      href={getGoogleBooksUrl(book.isbn, book.title)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <BookOpen className="w-5 h-5" />
                      View on Google Books
                    </a>
                  )}
                </div>
              </div>

              {/* Book Details */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{book.title}</h1>
                
                {book.author && (
                  <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
                    <User className="w-5 h-5" />
                    <span>by {book.author}</span>
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => updateRating(star)}
                        disabled={updating}
                        className="transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            book.rating && star <= book.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {book.rating ? `${book.rating}/5` : 'Not rated'}
                  </span>
                </div>

                {/* Status Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reading Status
                  </label>
                  <select
                    value={book.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    disabled={updating}
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="reading">Currently Reading</option>
                    <option value="read">Read</option>
                    <option value="want-to-read">Want to Read</option>
                    <option value="dnf">Did Not Finish</option>
                  </select>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {book.publisher && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">{book.publisher}</span>
                    </div>
                  )}
                  {book.publish_year && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">{book.publish_year}</span>
                    </div>
                  )}
                  {book.page_count && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">{book.page_count} pages</span>
                    </div>
                  )}
                  {book.isbn && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Hash className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">ISBN: {book.isbn}</span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {book.genres && book.genres.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Genres</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {book.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {book.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About this book</h3>
                    <p className="text-gray-700 leading-relaxed">{book.description}</p>
                  </div>
                )}

                {/* Notes */}
                {book.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Notes</h3>
                    <p className="text-gray-700 leading-relaxed">{book.notes}</p>
                  </div>
                )}

                {/* Review */}
                {book.review && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Review</h3>
                    <p className="text-gray-700 leading-relaxed">{book.review}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
