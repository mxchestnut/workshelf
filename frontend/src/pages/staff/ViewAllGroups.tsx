/**
 * View All Groups - Staff only page for viewing and managing all groups
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { authService, User } from '../../services/auth'
import { Users, ArrowLeft } from 'lucide-react'

export function ViewAllGroups() {
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
            <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <div>
              <h1 className="text-3xl font-bold text-white">All Groups</h1>
              <p style={{ color: '#B3B2B0' }}>Browse and manage all community groups</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="p-12 text-center rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
          <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#B34B0C' }} />
          <h3 className="text-xl font-bold text-white mb-2">Groups Management</h3>
          <p style={{ color: '#B3B2B0' }} className="mb-6">
            View all groups, their members, and manage group settings platform-wide.
          </p>
          <p className="text-sm" style={{ color: '#6C6A68' }}>Coming soon</p>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
