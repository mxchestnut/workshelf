/**
 * View All Groups - Staff only page for viewing and managing all groups
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { useAuth } from "../../contexts/AuthContext"
import { Users, ArrowLeft } from 'lucide-react'

export function ViewAllGroups() {
  const { user, login, logout } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      if (!user || !user.is_staff) {
        window.location.href = '/'
        return
      }
      setLoading(false)
    } catch (error) {
      console.error('Access check failed:', error)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => window.location.href = '/staff'}
            className="flex items-center gap-2 mb-4 text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Staff Panel
          </button>
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Groups</h1>
              <p className="text-muted-foreground">Browse and manage all community groups</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="p-12 text-center rounded-lg border bg-card border-border">
          <Users className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h3 className="text-xl font-bold text-foreground mb-2">Groups Management</h3>
          <p className="text-muted-foreground mb-6">
            View all groups, their members, and manage group settings platform-wide.
          </p>
          <p className="text-sm text-muted">Coming soon</p>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
