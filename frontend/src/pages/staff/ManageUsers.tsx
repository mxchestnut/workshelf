/**
 * Manage Users - Staff only page for managing all user accounts
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { useAuth } from "../../contexts/AuthContext"
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
  const { user, login, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserAccount[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'staff'>('all')

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAccess = async () => {
    try {
      if (!user || !user.is_staff) {
        window.location.href = '/'
        return
      }
      await loadUsers()
    } catch (error) {
      console.error('Access check failed:', error)
      window.location.href = '/'
    }
  }

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'
      
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
      
      {/* Header */}
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
              <h1 className="text-3xl font-bold text-foreground">Manage Users</h1>
              <p className="text-muted-foreground">View and manage all user accounts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or username..."
              className="w-full pl-10 pr-4 py-3 rounded-lg text-foreground placeholder-muted-foreground border border-input bg-card focus:outline-none focus:border-primary"
            />
          </div>
          
          <div className="flex gap-2 rounded-lg p-1 bg-card">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'inactive' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setFilterStatus('staff')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterStatus === 'staff' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-lg border bg-card border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Last Login</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto mb-3 text-muted" />
                      <p className="text-muted-foreground">No users found</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{u.username}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-muted-foreground">{u.email}</p>
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
                          <span className="text-muted-foreground">User</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-muted-foreground">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-background rounded transition-colors">
                          <MoreVertical className="w-5 h-5 text-muted-foreground" />
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
          <div className="p-6 rounded-lg bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">{users.filter(u => u.is_active).length}</p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">{users.filter(u => u.is_staff).length}</p>
            <p className="text-sm text-muted-foreground">Staff Members</p>
          </div>
          <div className="p-6 rounded-lg bg-card border border-border">
            <p className="text-2xl font-bold text-foreground">
              {users.filter(u => u.last_login && new Date(u.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Last 7 Days</p>
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
