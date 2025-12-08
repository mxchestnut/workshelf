/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import {
  Home,
  BookMarked,
  PenTool,
  ShoppingBag,
  UserCircle,
  Users,
  BarChart,
  Settings,
  Shield,
  Download,
  Search as SearchIcon,
  Eye,
  Menu,
  X,
  LogIn,
  LogOut,
  BookOpen,
  Trash2
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
      {/* Skip Link for Keyboard Navigation - WCAG 2.1 */}
      <SkipLink />
      
      {/* Top Header */}
      <header className="border-b border-border sticky top-0 z-50 shadow-sm bg-card" role="banner">
        <div className="py-4">
          <div className="flex items-center justify-between px-6">
            {/* Left: Logo & Menu */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 hover:bg-accent transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
                aria-controls="main-navigation"
              >
                {menuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
              
              <button 
                onClick={() => navigateTo('/')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <BookOpen className="w-8 h-8" />
                <h1 className="text-2xl font-bold font-mono">Work Shelf</h1>
              </button>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Quick Links */}
                  <button 
                    onClick={() => navigateTo('/feed')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive('/feed') 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span>Feed</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/bookshelf')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive('/bookshelf') 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <BookMarked className="w-5 h-5" />
                    <span>Bookshelf</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/studio')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive('/studio') 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <PenTool className="w-5 h-5" />
                    <span>Studio</span>
                  </button>

                  <button 
                    onClick={() => navigateTo('/groups')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive('/groups') 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span>Groups</span>
                  </button>

                  {/* Notifications */}
                  {user && <NotificationBell />}

                  {/* Theme Toggle */}
                  <ThemeToggle />
                </>
              ) : (
                <>
                  {/* Theme Toggle */}
                  <ThemeToggle />
                  
                  <button 
                    onClick={onLogin}
                    className="px-6 py-2 flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Log In</span>
                  </button>
                </>
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
        aria-hidden="true"
      />
      
      <nav 
        id="main-navigation"
        className={`fixed top-0 left-0 h-full w-80 bg-card border-r border-border shadow-2xl z-50 transform transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        aria-hidden={!menuOpen}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-7 h-7" />
                <h2 className="text-xl font-bold font-mono">Work Shelf</h2>
              </div>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className="bg-muted p-3">
                <p className="font-medium">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-6">
            <div className="space-y-1">
              {/* Library Section */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                  Library
                </p>
                
                <button 
                  onClick={() => navigateTo('/store')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/store')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Store</span>
                </button>
                
                <button 
                  onClick={() => navigateTo('/tags')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/tags')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  <span>Discover Tags</span>
                </button>
              </div>

              {/* My Studio */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                  My Studio
                </p>
                
                <button 
                  onClick={() => navigateTo('/ai-assistance')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/ai-assistance')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <PenTool className="w-5 h-5" />
                  <span>Writing Prompts</span>
                </button>
                
                <button 
                  onClick={() => navigateTo('/beta-marketplace')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/beta-marketplace')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Marketplace</span>
                </button>
              </div>

              {/* Account */}
              <div className="mb-6">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                  Account
                </p>
                
                <button 
                  onClick={() => navigateTo('/me')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/me')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>Profile & Settings</span>
                </button>

                {/* Dashboard - Personal analytics */}
                <button 
                  onClick={() => navigateTo('/dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <BarChart className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>

                {/* Export Center - Data exports and Matrix integration */}
                <button 
                  onClick={() => navigateTo('/export-center')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/export-center')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  <span>Export Center</span>
                </button>

                {/* Trash - Deleted items with 30-day retention */}
                <button 
                  onClick={() => navigateTo('/trash')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/trash')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Trash</span>
                </button>

                {/* Advanced Search */}
                <button 
                  onClick={() => navigateTo('/advanced-search')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/advanced-search')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <SearchIcon className="w-5 h-5" />
                  <span>Advanced Search</span>
                </button>

                {/* Accessibility Settings - WCAG compliance and preferences */}
                <button 
                  onClick={() => navigateTo('/accessibility')}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                    isActive('/accessibility')
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span>Accessibility</span>
                </button>

                {/* Staff - Platform administration */}
                {user?.is_staff && (
                  <button 
                    onClick={() => navigateTo('/staff')}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive('/staff')
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <Shield className="w-5 h-5" />
                    <span>Staff Panel</span>
                  </button>
                )}
              </div>

              {/* My Groups Section */}
              {user?.groups && user.groups.length > 0 && (
                <div className="mb-6">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider mb-2 text-muted-foreground">
                    My Groups
                  </p>
                  
                  {user.groups.map(group => (
                    <button 
                      key={group.id}
                      onClick={() => navigateTo(`/groups/${group.slug}`)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg transition-colors ${
                        window.location.pathname.includes(`/groups/${group.slug}`)
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span className="truncate">{group.name}</span>
                      </div>
                      {group.is_owner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigateTo(`/group-settings?id=${group.id}`)
                          }}
                          className="p-1 hover:bg-accent rounded transition-colors"
                          title="Group Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border space-y-2">
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
