import { useState, useEffect } from 'react'
import { 
  BookOpen, Star, Heart, ArrowLeft, Calendar, 
  User, Building2, Hash, FileText, Tag, ShoppingCart 
} from 'lucide-react'
import EpubReader from '../components/EpubReader'

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
  epub_url?: string // URL to EPUB file
  reading_progress?: number // Percentage read
  last_location?: string // EPUB CFI location
}

interface StoreItem {
  id: number
  title: string
  author_name: string
  author_id?: number
  description?: string
  long_description?: string
  genres?: string[]
  isbn?: string
  price_usd: number
  currency: string
  discount_percentage: number
  final_price: number
  cover_url?: string
  sample_url?: string
  total_sales: number
  rating_average?: number
  rating_count: number
  is_featured: boolean
  is_bestseller: boolean
  is_new_release: boolean
  published_at?: string
}

interface BookDetailProps {
  bookId: string
  onBack: () => void
}

export default function BookDetail({ bookId, onBack }: BookDetailProps) {
  const [book, setBook] = useState<BookshelfItem | null>(null)
  const [storeItem, setStoreItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showReader, setShowReader] = useState(false)
  const [purchasing, setPurchasing] = useState(false)

  const isStoreItem = bookId.startsWith('store-')
  const actualId = isStoreItem ? bookId.replace('store-', '') : bookId

  useEffect(() => {
    loadBook()
  }, [bookId])

  const loadBook = async () => {
    try {
      if (isStoreItem) {
        // Load from store API (no auth required)
        const response = await fetch(`${API_URL}/api/v1/store/${actualId}`)
        if (response.ok) {
          const data = await response.json()
          setStoreItem(data)
        }
      } else {
        // Load from bookshelf API (auth required)
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_URL}/api/v1/bookshelf/${actualId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setBook(data)
        }
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

  const saveReadingProgress = async (location: string, progress: number) => {
    try {
      const token = localStorage.getItem('access_token')
      await fetch(`${API_URL}/api/v1/bookshelf/${actualId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          last_location: location,
          reading_progress: progress
        })
      })
    } catch (error) {
      console.error('Failed to save reading progress:', error)
    }
  }

  const handlePurchase = async () => {
    if (!storeItem) return

    setPurchasing(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch(`${API_URL}/api/v1/store/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          store_item_id: storeItem.id,
          success_url: `${window.location.origin}/store/success`,
          cancel_url: window.location.href
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.detail || 'Failed to create checkout')
        return
      }

      const data = await response.json()
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to start checkout process')
    } finally {
      setPurchasing(false)
    }
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

  if (!book && !storeItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Book not found</h2>
          <button
            onClick={onBack}
            className="text-purple-600 hover:text-purple-700"
          >
            Return to {isStoreItem ? 'Store' : 'Bookshelf'}
          </button>
        </div>
      </div>
    )
  }

  // Use store item or bookshelf item data
  const displayData = storeItem || book
  const title = storeItem ? storeItem.title : book?.title
  const author = storeItem ? storeItem.author_name : book?.author
  const coverUrl = displayData?.cover_url
  const description = storeItem ? (storeItem.long_description || storeItem.description) : book?.description
  const genres = displayData?.genres

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to {isStoreItem ? 'Store' : 'Bookshelf'}
        </button>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Book Cover */}
              <div className="flex-shrink-0">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={title}
                    className="w-64 h-96 object-cover rounded-lg shadow-md"
                  />
                ) : (
                  <div className="w-64 h-96 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg shadow-md flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-purple-300" />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  {/* Store Item: Buy Now Button */}
                  {isStoreItem && storeItem && (
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {purchasing ? 'Processing...' : `Buy Now - $${storeItem.final_price.toFixed(2)}`}
                    </button>
                  )}

                  {/* Bookshelf Item: Read Book Button - Only show if epub_url exists */}
                  {!isStoreItem && book?.epub_url && (
                    <button
                      onClick={() => setShowReader(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    >
                      <BookOpen className="w-5 h-5" />
                      {book.reading_progress && book.reading_progress > 0 
                        ? `Continue Reading (${Math.round(book.reading_progress)}%)` 
                        : 'Start Reading'
                      }
                    </button>
                  )}

                  {/* Bookshelf Item: Favorite Button */}
                  {!isStoreItem && book && (
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
                  )}

                  {/* Google Books Link */}
                  {!isStoreItem && book && getGoogleBooksUrl(book.isbn, book.title) && (
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
                
                {author && (
                  <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
                    <User className="w-5 h-5" />
                    <span>by {author}</span>
                  </div>
                )}

                {/* Rating - Only for store items or if bookshelf item has rating */}
                {storeItem ? (
                  storeItem.rating_average && storeItem.rating_count > 0 && (
                    <div className="flex items-center gap-2 mb-6">
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">{storeItem.rating_average.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">({storeItem.rating_count} reviews)</span>
                    </div>
                  )
                ) : (
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
                              book?.rating && star <= book.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {book?.rating ? `${book.rating}/5` : 'Not rated'}
                    </span>
                  </div>
                )}

                {/* Status Selector - Only for bookshelf items */}
                {!isStoreItem && book && (
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
                )}

                {/* Metadata - Only for bookshelf items */}
                {!isStoreItem && book && (
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
                )}

                {/* Store Item: Price and Sales Info */}
                {isStoreItem && storeItem && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-bold text-purple-600">
                        ${storeItem.final_price.toFixed(2)}
                      </span>
                      {storeItem.discount_percentage > 0 && (
                        <span className="text-lg text-gray-400 line-through">
                          ${storeItem.price_usd.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{storeItem.total_sales} copies sold</p>
                  </div>
                )}

                {/* Genres */}
                {genres && genres.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-5 h-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Genres</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre, index) => (
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
                {description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About this book</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{description}</p>
                  </div>
                )}

                {/* Notes - Only for bookshelf items */}
                {!isStoreItem && book?.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Notes</h3>
                    <p className="text-gray-700 leading-relaxed">{book.notes}</p>
                  </div>
                )}

                {/* Review - Only for bookshelf items */}
                {!isStoreItem && book?.review && (
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

      {/* EPUB Reader Modal - Only for bookshelf items with EPUB */}
      {showReader && book?.epub_url && (
        <EpubReader
          epubUrl={book.epub_url}
          bookTitle={book.title || 'Book'}
          onClose={() => setShowReader(false)}
          onProgressChange={saveReadingProgress}
          initialLocation={book.last_location}
        />
      )}
    </div>
  )
}
