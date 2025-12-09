/**
 * Staff Panel - Platform Administration
 * Clean greyscale interface for staff members
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import PageVersion from '../components/PageVersion'
import { authService } from '../services/auth'
import { 
  Users, 
  Shield,
  Mail,
  Send,
  X,
  CheckCircle,
  Clock,
  XCircle,
  UserCheck,
  BookOpen,
  Flag,
  Settings,
  ShoppingBag,
  Wand2,
  AlertCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Invitation {
  id: number
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
  accepted_at?: string
}

interface PendingUser {
  id: number
  email: string
  username: string | null
  display_name: string | null
  created_at: string
}

export function StaffPanel() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingUsersLoading, setPendingUsersLoading] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)
  const [siteStats, setSiteStats] = useState<any>(null)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [editUsername, setEditUsername] = useState('')

  useEffect(() => {
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      
      if (!currentUser) {
        setTimeout(() => authService.login(), 100)
        return
      }

      if (!currentUser.is_staff) {
        window.location.href = '/'
        return
      }

      setUser(currentUser)
      loadInitialData()
    } catch (err) {
      console.error('[StaffPanel] Error loading user:', err)
      setTimeout(() => authService.login(), 100)
    }
  }

  const loadInitialData = async () => {
    setLoading(false)
    loadInvitations()
    loadPendingUsers()
    loadSiteStats()
    loadAllUsers()
  }

  const loadInvitations = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('[StaffPanel] Error loading invitations:', error)
    }
  }

  const loadPendingUsers = async () => {
    setPendingUsersLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data)
      }
    } catch (error) {
      console.error('[StaffPanel] Error loading pending users:', error)
    } finally {
      setPendingUsersLoading(false)
    }
  }

  const loadAllUsers = async () => {
    setAllUsersLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error('[StaffPanel] Error loading all users:', error)
    } finally {
      setAllUsersLoading(false)
    }
  }

  const loadSiteStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSiteStats(data)
      }
    } catch (error) {
      console.error('[StaffPanel] Error loading site stats:', error)
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || inviteLoading) return

    setInviteLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail })
      })

      if (response.ok) {
        setInviteMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` })
        setInviteEmail('')
        loadInvitations()
        setTimeout(() => setInviteMessage(null), 3000)
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to send invitation' })
      }
    } catch (error) {
      console.error('[StaffPanel] Error sending invitation:', error)
      setInviteMessage({ type: 'error', text: 'Failed to send invitation' })
    } finally {
      setInviteLoading(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setInviteMessage({ type: 'success', text: 'Invite link copied to clipboard!' })
    setTimeout(() => setInviteMessage(null), 2000)
  }

  const revokeInvitation = async (invitationId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/invitations/${invitationId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setInviteMessage({ type: 'success', text: 'Invitation revoked' })
        loadInvitations()
        setTimeout(() => setInviteMessage(null), 2000)
      }
    } catch (error) {
      console.error('[StaffPanel] Error revoking invitation:', error)
    }
  }

  const approveUser = async (userId: number, approve: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: approve })
      })

      if (response.ok) {
        setInviteMessage({ 
          type: 'success', 
          text: approve ? 'User approved successfully' : 'User rejected' 
        })
        loadPendingUsers()
        loadAllUsers()
        setTimeout(() => setInviteMessage(null), 2000)
      }
    } catch (error) {
      console.error('[StaffPanel] Error approving user:', error)
    }
  }

  const startEditingUsername = (userId: number, currentUsername: string) => {
    setEditingUserId(userId)
    setEditUsername(currentUsername || '')
  }

  const cancelEditingUsername = () => {
    setEditingUserId(null)
    setEditUsername('')
  }

  const saveUsername = async (userId: number) => {
    if (!editUsername.trim()) {
      setInviteMessage({ type: 'error', text: 'Username cannot be empty' })
      setTimeout(() => setInviteMessage(null), 2000)
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: editUsername.trim() })
      })

      if (response.ok) {
        setInviteMessage({ type: 'success', text: 'Username updated successfully' })
        setEditingUserId(null)
        setEditUsername('')
        loadAllUsers()
        loadPendingUsers()
        setTimeout(() => setInviteMessage(null), 2000)
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to update username' })
        setTimeout(() => setInviteMessage(null), 3000)
      }
    } catch (error) {
      console.error('[StaffPanel] Error updating username:', error)
      setInviteMessage({ type: 'error', text: 'Failed to update username' })
      setTimeout(() => setInviteMessage(null), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="staff" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading staff panel...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="staff" />
      
      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        {/* Header */}
        <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-3xl font-bold text-white">Staff Administration</h1>
          </div>
          <p style={{ color: '#B3B2B0' }}>Platform management and user administration</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Site-Wide Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{siteStats?.total_users || allUsers.length || '...'}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Users</p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{siteStats?.total_documents || '...'}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Documents</p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{siteStats?.total_groups || '...'}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Groups</p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{allUsers.filter((u: any) => u.is_staff).length || '...'}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Active Staff</p>
          </div>
        </div>

        {/* Invite Users */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Invite Users
          </h3>
          
          <form onSubmit={sendInvitation} className="mb-6">
            <div className="flex gap-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                required
                className="flex-1 px-4 py-2 rounded-lg text-white placeholder-gray-400 border-2 focus:outline-none focus:border-[#B34B0C]"
                style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail}
                className="px-6 py-2 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>

          {inviteMessage && (
            <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
              inviteMessage.type === 'success' ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
            }`}>
              <p className="text-white text-sm">{inviteMessage.text}</p>
              <button
                onClick={() => setInviteMessage(null)}
                className="text-white hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-semibold text-white mb-2">Recent Invitations</h4>
            {invitations.length === 0 ? (
              <p className="text-sm" style={{ color: '#B3B2B0' }}>No invitations sent yet</p>
            ) : (
              invitations.slice(0, 10).map(invitation => (
                <div
                  key={invitation.id}
                  className="p-4 rounded-lg border-2 flex items-center justify-between"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{invitation.email}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: '#B3B2B0' }}>
                      <span className="flex items-center gap-1">
                        {invitation.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                        {invitation.status === 'accepted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {invitation.status === 'expired' && <XCircle className="w-4 h-4 text-gray-500" />}
                        {invitation.status === 'revoked' && <XCircle className="w-4 h-4 text-red-500" />}
                        {invitation.status}
                      </span>
                      <span>Sent {new Date(invitation.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invitation.status === 'pending' && (
                      <>
                        <button
                          onClick={() => copyInviteLink(invitation.token)}
                          className="px-3 py-1 bg-[#B34B0C] text-white text-sm rounded hover:bg-[#8A3809] transition-colors"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => revokeInvitation(invitation.id)}
                          className="px-3 py-1 border-2 text-white text-sm rounded hover:border-red-500 transition-colors"
                          style={{ borderColor: '#6C6A68' }}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending User Approvals */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Pending User Approvals
              {pendingUsers.length > 0 && (
                <span className="px-2 py-1 rounded-full bg-[#B34B0C] text-white text-sm font-semibold">
                  {pendingUsers.length}
                </span>
              )}
            </h3>
            <button
              onClick={loadPendingUsers}
              disabled={pendingUsersLoading}
              className="px-3 py-1 text-sm border-2 text-white rounded hover:border-[#B34B0C] transition-colors disabled:opacity-50"
              style={{ borderColor: '#6C6A68' }}
            >
              {pendingUsersLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            {pendingUsersLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading pending users...</div>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
                <p className="font-semibold text-white mb-1">No pending approvals</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>All users have been approved</p>
              </div>
            ) : (
              pendingUsers.map(usr => (
                <div
                  key={usr.id}
                  className="p-4 rounded-lg border-2 flex items-center justify-between"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{usr.display_name || usr.username || 'New User'}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: '#B3B2B0' }}>
                      <span>{usr.email}</span>
                      <span>Registered {new Date(usr.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveUser(usr.id, true)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to reject ${usr.email}? This will delete their account.`)) {
                          approveUser(usr.id, false)
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* All Users Management */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              All Users
              {allUsers.length > 0 && (
                <span className="px-2 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#37322E', color: '#B3B2B0' }}>
                  {allUsers.length}
                </span>
              )}
            </h3>
            <button
              onClick={loadAllUsers}
              disabled={allUsersLoading}
              className="px-3 py-1 text-sm border-2 text-white rounded hover:border-[#B34B0C] transition-colors disabled:opacity-50"
              style={{ borderColor: '#6C6A68' }}
            >
              {allUsersLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {allUsersLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading users...</div>
            </div>
          ) : allUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
              <p className="font-semibold text-white mb-1">No users found</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>User list will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allUsers.map((usr: any) => (
                <div
                  key={usr.id}
                  className="p-4 rounded-lg border-2"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {editingUserId === usr.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              placeholder="username"
                              className="px-2 py-1 rounded text-sm border-2 focus:outline-none focus:border-[#B34B0C]"
                              style={{ backgroundColor: '#524944', borderColor: '#6C6A68', color: 'white' }}
                              autoFocus
                            />
                            <button
                              onClick={() => saveUsername(usr.id)}
                              className="px-2 py-1 text-xs rounded bg-[#B34B0C] text-white hover:opacity-80"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditingUsername}
                              className="px-2 py-1 text-xs rounded border-2 text-white hover:border-red-500"
                              style={{ borderColor: '#6C6A68' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-white">
                              {usr.display_name || usr.username || 'Unnamed User'}
                            </p>
                            {usr.is_staff && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#B34B0C] text-white">
                                STAFF
                              </span>
                            )}
                            {!usr.is_approved && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-600 text-white">
                                PENDING
                              </span>
                            )}
                            {!usr.is_active && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-600 text-white">
                                INACTIVE
                              </span>
                            )}
                            {usr.is_verified && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: '#B3B2B0' }}>
                        <span>{usr.email}</span>
                        {usr.username ? (
                          <button
                            onClick={() => startEditingUsername(usr.id, usr.username)}
                            className="hover:text-[#B34B0C] transition-colors"
                          >
                            @{usr.username} ✎
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditingUsername(usr.id, '')}
                            className="text-yellow-500 hover:text-[#B34B0C] transition-colors"
                          >
                            [No username - click to set] ✎
                          </button>
                        )}
                        <span>ID: {usr.id}</span>
                        <span>Joined {new Date(usr.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="https://auth.workshelf.dev/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <Shield className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">Keycloak Console</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>Manage authentication</p>
            </a>

            <button
              onClick={() => window.location.href = '/admin'}
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <Users className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">Group Management</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>Manage groups & communities</p>
            </button>

            <button
              onClick={() => window.location.href = '/staff/store'}
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <ShoppingBag className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">Store Analytics</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>EPUB uploads & sales</p>
            </button>

            <button
              onClick={() => alert('Coming soon!')}
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <Flag className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">Global Moderation</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>Review flagged content</p>
            </button>

            <button
              onClick={() => alert('Coming soon!')}
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <Settings className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">System Settings</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>Platform configuration</p>
            </button>

            <button
              onClick={() => alert('Coming soon!')}
              className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
              style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
            >
              <Wand2 className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
              <p className="font-semibold text-white">AI Templates</p>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>Review AI templates</p>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
          <h3 className="text-xl font-bold text-white mb-4">Recent Site Activity</h3>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
            <p style={{ color: '#B3B2B0' }}>Activity feed coming soon</p>
          </div>
        </div>

          {/* Page Version */}
          <PageVersion path="/staff" />
        </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
