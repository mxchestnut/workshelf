import { useState, useEffect, lazy, Suspense } from 'react'
import { 
  BookOpen, Star, Heart, ArrowLeft, Calendar, 
  User, Building2, Hash, FileText, Tag, ShoppingCart, Clock, Trash2
} from 'lucide-react'
import { calculateBookReadingTime } from '../utils/reading-time'
import { toast } from '../components/Toast'

// Lazy load the EPUB reader (large dependency)
const EpubReader = lazy(() => import('../components/EpubReader'))

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

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
  // Audiobook fields
  has_audiobook: boolean
  audiobook_narrator?: string
  audiobook_duration_minutes?: number
  audiobook_file_url?: string
  audiobook_sample_url?: string
  audiobook_file_format?: string
  audiobook_file_size_bytes?: number
  audiobook_price_usd?: number
  audiobook_final_price?: number
  available_formats: string[]
  has_ebook: boolean
}

interface BookDetailProps {
  bookId?: string
  onBack?: () => void
}

export default function BookDetail({ bookId: propBookId, onBack }: BookDetailProps) {
  // Get bookId from props or URL
  const urlPath = window.location.pathname
  const urlBookId = urlPath.startsWith('/book/') ? urlPath.substring(6) : null
  const bookId = propBookId || urlBookId || ''
  
  // Default onBack handler
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // If called from URL, determine where to go back to
      // If user owns the book (it's in their bookshelf), go to bookshelf
      // Otherwise if it's a store item, go to store
      if (userOwnsBook || !bookId.startsWith('store-')) {
        window.location.href = '/bookshelf'
      } else {
        window.location.href = '/store'
      }
    }
  }
  
  const [book, setBook] = useState<BookshelfItem | null>(null)
  const [storeItem, setStoreItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showReader, setShowReader] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [userOwnsBook, setUserOwnsBook] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'ebook' | 'audiobook'>('ebook')

  const isStoreItem = bookId.startsWith('store-')
  const actualId = isStoreItem ? bookId.replace('store-', '') : bookId

  useEffect(() => {
    loadBook()
  }, [bookId])

  const loadBook = async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      if (isStoreItem) {
        // Loading a store item - check if user owns it first
        const storeId = actualId
        
        // Try to load from store
        const storeResponse = await fetch(`${API_URL}/api/v1/store/${storeId}`)
        if (storeResponse.ok) {
          const storeData = await storeResponse.json()
          setStoreItem(storeData)
          
          // Check if user owns this book (check by ISBN or title match)
          if (token) {
            try {
              const bookshelfResponse = await fetch(`${API_URL}/api/v1/bookshelf`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              if (bookshelfResponse.ok) {
                const bookshelfData = await bookshelfResponse.json()
                // Check if user owns a book with matching ISBN or title
                const ownedBook = bookshelfData.items?.find((item: BookshelfItem) => 
                  item.isbn === storeData.isbn || 
                  (item.title === storeData.title && item.author === storeData.author_name)
                )
                if (ownedBook) {
                  setBook(ownedBook)
                  setUserOwnsBook(true)
                }
              }
            } catch (err) {
              console.log('User not logged in or bookshelf check failed')
            }
          }
        }
      } else {
        // Loading a bookshelf item by ID
        if (!token) {
          // User not logged in - redirect to login
          window.location.href = '/login'
          return
        }
        
        const response = await fetch(`${API_URL}/api/v1/bookshelf/${actualId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        
        console.log('[BookDetail] Fetching bookshelf item:', actualId)
        console.log('[BookDetail] Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('[BookDetail] Book loaded:', data)
          setBook(data)
          setUserOwnsBook(true)
          
          // Also check if this book is in the store
          if (data.isbn) {
            try {
              const storeResponse = await fetch(`${API_URL}/api/v1/store?search=${encodeURIComponent(data.isbn)}`)
              if (storeResponse.ok) {
                const storeData = await storeResponse.json()
                const matchingStoreItem = storeData.items?.find((item: StoreItem) => 
                  item.isbn === data.isbn
                )
                if (matchingStoreItem) {
                  setStoreItem(matchingStoreItem)
                }
              }
            } catch (err) {
              console.log('Store check failed')
            }
          }
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

  const deleteBook = async () => {
    if (!book) return
    
    const bookTitle = book.title || 'this book'
    if (!confirm(`Remove "${bookTitle}" from your bookshelf? This cannot be undone.`)) {
      return
    }

    setUpdating(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf/${book.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Book deleted successfully - go back to bookshelf
        toast.success('Book removed from your bookshelf')
        handleBack()
      } else {
        toast.error('Failed to remove book from bookshelf')
      }
    } catch (error) {
      console.error('Failed to delete book:', error)
      toast.error('Failed to remove book from bookshelf')
    } finally {
      setUpdating(false)
    }
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

  const addToBookshelf = async () => {
    if (!storeItem) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_type: 'book',
          isbn: storeItem.isbn,
          title: storeItem.title,
          author: storeItem.author_name,
          cover_url: storeItem.cover_url,
          description: storeItem.description || storeItem.long_description,
          genres: storeItem.genres
          // No status field - user will set it after adding
        })
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.detail || 'Failed to add to bookshelf')
        return
      }

      const newBook = await response.json()
      setBook(newBook)
      setUserOwnsBook(true)
      toast.success('Added to your bookshelf! Set your reading status using the dropdown below.')
    } catch (error) {
      console.error('Error adding to bookshelf:', error)
      toast.error('Failed to add to bookshelf')
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
        toast.error(error.detail || 'Failed to create checkout')
        return
      }

      const data = await response.json()
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    } catch (error) {
      console.error('Error creating checkout:', error)
      toast.error('Failed to start checkout process')
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#37322E' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B34B0C]"></div>
      </div>
    )
  }

  if (!book && !storeItem) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#37322E' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Book not found</h2>
          <button
            onClick={handleBack}
            className="text-[#B34B0C] hover:text-[#8A3809]"
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
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={handleBack}
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
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-64 h-96 rounded-lg shadow-md flex items-center justify-center" style="background: linear-gradient(135deg, #524944, #37322E)">
                          <svg class="w-24 h-24" style="color: #B34B0C" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                          </svg>
                        </div>
                      `
                    }}
                  />
                ) : (
                  <div className="w-64 h-96 rounded-lg shadow-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #524944, #37322E)' }}>
                    <BookOpen className="w-24 h-24" style={{ color: '#B34B0C' }} />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  {/* If user owns the book: Show Read/Favorite/Status controls */}
                  {userOwnsBook && book?.epub_url && (
                    <button
                      onClick={() => setShowReader(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#B34B0C] text-white rounded-lg hover:bg-[#8A3809] transition-colors font-semibold"
                    >
                      <BookOpen className="w-5 h-5" />
                      {book.reading_progress && book.reading_progress > 0 
                        ? `Continue Reading (${Math.round(book.reading_progress)}%)` 
                        : 'Start Reading'
                      }
                    </button>
                  )}

                  {userOwnsBook && book && (
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

                  {/* Delete button - only show if user owns the book */}
                  {userOwnsBook && book && (
                    <button
                      onClick={deleteBook}
                      disabled={updating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200"
                    >
                      <Trash2 className="w-5 h-5" />
                      Remove from Bookshelf
                    </button>
                  )}

                  {/* If user doesn't own the book BUT it's available in store: Show format tabs and Buy Now */}
                  {!userOwnsBook && storeItem && (
                    <>
                      {/* Format Selector Tabs */}
                      {storeItem.available_formats.length > 1 && (
                        <div className="w-full flex gap-2 p-1 bg-gray-100 rounded-lg mb-3">
                          {storeItem.has_ebook && (
                            <button
                              onClick={() => setSelectedFormat('ebook')}
                              className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all ${
                                selectedFormat === 'ebook'
                                  ? 'bg-white text-[#B34B0C] shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Ebook - ${storeItem.final_price.toFixed(2)}
                            </button>
                          )}
                          {storeItem.has_audiobook && (
                            <button
                              onClick={() => setSelectedFormat('audiobook')}
                              className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all ${
                                selectedFormat === 'audiobook'
                                  ? 'bg-white text-[#B34B0C] shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Audiobook - ${storeItem.audiobook_final_price?.toFixed(2) || '0.00'}
                            </button>
                          )}
                        </div>
                      )}
                      
                      <button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#B34B0C] to-pink-600 text-white rounded-lg font-semibold hover:from-[#8A3809] hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {purchasing ? 'Processing...' : `Buy ${selectedFormat === 'audiobook' ? 'Audiobook' : 'Ebook'} - $${
                          selectedFormat === 'audiobook' && storeItem.audiobook_final_price 
                            ? storeItem.audiobook_final_price.toFixed(2)
                            : storeItem.final_price.toFixed(2)
                        }`}
                      </button>
                      
                      <button
                        onClick={addToBookshelf}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#B34B0C] text-[#B34B0C] rounded-lg font-semibold hover:bg-orange-50 transition-colors"
                      >
                        <BookOpen className="w-5 h-5" />
                        Add to Bookshelf
                      </button>
                      
                      {/* Library Checkout - Opens Libby or WorldCat */}
                      {book?.isbn && (
                        <a
                          href={`https://www.overdrive.com/search?q=${encodeURIComponent(book.title || '')}%20${encodeURIComponent(book.author || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                          <BookOpen className="w-5 h-5" />
                          Check Out from Library (Libby)
                        </a>
                      )}
                    </>
                  )}

                  {/* Google Books Link - only for bookshelf items */}
                  {userOwnsBook && book && getGoogleBooksUrl(book.isbn, book.title) && (
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

                  {/* Library Link - for bookshelf items */}
                  {userOwnsBook && book && (
                    <a
                      href={`https://www.overdrive.com/search?q=${encodeURIComponent(book.title || '')}%20${encodeURIComponent(book.author || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      <BookOpen className="w-5 h-5" />
                      Find at Library (Libby)
                    </a>
                  )}

                  {/* Store Link - for bookshelf items, check if book is in store */}
                  {userOwnsBook && book && (
                    <button
                      onClick={() => window.location.href = `/store?search=${encodeURIComponent(book.title || '')}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      View in Store
                    </button>
                  )}
                </div>
              </div>

              {/* Book Details */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{title}</h1>
                
                {author && (
                  <div className="flex items-center gap-2 text-xl text-gray-600 mb-4">
                    <User className="w-5 h-5" />
                    <span>by </span>
                    <a 
                      href={`/store?author=${encodeURIComponent(author)}`}
                      className="text-[#B34B0C] hover:text-[#8A3809] hover:underline font-medium"
                    >
                      {author}
                    </a>
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

                {/* Audiobook Info - Show if store item has audiobook and audiobook format selected */}
                {storeItem?.has_audiobook && selectedFormat === 'audiobook' && (
                  <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
                    <div className="space-y-2">
                      {storeItem.audiobook_narrator && (
                        <div className="flex items-start gap-2">
                          <User className="w-5 h-5 text-[#B34B0C] mt-0.5" />
                          <div>
                            <span className="text-sm font-medium" style={{ color: '#B3B2B0' }}>Narrated by:</span>
                            <p className="text-base font-semibold text-white">{storeItem.audiobook_narrator}</p>
                          </div>
                        </div>
                      )}
                      {storeItem.audiobook_duration_minutes && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-5 h-5 text-[#B34B0C] mt-0.5" />
                          <div>
                            <span className="text-sm font-medium" style={{ color: '#B3B2B0' }}>Duration:</span>
                            <p className="text-base font-semibold text-white">
                              {Math.floor(storeItem.audiobook_duration_minutes / 60)}h {storeItem.audiobook_duration_minutes % 60}m
                            </p>
                          </div>
                        </div>
                      )}
                      {storeItem.audiobook_file_format && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-5 h-5 text-[#B34B0C] mt-0.5" />
                          <div>
                            <span className="text-sm font-medium" style={{ color: '#B3B2B0' }}>Format:</span>
                            <p className="text-base font-semibold text-white uppercase">{storeItem.audiobook_file_format}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status Selector - Only show if user owns the book */}
                {userOwnsBook && book && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2" style={{ color: '#B3B2B0' }}>
                      Reading Status
                    </label>
                    <select
                      value={book.status}
                      onChange={(e) => updateStatus(e.target.value)}
                      disabled={updating}
                      className="w-full max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                      style={{ borderColor: '#6C6A68', backgroundColor: '#524944', color: 'white' }}
                    >
                      <option value="reading">Currently Reading</option>
                      <option value="read">Read</option>
                      <option value="want-to-read">Want to Read</option>
                      <option value="dnf">Did Not Finish</option>
                    </select>
                  </div>
                )}

                {/* Metadata - Only show if user owns the book */}
                {userOwnsBook && book && (
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
                    <>
                      <div className="flex items-center gap-2 text-gray-700">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{book.page_count} pages</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">~{calculateBookReadingTime(book.page_count)} to read</span>
                      </div>
                    </>
                  )}
                  {book.isbn && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Hash className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">ISBN: {book.isbn}</span>
                    </div>
                  )}
                  </div>
                )}

                {/* Store Item: Price and Sales Info - Only show if NOT owned */}
                {!userOwnsBook && storeItem && (
                  <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#524944' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-bold text-[#B34B0C]">
                        ${storeItem.final_price.toFixed(2)}
                      </span>
                      {storeItem.discount_percentage > 0 && (
                        <span className="text-lg line-through" style={{ color: '#B3B2B0' }}>
                          ${storeItem.price_usd.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>{storeItem.total_sales} copies sold</p>
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
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ backgroundColor: '#B34B0C', color: 'white' }}
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

                {/* Notes - Only show if user owns the book */}
                {userOwnsBook && book?.notes && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">My Notes</h3>
                    <p className="text-gray-700 leading-relaxed">{book.notes}</p>
                  </div>
                )}

                {/* Review - Only show if user owns the book */}
                {userOwnsBook && book?.review && (
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
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"><div className="text-white text-lg">Loading reader...</div></div>}>
          <EpubReader
            epubUrl={book.epub_url}
            bookTitle={book.title || 'Book'}
            onClose={() => setShowReader(false)}
            onProgressChange={saveReadingProgress}
            initialLocation={book.last_location}
          />
        </Suspense>
      )}
    </div>
  )
}
