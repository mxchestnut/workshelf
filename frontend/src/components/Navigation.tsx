/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import { 
  BookOpen, 
  FileText, 
  Users, 
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
  UserCircle
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
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo & Menu */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <button 
                onClick={() => navigateTo('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <BookOpen className="w-8 h-8 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">Work Shelf</h1>
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
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span>Feed</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/bookshelf')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/bookshelf') 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BookMarked className="w-5 h-5" />
                    <span>Bookshelf</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/store')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive('/store') 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    <span>Store</span>
                  </button>

                  {/* Notifications */}
                  <button 
                    className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  </button>

                  {/* Profile Button */}
                  <button 
                    onClick={() => navigateTo('/me')}
                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <UserCircle className="w-8 h-8 text-gray-700" />
                  </button>
                </>
              ) : (
                <button 
                  onClick={onLogin}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
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
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Work Shelf</h2>
              </div>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-900">{user.display_name || user.username}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-6">
            <div className="space-y-1">
              {/* Main Navigation */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Main
                </p>
                
                <button 
                  onClick={() => navigateTo('/feed')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/feed')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Feed</span>
                </button>

                <button 
                  onClick={() => navigateTo('/documents')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/documents')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>Documents</span>
                </button>

                <button 
                  onClick={() => navigateTo('/me')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/me')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Profile</span>
                </button>
              </div>

              {/* Reading & Discovery */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Reading
                </p>
                
                <button 
                  onClick={() => navigateTo('/bookshelf')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/bookshelf')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BookMarked className="w-5 h-5" />
                  <span>My Bookshelf</span>
                </button>

                <button 
                  onClick={() => navigateTo('/free-books')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/free-books')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Free Books</span>
                </button>

                <button 
                  onClick={() => navigateTo('/authors')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/authors')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <PenTool className="w-5 h-5" />
                  <span>Authors</span>
                </button>
              </div>

              {/* Store & Publishing */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Publishing
                </p>
                
                <button 
                  onClick={() => navigateTo('/store')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/store')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Store</span>
                </button>

                <button 
                  onClick={() => navigateTo('/upload-book')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/upload-book')
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload Book</span>
                </button>
              </div>

              {/* Admin Section */}
              {user && (user.is_staff || (user.groups && user.groups.length > 0)) && (
                <div className="pt-6 border-t border-gray-200">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Administration
                  </p>

                  {user.is_staff && (
                    <button 
                      onClick={() => navigateTo('/admin/moderation')}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive('/admin/moderation')
                          ? 'bg-purple-100 text-purple-700 font-medium'
                          : 'text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Moderation</span>
                    </button>
                  )}

                  {user.groups?.filter(g => g.is_owner).map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigateTo(`/group/${group.slug}/admin`)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-purple-50 transition-colors"
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
          <div className="p-6 border-t border-gray-200 space-y-2">
            <button 
              onClick={() => navigateTo('/settings')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>

            {user && (
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
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
