import { useState, useEffect } from 'react'
import { 
  BookOpen, 
  FileText, 
  Users, 
  FolderOpen, 
  Bell, 
  Settings,
  Search,
  Plus,
  Menu,
  X,
  Shield,
  Crown,
  LogIn,
  LogOut
} from 'lucide-react'
import './App.css'
import { Documents } from './pages/Documents'
import { Projects } from './pages/Projects'
import { Community } from './pages/Community'
import { Feed } from './pages/Feed'
import { Profile } from './pages/Profile'
import { AuthCallback } from './pages/AuthCallback'
import Onboarding from './pages/Onboarding'
import TermsOfService from './pages/TermsOfService'
import HouseRules from './pages/HouseRules'
import { authService, User } from './services/auth'

interface HealthStatus {
  status: string
  version: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [activeTab, setActiveTab] = useState('documents')
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [currentPage, setCurrentPage] = useState<'home' | 'feed' | 'profile' | 'auth-callback' | 'onboarding' | 'terms' | 'rules'>('home')

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => {})

    // Check authentication and route
    const path = window.location.pathname
    if (path === '/auth/callback') {
      setCurrentPage('auth-callback')
    } else if (path === '/onboarding') {
      setCurrentPage('onboarding')
    } else if (path === '/legal/terms') {
      setCurrentPage('terms')
    } else if (path === '/legal/rules') {
      setCurrentPage('rules')
    } else if (path === '/feed') {
      setCurrentPage('feed')
      loadUser()
    } else if (path === '/me') {
      setCurrentPage('profile')
      loadUser()
    } else {
      setCurrentPage('home')
      loadUser()
    }
  }, [API_URL])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const handleLogin = () => {
    authService.login()
  }

  const handleLogout = () => {
    authService.logout()
  }

  const renderContent = () => {
    // Handle special pages
    if (currentPage === 'auth-callback') {
      return <AuthCallback />
    }
    
    if (currentPage === 'onboarding') {
      return <Onboarding />
    }
    
    if (currentPage === 'terms') {
      return <TermsOfService />
    }
    
    if (currentPage === 'rules') {
      return <HouseRules />
    }
    
    if (currentPage === 'feed') {
      return <Feed />
    }
    
    if (currentPage === 'profile') {
      return <Profile />
    }

    // Home page tabs
    switch (activeTab) {
      case 'documents':
        return <Documents />
      case 'projects':
        return <Projects />
      case 'community':
        return <Community />
      default:
        return <Documents />
    }
  }

  // Don't render header/menu for auth callback, onboarding, or legal pages
  if (currentPage === 'auth-callback' || currentPage === 'onboarding' || currentPage === 'terms' || currentPage === 'rules') {
    return renderContent()
  }

  // Don't render header/menu for feed and profile pages (they have their own layouts)
  if (currentPage === 'feed' || currentPage === 'profile') {
    return <div className="min-h-screen bg-gray-900">
      {currentPage === 'feed' ? <Feed /> : <Profile />}
    </div>
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-light bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="flex items-center gap-2">
                <BookOpen className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-neutral-darkest">Work Shelf</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="pl-10 pr-4 py-2 border border-neutral-light rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {user && (
                <>
                  <button className="relative p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
                  </button>
                  
                  <button className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg hidden md:block">
                    <Settings className="w-5 h-5" />
                  </button>
                  
                  <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:inline">New Document</span>
                  </button>
                </>
              )}

              {!user && (
                <button 
                  onClick={handleLogin}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Log In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary" />
              <h2 className="text-xl font-bold text-neutral-darkest">Work Shelf</h2>
            </div>
            <button 
              onClick={() => setMenuOpen(false)}
              className="p-2 text-neutral-dark hover:bg-neutral-light/50 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => { setActiveTab('documents'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'documents' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Documents</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('projects'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'projects' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="font-medium">Projects</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('community'); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'community' 
                  ? 'bg-primary text-white' 
                  : 'text-neutral-dark hover:bg-neutral-light/50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Community</span>
            </button>

            {/* Admin Links - Role Based */}
            {user && (user.is_staff || (user.groups && user.groups.length > 0)) && (
              <div className="pt-6 mt-6 border-t border-neutral-light">
                <p className="px-4 text-xs font-semibold text-neutral uppercase mb-2">
                  Administration
                </p>

                {/* Staff Dashboard - Only for Kit */}
                {user.is_staff && (
                  <a
                    href="/staff"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-dark hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Staff Dashboard</span>
                  </a>
                )}

                {/* Group Admin - For group owners */}
                {user.groups?.filter(g => g.is_owner).map(group => (
                  <a
                    key={group.id}
                    href={`/group/${group.slug}/admin`}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-dark hover:bg-purple-50 hover:text-purple-700 transition-colors"
                  >
                    <Crown className="w-5 h-5" />
                    <span className="font-medium">{group.name} Admin</span>
                  </a>
                ))}
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-neutral-light">
              {user && (
                <div className="px-4 py-3 mb-2">
                  <p className="text-sm font-medium text-neutral-darkest">{user.display_name || user.username}</p>
                  <p className="text-xs text-neutral">{user.email}</p>
                </div>
              )}

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-neutral-dark hover:bg-neutral-light/50 transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>

              {user && (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Log Out</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      </aside>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}

        {health && (
          <div className="mt-8 text-center">
            <p className="text-xs text-neutral">
              Connected to {health.service} v{health.version} • Status: {health.status}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
