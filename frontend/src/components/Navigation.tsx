/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import { 
  BookOpen, 
  FileText, 
  Bell,
  Settings,
  Menu,
  X,
  Shield,
  Crown,
  LogIn,
  LogOut,
  Home,
  BookMarked,
  PenTool,
  ShoppingBag,
  Upload,
  UserCircle,
  Search
} from 'lucide-react'
import { useState } from 'react'
import { User } from '../services/auth'

interface NavigationProps {
  user: User | null
  onLogin: () => void
  onLogout: () => void
  currentPage?: string
}

export function Navigation({ user, onLogin, onLogout, currentPage }: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigateTo = (path: string) => {
    window.location.href = path
    setMenuOpen(false)
  }

  const isActive = (path: string) => {
    return window.location.pathname === path || currentPage === path
  }

  return (
    <>
      {/* Top Header */}
      <header className="border-b sticky top-0 z-50 shadow-sm" style={{ 
        backgroundColor: '#524944',
        borderColor: '#6C6A68'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg transition-colors text-white hover:bg-opacity-20"
                style={{ backgroundColor: menuOpen ? 'rgba(179, 75, 12, 0.2)' : 'transparent' }}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => navigateTo('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
                <h1 className="text-2xl font-bold text-white">Work Shelf</h1>
              </button>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Quick Links */}
                  <button 
                    onClick={() => navigateTo('/feed')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/feed') 
                        ? 'text-white font-medium' 
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/feed') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <Home className="w-5 h-5" />
                    <span>Feed</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/bookshelf')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/bookshelf') 
                        ? 'text-white font-medium' 
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/bookshelf') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <BookMarked className="w-5 h-5" />
                    <span>Bookshelf</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/store')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/store') 
                        ? 'text-white font-medium' 
                        : 'text-white hover:bg-opacity-20'
                    }`}
                    style={isActive('/store') ? { backgroundColor: '#B34B0C' } : {}}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Ebooks</span>
                  </button>

                  {/* Notifications */}
                  <button 
                    className="relative p-2 rounded-lg transition-colors text-white hover:bg-opacity-20"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#B34B0C' }}></span>
                  </button>

                  {/* Profile Button */}
                  <button 
                    onClick={() => navigateTo('/me')}
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-opacity-20 text-white"
                  >
                    <UserCircle className="w-8 h-8" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={onLogin}
                  className="px-6 py-2 rounded-lg flex items-center gap-2 transition-colors text-white hover:opacity-90"
                  style={{ backgroundColor: '#B34B0C' }}
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
        className={`fixed top-0 left-0 h-full w-80 shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#37322E' }}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b" style={{ borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7" style={{ color: '#B34B0C' }} />
                <h2 className="text-xl font-bold text-white">Work Shelf</h2>
              </div>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-opacity-20"
                style={{ backgroundColor: 'rgba(179, 75, 12, 0.1)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="rounded-lg p-3" style={{ backgroundColor: '#524944' }}>
                <p className="font-medium text-white">{user.display_name || user.username}</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>{user.email}</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-6">
            <div className="space-y-1">
              {/* Main Navigation */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Main
                </p>
                
                <button 
                  onClick={() => navigateTo('/feed')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/feed')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/feed') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <Home className="w-5 h-5" />
                  <span>Feed</span>
                </button>

                <button 
                  onClick={() => navigateTo('/discover')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/discover')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/discover') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <Search className="w-5 h-5" />
                  <span>Discover</span>
                </button>

                <button 
                  onClick={() => navigateTo('/documents')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/documents')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/documents') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <FileText className="w-5 h-5" />
                  <span>Studio</span>
                </button>

                <button 
                  onClick={() => navigateTo('/me')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/me')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/me') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Profile</span>
                </button>
              </div>

              {/* Reading & Discovery */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Reading
                </p>
                
                <button 
                  onClick={() => navigateTo('/bookshelf')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/bookshelf')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/bookshelf') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <BookMarked className="w-5 h-5" />
                  <span>My Bookshelf</span>
                </button>

                <button 
                  onClick={() => navigateTo('/beta-feed')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/beta-feed')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/beta-feed') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Beta Feed</span>
                </button>

                <button 
                  onClick={() => navigateTo('/free-books')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/free-books')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/free-books') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Free Books</span>
                </button>

                <button 
                  onClick={() => navigateTo('/authors')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/authors')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/authors') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <PenTool className="w-5 h-5" />
                  <span>Authors</span>
                </button>
              </div>

              {/* Store & Publishing */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Publishing
                </p>
                
                <button 
                  onClick={() => navigateTo('/store')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/store')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/store') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Ebooks</span>
                </button>

                <button 
                  onClick={() => navigateTo('/upload-book')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/upload-book')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/upload-book') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Book</span>
                </button>
              </div>

              {/* Beta Services */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                  Beta Services
                </p>
                
                <button 
                  onClick={() => navigateTo('/beta-marketplace')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/beta-marketplace')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/beta-marketplace') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Beta Marketplace</span>
                </button>

                <button 
                  onClick={() => navigateTo('/my-beta-profile')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/my-beta-profile')
                      ? 'font-medium text-white'
                      : 'text-white hover:bg-opacity-20'
                  }`}
                  style={isActive('/my-beta-profile') ? { backgroundColor: '#B34B0C' } : {}}
                >
                  <Settings className="w-5 h-5" />
                  <span>My Beta Profile</span>
                </button>
              </div>

              {/* Admin Section */}
              {user && (user.is_staff || (user.groups && user.groups.length > 0)) && (
                <div className="pt-6 border-t" style={{ borderColor: '#6C6A68' }}>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B3B2B0' }}>
                    Administration
                  </p>

                  {user.is_staff && (
                    <>
                      <button 
                        onClick={() => navigateTo('/staff')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                          isActive('/staff')
                            ? 'font-medium text-white'
                            : 'text-white hover:bg-opacity-20'
                        }`}
                        style={isActive('/staff') ? { backgroundColor: '#7C3306' } : {}}
                      >
                        <Shield className="w-5 h-5" />
                        <span>Staff Dashboard</span>
                      </button>
                      
                      <button 
                        onClick={() => navigateTo('/admin/moderation')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                          isActive('/admin/moderation')
                            ? 'font-medium text-white'
                            : 'text-white hover:bg-opacity-20'
                        }`}
                        style={isActive('/admin/moderation') ? { backgroundColor: '#7C3306' } : {}}
                      >
                        <Shield className="w-5 h-5" />
                        <span>Moderation</span>
                      </button>
                    </>
                  )}

                  {user.groups?.filter(g => g.is_owner).map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigateTo(`/group/${group.slug}/admin`)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-white hover:bg-opacity-20"
                    >
                      <Crown className="w-5 h-5" />
                      <span>{group.name} Admin</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="p-6 border-t space-y-2" style={{ borderColor: '#6C6A68' }}>
            <button 
              onClick={() => navigateTo('/settings')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-white hover:bg-opacity-20"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>

            {user && (
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors hover:opacity-80"
                style={{ color: '#B34B0C' }}
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
