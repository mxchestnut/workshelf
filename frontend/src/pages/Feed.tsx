/**
 * Personal Feed Page
 * User's personalized feed after login
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { BookOpen, FileText, Users, TrendingUp } from 'lucide-react'

export function Feed() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser()
        if (!currentUser) {
          // Not logged in, redirect to home
          window.location.href = '/'
          return
        }
        setUser(currentUser)
      } catch (error) {
        console.error('Failed to load user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-neutral">Loading your feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-lightest">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-8 mb-8">
          <h1 className="text-3xl font-bold text-neutral-darkest mb-2">
            Welcome back, {user?.display_name || user?.username}! 👋
          </h1>
          <p className="text-neutral">
            Here's what's happening in your workspace
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-neutral-darkest">Your Documents</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-darkest">0</p>
            <p className="text-sm text-neutral mt-1">No documents yet</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-neutral-darkest">Groups</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-darkest">
              {user?.groups?.length || 0}
            </p>
            <p className="text-sm text-neutral mt-1">
              {user?.groups?.length === 0 ? 'Join a group' : 'Active groups'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-neutral-darkest">Activity</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-darkest">0</p>
            <p className="text-sm text-neutral mt-1">Recent interactions</p>
          </div>
        </div>

        {/* Feed Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-light p-12 text-center">
          <BookOpen className="w-16 h-16 text-neutral-light mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-darkest mb-2">Your feed is empty</h2>
          <p className="text-neutral mb-6">
            Start creating documents, join groups, or interact with the community to see activity here.
          </p>
          <button className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors">
            Explore Groups
          </button>
        </div>

        {/* User Info (for debugging) */}
        {user?.is_staff && (
          <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-indigo-800">
              <strong>Staff Account:</strong> You have platform administration access
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
