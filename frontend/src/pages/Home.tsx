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

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

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
      const booksResponse = await fetch(`${API_URL}/v1/store/browse?skip=0&limit=1`, { headers })
      if (booksResponse.ok) {
        const booksData = await booksResponse.json()
        // The API doesn't return total count, so we'll estimate
        setStats(prev => ({ ...prev, totalBooks: booksData.length > 0 ? 50 : 0 }))
      }

      // For now, use placeholder stats
      setStats({
  totalBooks: 0,
  totalAuthors: 0,
  totalUsers: 0,
  totalDocuments: 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
      // Use default stats
      setStats({
  totalBooks: 0,
  totalAuthors: 0,
  totalUsers: 0,
  totalDocuments: 0
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
      const response = await fetch(`${API_URL}/v1/store/browse?skip=0&limit=6`, { headers })
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
      <div className="min-h-screen bg-gray-900">
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading your workspace...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="home" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Hero Section */}
          <div className="mb-12">
            <div className="bg-card border border-border p-8 md:p-12">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wide">Welcome to Work Shelf</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
                {user ? `Welcome back, ${user.display_name || user.username}!` : 'Your Creative Community'}
              </h1>
              <p className="text-xl mb-6 max-w-2xl text-muted-foreground">\nConnect with fellow writers, join groups, share your work, and build meaningful relationships in a vibrant creative community.
              </p>
              
              {/* Platform Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-muted">
                  <div className="text-3xl font-bold">{stats.totalBooks.toLocaleString()}</div>
                  <div className="text-muted-foreground">Books Published</div>
                </div>
                <div className="bg-muted">
                  <div className="text-3xl font-bold">{stats.totalAuthors.toLocaleString()}</div>
                  <div className="text-muted-foreground">Active Authors</div>
                </div>
                <div className="bg-muted">
                  <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-muted-foreground">Community Members</div>
                </div>
                <div className="bg-muted">
                  <div className="text-3xl font-bold">{stats.totalDocuments.toLocaleString()}</div>
                  <div className="text-muted-foreground">Works in Progress</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Get Started</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Join Groups */}
              <button
                onClick={() => handleNavigation('/groups')}
                className="rounded-xl p-6 text-left transition-all hover:scale-105 group bg-card border border-border"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Join Groups</h3>
                <p className="text-muted-foreground">Find your writing tribe and collaborate</p>
                <div className="text-primary">
                  Explore groups <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Start Chatting */}
              <button
                onClick={() => handleNavigation('/feed')}
                className="rounded-xl p-6 text-left transition-all hover:scale-105 group bg-card border border-border"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessagesSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Join Conversations</h3>
                <p className="text-muted-foreground">Connect with writers through chat and feed</p>
                <div className="text-primary">
                  Start chatting <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Start Writing */}
              <button
                onClick={() => handleNavigation('/documents')}
                className="rounded-xl p-6 text-left transition-all hover:scale-105 group bg-card border border-border"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start Writing</h3>
                <p className="text-muted-foreground">Create and share your stories</p>
                <div className="text-primary">
                  Get started <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

              {/* Browse Store */}
              <button
                onClick={() => handleNavigation('/store')}
                className="rounded-xl p-6 text-left transition-all hover:scale-105 group bg-card border border-border"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <StoreIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Browse Store</h3>
                <p className="text-muted-foreground">Discover books from our community</p>
                <div className="text-primary">
                  Explore now <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>

            </div>
          </div>

          {/* Featured Books Section */}
          {featuredBooks.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold font-mono">Featured Books</h2>
                <button
                  onClick={() => handleNavigation('/store')}
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity text-primary"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {featuredBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => handleNavigation(`/book/${book.id}`)}
                    className="rounded-lg overflow-hidden transition-all group border"
                    className="bg-card border border-border"
                  >
                    {book.cover_image_url ? (
                      <img 
                        src={book.cover_image_url} 
                        alt={book.title}
                        className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] flex items-center justify-center bg-muted">
                        <BookOpen className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold mb-1 line-clamp-2 text-left">
                        {book.title}
                      </h3>
                      {book.author_name && (
                        <p className="text-xs mb-2 text-left text-muted-foreground">
                          {book.author_name}
                        </p>
                      )}
                      {book.price !== undefined && (
                        <p className="text-sm font-bold text-left text-primary">
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
              <div className="bg-card border border-border p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 bg-muted">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2 font-mono">New here? Let's get you started!</h3>
                    <p className="mb-4 text-muted-foreground">
                      Complete your profile to unlock the full Work Shelf experience.
                    </p>
                    <button
                      onClick={() => handleNavigation('/me')}
                      className="px-6 py-2 font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
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
            <h2 className="text-2xl font-bold mb-6">Join the Community</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Feed */}
              <div className="bg-card border border-border p-6">
                <div className="w-12 h-12 flex items-center justify-center mb-4">
                  <MessagesSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Community Feed</h3>
                <p className="text-muted-foreground">
                  Stay updated with posts, discussions, and updates from authors and groups you follow.
                </p>
                <button
                  onClick={() => handleNavigation('/feed')}
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity text-primary"
                >
                  View feed <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Your Bookshelf */}
              <div className="bg-card border border-border p-6">
                <div className="w-12 h-12 flex items-center justify-center mb-4">
                  <BookMarked className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Your Bookshelf</h3>
                <p className="text-muted-foreground">
                  Access your purchased books and reading list all in one place.
                </p>
                <button
                  onClick={() => handleNavigation('/bookshelf')}
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity text-primary"
                >
                  View bookshelf <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* For Authors */}
              <div className="bg-card border border-border p-6">
                <div className="w-12 h-12 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Publish Your Work</h3>
                <p className="text-muted-foreground">
                  Upload your EPUB and start selling to readers around the world.
                </p>
                <button
                  onClick={() => handleNavigation('/upload-book')}
                  className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity text-primary"
                >
                  Upload book <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* Platform Features */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Why Work Shelf?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                  <Users className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Community-Driven</h3>
                  <p className="text-muted-foreground">
                    Connect with fellow writers, get feedback, and grow together in a supportive community.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(124, 51, 6, 0.2)' }}>
                  <StoreIcon className="w-6 h-6" style={{ color: '#7C3306' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Direct to Reader</h3>
                  <p className="text-muted-foreground">
                    Sell your books directly to readers with instant payouts and no middlemen taking huge cuts.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                  <Users className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vibrant Community</h3>
                  <p className="text-muted-foreground">
                    Connect with other writers and readers, join groups, and build your following.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(124, 51, 6, 0.2)' }}>
                  <BookMarked className="w-6 h-6" style={{ color: '#7C3306' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Quality Curated</h3>
                  <p className="text-muted-foreground">
                    Discover high-quality independent books and support authors you believe in.
                  </p>
                </div>
              </div>

            </div>
          </div>

      </main>
    </div>
  )
}