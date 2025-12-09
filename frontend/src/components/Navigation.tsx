/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import {
  Home,
  BookMarked,
  PenTool,
  Users,
  Menu,
  X,
  LogIn,
  LogOut,
  BookOpen,
  MessageCircle,
  Search,
  Store,
  FileText,
  UserCircle,
  Settings,
  Shield,
  Trash2,
  Globe,
  Tag,
  Briefcase,
  Library,
  Download,
  Archive
} from 'lucide-react'
import { useState } from 'react'
import { User } from '../services/auth'
import NotificationBell from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { SkipLink } from './SkipLink'

interface NavigationProps {
  user: User | null
  onLogin: () => void
  onLogout: () => void
  currentPage?: string
}

export function Navigation({ user, onLogin, onLogout, currentPage }: NavigationProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default to open

  const navigateTo = (path: string) => {
    // Use pushState to navigate without full page reload
    window.history.pushState({}, '', path)
    // Trigger popstate event so App.tsx picks up the route change
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const isActive = (path: string) => {
    return window.location.pathname === path || currentPage === path
  }

  return (
    <>
      {/* Skip Link for Keyboard Navigation - WCAG 2.1 */}
      <SkipLink />
      
      {/* Hamburger Toggle Button - Fixed Position */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-card border border-border hover:bg-accent transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-expanded={sidebarOpen}
        aria-controls="main-navigation"
      >
        {sidebarOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
      </button>

      {/* Persistent Sidebar Navigation - Opens by default, can be collapsed */}
      <nav 
        id="main-navigation"
        className={`fixed top-0 left-0 h-full bg-card border-r border-border shadow-lg z-40 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'
        }`}
        aria-label="Main navigation"
        aria-hidden={!sidebarOpen}
      >
        <div className="flex flex-col h-full w-80">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7" />
                <h2 className="text-xl font-bold font-mono">Work Shelf</h2>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-accent rounded-lg"
                aria-label="Collapse sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="bg-muted p-3 rounded-lg mb-3">
                <p className="font-medium">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
            
            {/* Quick Actions in Header */}
            {user && (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <ThemeToggle />
              </div>
            )}
            
            {!user && (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button 
                  onClick={onLogin}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-4">
            {user ? (
              <div className="space-y-1">
                {/* Main Pages */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main</h3>
                  <button 
                    onClick={() => navigateTo('/')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span>Home</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/feed')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/feed') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span>Feed</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/discover')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/discover') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                    <span>Discover</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/store')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/store') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                    <span>Store</span>
                  </button>
                </div>

                {/* Library */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Library</h3>
                  <button 
                    onClick={() => navigateTo('/bookshelf')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/bookshelf') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <BookMarked className="w-5 h-5" />
                    <span>Bookshelf</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/documents')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/documents') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span>Documents</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/free-books')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/free-books') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Library className="w-5 h-5" />
                    <span>Free Books</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/trash')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/trash') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Trash</span>
                  </button>
                </div>

                {/* Creation */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create</h3>
                  <button 
                    onClick={() => navigateTo('/studio')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/studio') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <PenTool className="w-5 h-5" />
                    <span>Studio</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/ai-assistance')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/ai-assistance') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span>AI Assistance</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/export-center')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/export-center') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Download className="w-5 h-5" />
                    <span>Export Center</span>
                  </button>
                </div>

                {/* Social */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social</h3>
                  <button 
                    onClick={() => navigateTo('/groups')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/groups') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span>Groups</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/messages')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/messages') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Messages</span>
                  </button>
                </div>

                {/* Beta Features */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Beta</h3>
                  <button 
                    onClick={() => navigateTo('/beta-request')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/beta-request') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span>Beta Request</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/beta-feed')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/beta-feed') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                    <span>Beta Feed</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/beta-marketplace')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/beta-marketplace') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                    <span>Beta Marketplace</span>
                  </button>
                </div>

                {/* Account */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
                  <button 
                    onClick={() => navigateTo('/profile')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/profile') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <UserCircle className="w-5 h-5" />
                    <span>Profile</span>
                  </button>
                  <button 
                    onClick={() => navigateTo('/dashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/dashboard') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Dashboard</span>
                  </button>
                </div>

                {/* Staff Only */}
                {user.is_staff && (
                  <div className="mb-4">
                    <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</h3>
                    <button 
                      onClick={() => navigateTo('/staff')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive('/staff') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Staff Panel</span>
                    </button>
                    <button 
                      onClick={() => navigateTo('/admin')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive('/admin') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Admin Dashboard</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please log in to access navigation
                </p>
                <button 
                  onClick={onLogin}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Log In</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border">
            {user && (
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-foreground hover:bg-accent"
              >
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
