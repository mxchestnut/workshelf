import { useState, useEffect } from 'react'
import { BookOpen, Star, Filter, Search, X, TrendingUp, Sparkles } from 'lucide-react'

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

  // Check for author query parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authorParam = urlParams.get('author')
    if (authorParam) {
      setSearchQuery(authorParam)
    }
  }, [])

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
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      {/* Header */}
      <div className="text-white py-16" style={{ 
        background: 'linear-gradient(135deg, #B34B0C 0%, #7C3306 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">WorkShelf Store</h1>
          <p className="text-xl" style={{ color: '#B3B2B0' }}>Discover and purchase quality ebooks. Read instantly in our beautiful EPUB reader.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="rounded-xl shadow-lg p-6 mb-8" style={{ 
          backgroundColor: '#524944',
          borderColor: '#6C6A68',
          borderWidth: '1px'
        }}>
          <div className="flex gap-4 flex-wrap items-center">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-3 w-5 h-5" style={{ color: '#B3B2B0' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books or authors..."
                className="w-full pl-10 pr-4 py-2 rounded-lg text-white placeholder-gray-400"
                style={{ 
                  backgroundColor: '#37322E',
                  borderColor: '#6C6A68',
                  borderWidth: '1px'
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg text-white"
              style={{ 
                backgroundColor: '#37322E',
                borderColor: '#6C6A68',
                borderWidth: '1px'
              }}
            >
              <option value="published_at" style={{ backgroundColor: '#37322E' }}>Newest</option>
              <option value="popular" style={{ backgroundColor: '#37322E' }}>Most Popular</option>
              <option value="price_asc" style={{ backgroundColor: '#37322E' }}>Price: Low to High</option>
              <option value="price_desc" style={{ backgroundColor: '#37322E' }}>Price: High to Low</option>
            </select>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-white hover:opacity-80"
              style={{ 
                backgroundColor: '#6C6A68'
              }}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {(searchQuery || selectedGenre || priceRange.min || priceRange.max) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{ 
                  color: '#B34B0C',
                  backgroundColor: 'rgba(179, 75, 12, 0.1)'
                }}
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ 
              borderTopColor: '#6C6A68',
              borderTopWidth: '1px'
            }}>
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-white"
                  style={{ 
                    backgroundColor: '#37322E',
                    borderColor: '#6C6A68',
                    borderWidth: '1px'
                  }}
                >
                  <option value="" style={{ backgroundColor: '#37322E' }}>All Genres</option>
                  {allGenres.map(genre => (
                    <option key={genre} value={genre} style={{ backgroundColor: '#37322E' }}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium mb-2 text-white">Min Price</label>
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  placeholder="$0"
                  className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-400"
                  style={{ 
                    backgroundColor: '#37322E',
                    borderColor: '#6C6A68',
                    borderWidth: '1px'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">Max Price</label>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  placeholder="$100"
                  className="w-full px-3 py-2 rounded-lg text-white placeholder-gray-400"
                  style={{ 
                    backgroundColor: '#37322E',
                    borderColor: '#6C6A68',
                    borderWidth: '1px'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Featured Books */}
        {featuredBooks.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6" style={{ color: '#B34B0C' }} />
              <h2 className="text-3xl font-bold text-white">Featured Books</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredBooks.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} featured />
              ))}
            </div>
          </section>
        )}

        {/* Bestsellers */}
        {bestsellers.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6" style={{ color: '#B34B0C' }} />
              <h2 className="text-3xl font-bold text-white">Bestsellers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* All Books / Search Results */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'All Books'}
          </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12" style={{ 
                borderBottomColor: '#B34B0C',
                borderBottomWidth: '2px',
                borderTopColor: 'transparent',
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent'
              }}></div>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
              <p className="text-xl" style={{ color: '#B3B2B0' }}>No books found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {books.map(book => (
                <BookCard key={book.id} book={book} />
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
  featured?: boolean
}

function BookCard({ book, featured }: BookCardProps) {
  const handleCardClick = () => {
    // Navigate to book detail page with store item ID
    window.location.href = `/book/store-${book.id}`
  }

  return (
    <div 
      onClick={handleCardClick}
      className={`rounded-lg overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 border group`}
      style={{ 
        backgroundColor: '#524944',
        borderColor: featured ? '#B34B0C' : '#6C6A68',
        borderWidth: featured ? '2px' : '1px'
      }}
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3]" style={{ 
        background: 'linear-gradient(135deg, #6C6A68 0%, #524944 100%)'
      }}>
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12" style={{ color: '#B3B2B0' }} />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {book.is_featured && (
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#B34B0C' }}>
              Featured
            </span>
          )}
          {book.is_bestseller && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Best
            </span>
          )}
          {book.is_new_release && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              New
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {book.discount_percentage > 0 && (
          <div className="absolute top-2 left-2">
            <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7C3306' }}>
              -{book.discount_percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2 text-left">
          {book.title}
        </h3>
        <p className="text-xs mb-2 text-left" style={{ color: '#B3B2B0' }}>
          {book.author_name}
        </p>
        
        {/* Genres */}
        {book.genres && book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.genres.slice(0, 2).map(genre => (
              <span key={genre} className="text-xs px-1.5 py-0.5 rounded" style={{ 
                backgroundColor: 'rgba(179, 75, 12, 0.2)',
                color: '#B34B0C'
              }}>
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        {book.rating_average && book.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-white">{book.rating_average.toFixed(1)}</span>
            <span className="text-xs" style={{ color: '#B3B2B0' }}>({book.rating_count})</span>
          </div>
        )}

        {/* Price */}
        <div>
          {book.discount_percentage > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#B34B0C' }}>${book.final_price.toFixed(2)}</span>
              <span className="text-xs line-through" style={{ color: '#6C6A68' }}>${book.price_usd.toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold" style={{ color: '#B34B0C' }}>
              {book.price_usd === 0 ? 'Free' : `$${book.price_usd.toFixed(2)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
