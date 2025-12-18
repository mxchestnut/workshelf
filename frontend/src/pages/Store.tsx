import { useState, useEffect } from 'react'
import { BookOpen, Star, Filter, Search, X, TrendingUp, Sparkles, Library, ExternalLink } from 'lucide-react'
import { useAuth } from "../contexts/AuthContext"
import { Navigation } from '../components/Navigation'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface LibraryAvailability {
  openLibrary: boolean
  openLibraryUrl?: string
  openLibraryBorrowUrl?: string
}

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
  libraryAvailability?: LibraryAvailability
}

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

export default function Store() {
  const [books, setBooks] = useState<StoreBook[]>([])
  const [freeBooks, setFreeBooks] = useState<FreeBook[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('')
  const [sortBy, setSortBy] = useState('published_at')
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const { user, login, logout, getAccessToken } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'paid'>('all')

  // Load user
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

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
    fetchFreeBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      
      // Check library availability for each book
      const booksWithLibrary = await Promise.all(
        data.map(async (book: StoreBook) => {
          const availability = await checkLibraryAvailability(book.isbn, book.title, book.author_name)
          return { ...book, libraryAvailability: availability }
        })
      )
      
      setBooks(booksWithLibrary)
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check Open Library availability
  const checkLibraryAvailability = async (isbn: string | undefined, _title: string, _author: string): Promise<LibraryAvailability> => {
    if (!isbn) {
      return { openLibrary: false }
    }

    try {
      // Check Open Library API
      const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
      const data = await response.json()
      const bookData = data[`ISBN:${isbn}`]
      
      if (bookData) {
        // Check if borrowing is available
        const borrowUrl = `https://openlibrary.org/borrow/ia/${isbn}`
        
        return {
          openLibrary: true,
          openLibraryUrl: bookData.url || `https://openlibrary.org/isbn/${isbn}`,
          openLibraryBorrowUrl: borrowUrl
        }
      }
      
      return { openLibrary: false }
    } catch (error) {
      console.error('Error checking library availability:', error)
      return { openLibrary: false }
    }
  }

  const fetchFreeBooks = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/free-books/popular?limit=20`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })

      if (response.ok) {
        const data = await response.json()
        setFreeBooks(data.results || [])
      }
    } catch (error) {
      console.error('Failed to load free books:', error)
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
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="store" />
      
      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        {/* Header */}
        <div className="bg-primary text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4">eBooks</h1>
          <p className="text-xl text-primary-foreground/80">Discover free classics and purchase quality ebooks. Read instantly in our beautiful EPUB reader.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            All Books
          </button>
          <button
            onClick={() => setActiveTab('free')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'free' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Free Classics ({freeBooks.length})
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'paid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Premium Books ({books.length})
          </button>
        </div>
        {/* Search and Filters */}
        <div className="rounded-xl shadow-lg p-6 mb-8 bg-card border border-border">
          <div className="flex gap-4 flex-wrap items-center">
            {/* Search */}
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books or authors..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg bg-background border border-border text-foreground"
            >
              <option value="published_at">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {(searchQuery || selectedGenre || priceRange.min || priceRange.max) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground"
                >
                  <option value="">All Genres</option>
                  {allGenres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Min Price</label>
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  placeholder="$0"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Max Price</label>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  placeholder="$100"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground"
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
        {(activeTab === 'all' || activeTab === 'paid') && featuredBooks.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Featured Books</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredBooks.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} featured />
              ))}
            </div>
          </section>
        )}

        {/* Bestsellers */}
        {(activeTab === 'all' || activeTab === 'paid') && bestsellers.length > 0 && !searchQuery && !selectedGenre && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Bestsellers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestsellers.slice(0, 4).map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* Free Classics */}
        {(activeTab === 'all' || activeTab === 'free') && freeBooks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Free Classics from Project Gutenberg</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {freeBooks.slice(0, activeTab === 'free' ? freeBooks.length : 8).map(book => (
                <FreeBookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        )}

        {/* All Books / Search Results */}
        {(activeTab === 'all' || activeTab === 'paid') && (
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              {searchQuery ? `Search Results for "${searchQuery}"` : activeTab === 'paid' ? 'Premium Books' : 'All Premium Books'}
            </h2>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground">No books found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {books.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </section>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
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

  const handleBorrowClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (book.libraryAvailability?.openLibraryBorrowUrl) {
      window.open(book.libraryAvailability.openLibraryBorrowUrl, '_blank')
    }
  }

  const handleLocalLibraryClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Search Libby for this book
    const libbyUrl = `https://libbyapp.com/search/instant-digital/search?query=${encodeURIComponent(book.title)}`
    window.open(libbyUrl, '_blank')
  }

  return (
    <div 
      onClick={handleCardClick}
      className={`rounded-lg overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 border group ${
        featured ? 'border-2 border-primary' : 'border border-border'
      } bg-card`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] bg-muted">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {book.libraryAvailability?.openLibrary && (
            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Library className="w-3 h-3" />
              Borrow
            </span>
          )}
          {book.is_featured && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
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
            <span className="bg-primary/80 text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              -{book.discount_percentage}%
            </span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2 text-left">
          {book.title}
        </h3>
        <p className="text-xs mb-2 text-left text-muted-foreground">
          {book.author_name}
        </p>
        
        {/* Genres */}
        {book.genres && book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.genres.slice(0, 2).map(genre => (
              <span key={genre} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        {book.rating_average && book.rating_count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-foreground">{book.rating_average.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({book.rating_count})</span>
          </div>
        )}

        {/* Library & Purchase Options */}
        <div className="space-y-2 mt-3">
          {/* Open Library Borrow Button */}
          {book.libraryAvailability?.openLibrary && (
            <button
              onClick={handleBorrowClick}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white"
            >
              <Library className="w-3 h-3" />
              Borrow from Open Library
            </button>
          )}

          {/* Check Local Library Button */}
          <button
            onClick={handleLocalLibraryClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Check Local Library
          </button>

          {/* Price - now styled as purchase button */}
          <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-primary">
            {book.discount_percentage > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary-foreground">${book.final_price.toFixed(2)}</span>
                <span className="text-xs line-through text-primary-foreground/60">${book.price_usd.toFixed(2)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-primary-foreground">
                {book.price_usd === 0 ? 'Free' : `Buy for $${book.price_usd.toFixed(2)}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FreeBookCardProps {
  book: FreeBook
}

function FreeBookCard({ book }: FreeBookCardProps) {
  const handleAddToShelf = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/free-books/add-to-shelf/${book.id}?status=want-to-read`,
        {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      )

      if (response.ok) {
        alert(`"${book.title}" added to your bookshelf!`)
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to add book')
      }
    } catch (error) {
      console.error('Failed to add book:', error)
      alert('Failed to add book to shelf')
    }
  }

  return (
    <div 
      className="rounded-lg overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 border border-border bg-card group"
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] bg-muted">
        {book.cover_url ? (
          <img 
            src={book.cover_url} 
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Free Badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            FREE
          </span>
        </div>

        {/* Add Button Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handleAddToShelf}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Add to Shelf
          </button>
        </div>
      </div>

      {/* Book Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-2 text-left">
          {book.title}
        </h3>
        <p className="text-xs mb-2 text-left text-muted-foreground">
          {book.author}
        </p>
        
        {/* Genres */}
        {book.genres && book.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {book.genres.slice(0, 2).map((genre, idx) => (
              <span key={idx} className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {genre.length > 15 ? genre.substring(0, 15) + '...' : genre}
              </span>
            ))}
          </div>
        )}

        {/* Source */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{book.source}</span>
          {book.epub_url && (
            <span className="font-medium text-primary">EPUB</span>
          )}
        </div>
      </div>
    </div>
  )
}
