/**
 * Manage Users - Staff only page for managing all user accounts
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { authService, User } from '../../services/auth'
import { 
  Users, Search, MoreVertical, 
  Shield, CheckCircle, XCircle, ArrowLeft
} from 'lucide-react'

interface UserAccount {
  id: number
  email: string
  username: string
  is_staff: boolean
  is_active: boolean
  created_at: string
  last_login?: string
}

export function ManageUsers() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserAccount[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'staff'>('all')

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
      await loadUsers()
    } catch (error) {
      console.error('Access check failed:', error)
      window.location.href = '/'
    }
  }

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'
      
      const response = await fetch(`${API_URL}/api/v1/admin/users?limit=500`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`)
      }
      
      const data = await response.json()
      setUsers(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load users:', error)
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && u.is_active) ||
                         (filterStatus === 'inactive' && !u.is_active) ||
                         (filterStatus === 'staff' && u.is_staff)
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
      
      {/* Header */}
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
              <h1 className="text-3xl font-bold text-white">Manage Users</h1>
              <p style={{ color: '#B3B2B0' }}>View and manage all user accounts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#B3B2B0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or username..."
              className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-400 border focus:outline-none focus:border-[#B34B0C]"
              style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}
            />
          </div>
          
          <div className="flex gap-2 rounded-lg p-1" style={{ backgroundColor: '#524944' }}>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'all' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ backgroundColor: filterStatus === 'all' ? '#B34B0C' : 'transparent' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'active' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ backgroundColor: filterStatus === 'active' ? '#B34B0C' : 'transparent' }}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'inactive' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ backgroundColor: filterStatus === 'inactive' ? '#B34B0C' : 'transparent' }}
            >
              Inactive
            </button>
            <button
              onClick={() => setFilterStatus('staff')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'staff' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
              }`}
              style={{ backgroundColor: filterStatus === 'staff' ? '#B34B0C' : 'transparent' }}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b" style={{ borderColor: '#6C6A68' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">Last Login</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
                      <p style={{ color: '#B3B2B0' }}>No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-opacity-50" style={{ borderColor: '#6C6A68' }}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-white">{u.username}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p style={{ color: '#B3B2B0' }}>{u.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                        }`}>
                          {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {u.is_staff ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400">
                            <Shield className="w-3 h-3" />
                            Staff
                          </span>
                        ) : (
                          <span style={{ color: '#B3B2B0' }}>User</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p style={{ color: '#B3B2B0' }}>{new Date(u.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p style={{ color: '#B3B2B0' }}>
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-[#37322E] rounded transition-colors">
                          <MoreVertical className="w-5 h-5" style={{ color: '#B3B2B0' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Users</p>
          </div>
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <p className="text-2xl font-bold text-white">{users.filter(u => u.is_active).length}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Active Users</p>
          </div>
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <p className="text-2xl font-bold text-white">{users.filter(u => u.is_staff).length}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Staff Members</p>
          </div>
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <p className="text-2xl font-bold text-white">
              {users.filter(u => u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Active Last 7 Days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
