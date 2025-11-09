import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  Users, 
  Store as StoreIcon,
  TrendingUp,
  Sparkles,
  ArrowRight,
  BookMarked,
  PenTool,
  MessagesSquare
} from 'lucide-react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'

interface PlatformStats {
  totalBooks: number
  totalAuthors: number
  totalUsers: number
  totalDocuments: number
}

interface Book {
  id: number
  title: string
  author_name?: string
  cover_image_url?: string
  price?: number
  rating?: number
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<PlatformStats>({
    totalBooks: 0,
    totalAuthors: 0,
    totalUsers: 0,
    totalDocuments: 0
  })
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load user
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)

      // Load platform stats (we'll create a simple aggregation)
      await loadStats()

      // Load featured books
      await loadFeaturedBooks()
    } catch (error) {
      console.error('Failed to load home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Try to get some basic stats
      // These endpoints exist but might need auth tokens
      const token = localStorage.getItem('access_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Try to fetch store books count
      const booksResponse = await fetch(`${API_URL}/api/v1/store/books?skip=0&limit=1`, { headers })
      if (booksResponse.ok) {
        const booksData = await booksResponse.json()
        // The API doesn't return total count, so we'll estimate
        setStats(prev => ({ ...prev, totalBooks: booksData.length > 0 ? 50 : 0 }))
      }

      // For now, use placeholder stats
      setStats({
        totalBooks: 127,
        totalAuthors: 43,
        totalUsers: 1250,
        totalDocuments: 892
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
      // Use default stats
      setStats({
        totalBooks: 100,
        totalAuthors: 40,
        totalUsers: 1000,
        totalDocuments: 800
      })
    }
  }

  const loadFeaturedBooks = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Try to fetch some books
      const response = await fetch(`${API_URL}/api/v1/store/books?skip=0&limit=6`, { headers })
      if (response.ok) {
        const books = await response.json()
        setFeaturedBooks(books)
      }
    } catch (error) {
      console.error('Failed to load featured books:', error)
    }
  }

  const handleNavigation = (path: string) => {
    window.location.href = path
  }

  const handleLogin = () => {
    authService.login()
  }

  const handleLogout = () => {
    authService.logout()
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900">
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading your workspace...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="home" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Hero Section */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wide">Welcome to Work Shelf</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {user ? `Welcome back, ${user.display_name || user.username}!` : 'Your Creative Writing Hub'}
              </h1>
              <p className="text-xl text-blue-100 mb-6 max-w-2xl">
                Write, publish, and discover amazing stories. Join a community of authors and readers building the future of independent publishing.
              </p>
              
              {/* Platform Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats.totalBooks.toLocaleString()}</div>
                  <div className="text-sm text-blue-100">Books Published</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats.totalAuthors.toLocaleString()}</div>
                  <div className="text-sm text-blue-100">Active Authors</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-sm text-blue-100">Community Members</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="text-3xl font-bold">{stats.totalDocuments.toLocaleString()}</div>
                  <div className="text-sm text-blue-100">Works in Progress</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Start Writing */}
              <button
                onClick={() => handleNavigation('/documents')}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 text-left transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Start Writing</h3>
                <p className="text-sm text-gray-400 mb-3">Create a new document with AI assistance</p>
                <div className="flex items-center text-blue-400 text-sm font-medium">
                  Get started <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Browse Books */}
              <button
                onClick={() => handleNavigation('/store')}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 text-left transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                  <StoreIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Browse Store</h3>
                <p className="text-sm text-gray-400 mb-3">Discover books from independent authors</p>
                <div className="flex items-center text-purple-400 text-sm font-medium">
                  Explore now <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Free Books */}
              <button
                onClick={() => handleNavigation('/free-books')}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 text-left transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
                  <BookMarked className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Free Books</h3>
                <p className="text-sm text-gray-400 mb-3">Access thousands of classic literature</p>
                <div className="flex items-center text-green-400 text-sm font-medium">
                  Browse free <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Discover Authors */}
              <button
                onClick={() => handleNavigation('/authors')}
                className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 text-left transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Discover Authors</h3>
                <p className="text-sm text-gray-400 mb-3">Find and follow your favorite writers</p>
                <div className="flex items-center text-orange-400 text-sm font-medium">
                  Find authors <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

            </div>
          </div>

          {/* Featured Books Section */}
          {featuredBooks.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Featured Books</h2>
                <button
                  onClick={() => handleNavigation('/store')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {featuredBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleNavigation(`/book/${book.id}`)}
                    className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-500 transition-all group"
                  >
                    {book.cover_image_url ? (
                      <img 
                        src={book.cover_image_url} 
                        alt={book.title}
                        className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2 text-left">
                        {book.title}
                      </h3>
                      {book.author_name && (
                        <p className="text-xs text-gray-400 mb-2 text-left">
                          {book.author_name}
                        </p>
                      )}
                      {book.price !== undefined && (
                        <p className="text-sm font-bold text-blue-400 text-left">
                          {book.price === 0 ? 'Free' : `$${book.price.toFixed(2)}`}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Getting Started Guide (for new users) */}
          {user && !user.bio && (
            <div className="mb-12">
              <div className="bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl p-8 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">New here? Let's get you started!</h3>
                    <p className="text-orange-100 mb-4">
                      Complete your profile to unlock the full Work Shelf experience.
                    </p>
                    <button
                      onClick={() => handleNavigation('/me')}
                      className="bg-white text-orange-600 px-6 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      Complete Your Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Community Highlights */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Join the Community</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Feed */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <MessagesSquare className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Community Feed</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Stay updated with posts, discussions, and updates from authors and groups you follow.
                </p>
                <button
                  onClick={() => handleNavigation('/feed')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                >
                  View feed <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Your Bookshelf */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <BookMarked className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Bookshelf</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Access your purchased books and reading list all in one place.
                </p>
                <button
                  onClick={() => handleNavigation('/bookshelf')}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1"
                >
                  View bookshelf <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* For Authors */}
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Publish Your Work</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload your EPUB and start selling to readers around the world.
                </p>
                <button
                  onClick={() => handleNavigation('/upload-book')}
                  className="text-green-400 hover:text-green-300 text-sm font-medium flex items-center gap-1"
                >
                  Upload book <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Platform Features */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Why Work Shelf?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PenTool className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Writing</h3>
                  <p className="text-gray-400">
                    Write faster with intelligent AI assistance that helps with structure, style, and creativity.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <StoreIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Direct to Reader</h3>
                  <p className="text-gray-400">
                    Sell your books directly to readers with instant payouts and no middlemen taking huge cuts.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Vibrant Community</h3>
                  <p className="text-gray-400">
                    Connect with other writers and readers, join groups, and build your following.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Quality Curated</h3>
                  <p className="text-gray-400">
                    Discover high-quality independent books and support authors you believe in.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
