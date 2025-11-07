import { useState, useEffect } from 'react'
import { ShoppingCart, BookOpen, Star, Filter, Search, X, TrendingUp, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface StoreBook {
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

export default function Store() {
  const [books, setBooks] = useState<StoreBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [sortBy, setSortBy] = useState('published_at')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })

  useEffect(() => {
    fetchBooks()
  }, [searchQuery, selectedGenre, sortBy, priceRange])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('search', searchQuery)
      if (selectedGenre) params.append('genre', selectedGenre)
      if (sortBy) params.append('sort_by', sortBy)
      if (priceRange.min) params.append('min_price', priceRange.min)
      if (priceRange.max) params.append('max_price', priceRange.max)

      const response = await fetch(`${API_URL}/api/v1/store/browse?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch books')
      
      const data = await response.json()
      setBooks(data)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (book: StoreBook) => {
    try {
      const token = localStorage.getItem('token')
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
          store_item_id: book.id,
          success_url: `${window.location.origin}/store/success`,
          cancel_url: `${window.location.origin}/store`
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
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedGenre('')
    setSortBy('published_at')
    setPriceRange({ min: '', max: '' })
  }

  const featuredBooks = books.filter(b => b.is_featured)
  const bestsellers = books.filter(b => b.is_bestseller)
  const allGenres = Array.from(new Set(books.flatMap(b => b.genres || [])))

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">WorkShelf Store</h1>
          <p className="text-xl text-purple-100">Discover and purchase quality ebooks. Read instantly in our beautiful EPUB reader.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4 flex-wrap items-center">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books or authors..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="published_at">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {(searchQuery || selectedGenre || priceRange.min || priceRange.max) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Genres</option>
                  {allGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  placeholder="$0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  placeholder="$100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Featured Books */}
        {featuredBooks.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h2 className="text-3xl font-bold text-gray-800">Featured Books</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredBooks.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} onPurchase={handlePurchase} featured />
              ))}
            </div>
          </section>
        )}

        {/* Bestsellers */}
        {bestsellers.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <h2 className="text-3xl font-bold text-gray-800">Bestsellers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} onPurchase={handlePurchase} />
              ))}
            </div>
          </section>
        )}

        {/* All Books / Search Results */}
        <section>
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Books'}
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-500">No books found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {books.map(book => (
                <BookCard key={book.id} book={book} onPurchase={handlePurchase} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

interface BookCardProps {
  book: StoreBook
  onPurchase: (book: StoreBook) => void
  featured?: boolean
}

function BookCard({ book, onPurchase, featured }: BookCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col ${
      featured ? 'ring-2 ring-yellow-400' : ''
    }`}>
      {/* Cover Image */}
      <div className="relative h-64 bg-gradient-to-br from-purple-100 to-pink-100">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-purple-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          {book.is_featured && (
            <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              Featured
            </span>
          )}
          {book.is_bestseller && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              Bestseller
            </span>
          )}
          {book.is_new_release && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {book.discount_percentage > 0 && (
          <div className="absolute top-2 left-2">
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              -{book.discount_percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">{book.title}</h3>
        <p className="text-sm text-gray-600 mb-2">by {book.author_name}</p>
        
        {book.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{book.description}</p>
        )}

        {/* Genres */}
        {book.genres && book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {book.genres.slice(0, 2).map(genre => (
              <span key={genre} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        {book.rating_average && book.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold">{book.rating_average.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({book.rating_count})</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Price and Buy Button */}
        <div className="mt-auto">
          <div className="mb-3">
            {book.discount_percentage > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-purple-600">${book.final_price.toFixed(2)}</span>
                <span className="text-sm text-gray-400 line-through">${book.price_usd.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-purple-600">${book.price_usd.toFixed(2)}</span>
            )}
            <p className="text-xs text-gray-500 mt-1">{book.total_sales} sold</p>
          </div>

          <button
            onClick={() => onPurchase(book)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <ShoppingCart className="w-5 h-5" />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  )
}
