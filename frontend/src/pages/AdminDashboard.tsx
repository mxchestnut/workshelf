/**
 * Admin Dashboard - For group administrators
 * Manage groups, members, and content moderation
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { 
  Users, 
  Shield, 
  Flag,
  TrendingUp,
  UserCheck,
  MessageSquare,
  BookOpen,
  Settings,
  AlertCircle,
  Mail,
  Send,
  ShoppingBag,
  Wand2,
  X,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface AdminStats {
  total_members: number
  pending_requests: number
  total_posts: number
  flagged_content: number
}

interface Group {
  id: number
  name: string
  slug: string
  member_count: number
  post_count: number
}

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

interface AdminDashboardProps {
  embedded?: boolean  // When true, don't render Navigation (for use in Dashboard tabs)
}

export function AdminDashboard({ embedded = false }: AdminDashboardProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [managedGroups, setManagedGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'moderation' | 'site-admin'>('overview')
  const [isStaff, setIsStaff] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingUsersLoading, setPendingUsersLoading] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      console.log('[AdminDashboard] Loading user...')
      const currentUser = await authService.getCurrentUser()
      console.log('[AdminDashboard] User loaded:', currentUser)
      
      if (!currentUser) {
        console.warn('[AdminDashboard] No user found, redirecting to login')
        setTimeout(() => {
          authService.login()
        }, 100)
        return
      }

      setUser(currentUser)

      // Check if user is staff or group admin
      const staffUser = currentUser.is_staff || false
      setIsStaff(staffUser)

      // Check if user is a group admin
      if (!staffUser && (!currentUser.groups || currentUser.groups.length === 0)) {
        console.warn('[AdminDashboard] User is not a group admin or staff')
        // Redirect to home or show error
        window.location.href = '/'
        return
      }

      loadAdminData()
    } catch (err) {
      console.error('[AdminDashboard] Error loading user:', err)
      setTimeout(() => {
        authService.login()
      }, 100)
    }
  }

  const loadAdminData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Load managed groups
      const groupsResponse = await fetch(`${API_URL}/api/v1/groups/managed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setManagedGroups(groupsData)

        // Calculate stats from groups
        const totalMembers = groupsData.reduce((sum: number, g: Group) => sum + g.member_count, 0)
        const totalPosts = groupsData.reduce((sum: number, g: Group) => sum + g.post_count, 0)
        
        setStats({
          total_members: totalMembers,
          pending_requests: 0,
          total_posts: totalPosts,
          flagged_content: 0
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('[AdminDashboard] Error loading admin data:', error)
      setLoading(false)
    }
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
      console.error('[AdminDashboard] Error loading invitations:', error)
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || inviteLoading) return

    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setInviteMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch(`${API_URL}/api/v1/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail })
      })

      if (response.ok) {
        const invitation = await response.json()
        setInvitations([invitation, ...invitations])
        setInviteEmail('')
        setInviteMessage({ 
          type: 'success', 
          text: `Invitation sent to ${inviteEmail}. Share this link: ${window.location.origin}/invite/${invitation.token}` 
        })
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to send invitation' })
      }
    } catch (error) {
      console.error('[AdminDashboard] Error sending invitation:', error)
      setInviteMessage({ type: 'error', text: 'Failed to send invitation' })
    } finally {
      setInviteLoading(false)
    }
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
        setInvitations(invitations.map(inv => 
          inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
        ))
      }
    } catch (error) {
      console.error('[AdminDashboard] Error revoking invitation:', error)
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setInviteMessage({ type: 'success', text: 'Invitation link copied to clipboard!' })
    setTimeout(() => setInviteMessage(null), 3000)
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
        setPendingUsers(data.users || [])
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading pending users:', error)
    } finally {
      setPendingUsersLoading(false)
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
        body: JSON.stringify({ approve })
      })

      if (response.ok) {
        // Remove from pending list
        setPendingUsers(pendingUsers.filter(u => u.id !== userId))
        setInviteMessage({ 
          type: 'success', 
          text: approve ? 'User approved successfully!' : 'User rejected successfully.' 
        })
        setTimeout(() => setInviteMessage(null), 3000)
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to process approval' })
      }
    } catch (error) {
      console.error('[AdminDashboard] Error approving user:', error)
      setInviteMessage({ type: 'error', text: 'Failed to process approval' })
    }
  }

  // Load invitations and pending users when Site Admin tab becomes active
  useEffect(() => {
    if (activeTab === 'site-admin' && isStaff) {
      if (invitations.length === 0) {
        loadInvitations()
      }
      loadPendingUsers()
    }
  }, [activeTab, isStaff])

  const navigateToGroup = (slug: string) => {
    window.location.href = `/groups/${slug}`
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        {!embedded && (
          <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="admin" />
        )}
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      {!embedded && (
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="admin" />
      )}
      
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p style={{ color: '#B3B2B0' }}>Manage your groups and community</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-[#B34B0C] text-white font-semibold'
                  : 'border-transparent text-[#B3B2B0] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'groups'
                  ? 'border-[#B34B0C] text-white font-semibold'
                  : 'border-transparent text-[#B3B2B0] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Groups
              </div>
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'moderation'
                  ? 'border-[#B34B0C] text-white font-semibold'
                  : 'border-transparent text-[#B3B2B0] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Moderation
              </div>
            </button>
            {/* Site Admin tab - only for staff */}
            {isStaff && (
              <button
                onClick={() => setActiveTab('site-admin')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'site-admin'
                    ? 'border-[#B34B0C] text-white font-semibold'
                    : 'border-transparent text-[#B3B2B0] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Site Admin
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.total_members || 0}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Members</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.pending_requests || 0}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Pending Requests</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.total_posts || 0}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Posts</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Flag className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.flagged_content || 0}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Flagged Content</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('groups')}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                  style={{ backgroundColor: '#524944' }}
                >
                  <Users className="w-8 h-8 mb-3" style={{ color: '#B34B0C' }} />
                  <h3 className="text-lg font-semibold mb-2 text-white">Manage Groups</h3>
                  <p style={{ color: '#B3B2B0' }}>View and manage your groups, approve members</p>
                </button>

                <button
                  onClick={() => setActiveTab('moderation')}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                  style={{ backgroundColor: '#524944' }}
                >
                  <Flag className="w-8 h-8 mb-3" style={{ color: '#B34B0C' }} />
                  <h3 className="text-lg font-semibold mb-2 text-white">Review Reports</h3>
                  <p style={{ color: '#B3B2B0' }}>Review flagged content and user reports</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Your Groups</h2>
              <button
                onClick={() => window.location.href = '/groups'}
                className="px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors"
              >
                View All Groups
              </button>
            </div>

            {managedGroups.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
                <p className="text-lg font-semibold text-white mb-2">No groups yet</p>
                <p style={{ color: '#B3B2B0' }}>You don't manage any groups currently</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {managedGroups.map(group => (
                  <div
                    key={group.id}
                    className="p-6 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ backgroundColor: '#524944' }}
                    onClick={() => navigateToGroup(group.slug)}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{group.name}</h3>
                    <div className="flex gap-4 text-sm" style={{ color: '#B3B2B0' }}>
                      <span>{group.member_count} members</span>
                      <span>{group.post_count} posts</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateToGroup(group.slug)
                      }}
                      className="mt-4 px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors"
                    >
                      Manage Group
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Content Moderation</h2>
            
            <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#524944' }}>
              <Flag className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
              <p className="text-lg font-semibold text-white mb-2">No flagged content</p>
              <p style={{ color: '#B3B2B0' }}>All clear! No reports to review at this time.</p>
            </div>
          </div>
        )}

        {/* Site Admin Tab - Staff Only */}
        {activeTab === 'site-admin' && isStaff && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Site Administration</h2>
              <a
                href="https://auth.workshelf.dev/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Open Keycloak Console
              </a>
            </div>

            {/* Site-Wide Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">--</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Users</p>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between mb-4">
                  <BookOpen className="w-8 h-8" style={{ color: '#B34B0C' }} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">--</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Books</p>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8" style={{ color: '#B34B0C' }} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">{managedGroups.length}</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Groups</p>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-8 h-8" style={{ color: '#B34B0C' }} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">--</p>
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
                  pendingUsers.map(user => (
                    <div
                      key={user.id}
                      className="p-4 rounded-lg border-2 flex items-center justify-between"
                      style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{user.display_name || user.username || 'New User'}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: '#B3B2B0' }}>
                          <span>{user.email}</span>
                          <span>Registered {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveUser(user.id, true)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to reject ${user.email}? This will delete their account.`)) {
                              approveUser(user.id, false)
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

            {/* Quick Actions */}
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
              <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/staff/users'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <Users className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">Manage All Users</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>View and manage user accounts</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/groups'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <Users className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">View All Groups</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>Browse and manage all groups</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/moderation'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <Flag className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">Global Moderation</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>Review all flagged content</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/settings'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <Settings className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">System Settings</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>Configure site-wide settings</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/store'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <ShoppingBag className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">Store Analytics</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>Manage store and EPUB uploads</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/ai-templates'}
                  className="p-4 rounded-lg border-2 hover:border-[#B34B0C] transition-colors text-left"
                  style={{ borderColor: '#6C6A68', backgroundColor: '#37322E' }}
                >
                  <Wand2 className="w-6 h-6 mb-2" style={{ color: '#B34B0C' }} />
                  <p className="font-semibold text-white">AI Template Review</p>
                  <p className="text-sm" style={{ color: '#B3B2B0' }}>Review AI-generated templates</p>
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
          </div>
        )}
      </div>
    </div>
  )
}
