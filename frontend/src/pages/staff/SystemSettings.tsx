/**
 * System Settings - Staff only page for platform configuration
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { useAuth } from "../../contexts/AuthContext"
import { Settings, ArrowLeft, TrendingUp, Tag } from 'lucide-react'

export function SystemSettings() {
  const { user, login, logout } = useAuth()
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

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
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
              <p className="text-muted-foreground">Configure platform-wide settings and analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Analytics */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Store Analytics</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              View sales data, popular books, revenue trends, and marketplace performance.
            </p>
            <button 
              onClick={() => window.location.href = '/staff/store'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              View Analytics
            </button>
          </div>

          {/* Interest Tags */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <Tag className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Interest Tags</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Manage interest tags, view usage statistics, and see trending searches.
            </p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Manage Tags
            </button>
          </div>

          {/* Additional Settings Placeholders */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Platform Configuration</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Configure site-wide settings, feature flags, and system parameters.
            </p>
            <p className="text-sm text-muted">Coming soon</p>
          </div>

          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Email & Notifications</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Manage email templates, notification settings, and communication preferences.
            </p>
            <p className="text-sm text-muted">Coming soon</p>
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
