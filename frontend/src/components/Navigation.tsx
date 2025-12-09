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
  MessageCircle
} from 'lucide-react'
import { useState } from 'react'
import { User } from '../services/auth'
import NotificationBell from './NotificationBell'
import { ThemeToggle } from './ThemeToggle'
import { SkipLink } from './SkipLink'
import NavigationMenu from './NavigationMenu'

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
      
      {/* Top Header */}
      <header className="border-b border-border sticky top-0 z-50 shadow-sm bg-card" role="banner">
        <div className="py-4">
          <div className="flex items-center justify-between px-6">
            {/* Left: Logo & Hamburger Toggle */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-accent transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={sidebarOpen}
                aria-controls="main-navigation"
              >
                {sidebarOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
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

                  <button 
                    onClick={() => navigateTo('/messages')}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 transition-colors ${
                      isActive('/messages') 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Messages</span>
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
                <h2 className="text-xl font-bold font-mono">Navigation</h2>
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
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{user.display_name || user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto">
            {user ? (
              <NavigationMenu />
            ) : (
              <div className="p-6">
                <p className="text-muted-foreground text-center">
                  Please log in to access navigation
                </p>
              </div>
            )}
          </div>

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
