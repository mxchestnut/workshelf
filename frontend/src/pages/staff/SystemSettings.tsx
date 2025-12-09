/**
 * System Settings - Staff only page for platform configuration
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { authService, User } from '../../services/auth'
import { Settings, ArrowLeft, TrendingUp, Tag } from 'lucide-react'

export function SystemSettings() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      if (!currentUser || !currentUser.is_staff) {
        window.location.href = '/'
        return
      }
      setUser(currentUser)
      setLoading(false)
    } catch (error) {
      console.error('Access check failed:', error)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => window.location.href = '/staff'}
            className="flex items-center gap-2 mb-4 text-white hover:text-[#B34B0C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Staff Panel
          </button>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <div>
              <h1 className="text-3xl font-bold text-white">System Settings</h1>
              <p style={{ color: '#B3B2B0' }}>Configure platform-wide settings and analytics</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Store Analytics */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-8 h-8" style={{ color: '#B34B0C' }} />
              <h3 className="text-xl font-bold text-white">Store Analytics</h3>
            </div>
            <p style={{ color: '#B3B2B0' }} className="mb-4">
              View sales data, popular books, revenue trends, and marketplace performance.
            </p>
            <button 
              onClick={() => window.location.href = '/staff/store'}
              className="px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-medium hover:bg-[#8A3809] transition-colors"
            >
              View Analytics
            </button>
          </div>

          {/* Interest Tags */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-4">
              <Tag className="w-8 h-8" style={{ color: '#B34B0C' }} />
              <h3 className="text-xl font-bold text-white">Interest Tags</h3>
            </div>
            <p style={{ color: '#B3B2B0' }} className="mb-4">
              Manage interest tags, view usage statistics, and see trending searches.
            </p>
            <button className="px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-medium hover:bg-[#8A3809] transition-colors">
              Manage Tags
            </button>
          </div>

          {/* Additional Settings Placeholders */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8" style={{ color: '#B34B0C' }} />
              <h3 className="text-xl font-bold text-white">Platform Configuration</h3>
            </div>
            <p style={{ color: '#B3B2B0' }} className="mb-4">
              Configure site-wide settings, feature flags, and system parameters.
            </p>
            <p className="text-sm" style={{ color: '#6C6A68' }}>Coming soon</p>
          </div>

          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-8 h-8" style={{ color: '#B34B0C' }} />
              <h3 className="text-xl font-bold text-white">Email & Notifications</h3>
            </div>
            <p style={{ color: '#B3B2B0' }} className="mb-4">
              Manage email templates, notification settings, and communication preferences.
            </p>
            <p className="text-sm" style={{ color: '#6C6A68' }}>Coming soon</p>
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
