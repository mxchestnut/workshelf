/**
 * Main Navigation Component
 * Provides consistent navigation across all pages with proper linking
 */
import {
  Home,
  PenTool,
  Users,
  Menu,
  X,
  LogIn,
  LogOut,
  BookOpen,
  MessageCircle,
  UserCircle,
  Settings,
  Shield,
  UserRoundPen,
  Library,
  Search
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { User } from "../contexts/AuthContext"
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
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || currentPage === path
  }

  return (
    <>
      {/* Skip Link for Keyboard Navigation - WCAG 2.1 */}
      <SkipLink />

      {/* Persistent Sidebar Navigation - Opens by default, can be collapsed */}
      <nav 
        id="main-navigation"
        className={`fixed top-0 left-0 h-full bg-card border-r border-border shadow-lg z-40 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80 translate-x-0' : 'w-16 translate-x-0'
        }`}
        aria-label="Main navigation"
        aria-hidden={false}
      >
        <div className={`flex flex-col h-full ${sidebarOpen ? 'w-80' : 'w-16'}`}>
          {/* Sidebar Header */}
          <div className={`p-6 border-b border-border ${!sidebarOpen && 'p-3'}`}>
            <div className="flex items-center justify-between mb-4">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-7 h-7" />
                  <h2 className="text-xl font-bold font-mono">Workshelf</h2>
                </div>
              )}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-accent rounded-lg"
                aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {sidebarOpen && (
              <>
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
              </>
            )}
          </div>

          {/* Navigation Links */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4">
            {user ? (
              <div className="space-y-1">
                {/* Main Pages */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main</h3>
                  <Link 
                    to="/"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span>Home</span>
                  </Link>
                  <Link 
                    to="/vault"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/vault') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Library className="w-5 h-5" />
                    <span>Library</span>
                  </Link>
                  <Link 
                    to="/advanced-search"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/advanced-search') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </Link>
                </div>

                {/* Creation */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Create</h3>
                  <Link 
                    to="/studio"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/studio') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <PenTool className="w-5 h-5" />
                    <span>Studio</span>
                  </Link>
                </div>

                {/* Social */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social</h3>
                  <Link 
                    to="/groups"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/groups') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    <span>Groups</span>
                  </Link>
                  <Link 
                    to="/messages"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/messages') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Messages</span>
                  </Link>
                </div>

                {/* Account */}
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
                  <Link 
                    to="/profile"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/profile') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <UserCircle className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <Link 
                    to="/dashboard"
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive('/dashboard') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                </div>

                {/* Staff Only */}
                {user.is_staff && (
                  <div className="mb-4">
                    <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staff</h3>
                    <Link 
                      to="/staff"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive('/staff') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Staff Panel</span>
                    </Link>
                    <Link 
                      to="/admin"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive('/admin') ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Admin Dashboard</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">
                  Please log in to access navigation
                </p>
              </div>
            )}
          </div>
          )}

          {/* Footer Actions */}
          {sidebarOpen && (
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
          )}
        </div>
      </nav>
    </>
  )
}
