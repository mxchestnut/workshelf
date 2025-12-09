/**
 * Group Admin Dashboard
 * Allows group owners to manage their group: members, settings, privacy, publications
 * Staff can access any group's admin dashboard
 */
import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { Users, Settings, Lock, FileText, CheckCircle, XCircle, UserPlus, Shield, Globe, Plus, Trash2, Copy, AlertCircle, Palette, Upload, Eye, ShieldAlert, Mail, TrendingUp } from 'lucide-react'
import { RoleEditor } from '../components/RoleEditor'
import { MemberRoleManager } from '../components/MemberRoleManager'
import ModerationLog from '../components/ModerationLog'
import InviteMembersModal from '../components/InviteMembersModal'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface GroupMember {
  id: number
  user_id: number
  role: 'owner' | 'admin' | 'moderator' | 'member'
  username?: string
  display_name?: string
  email?: string
  is_owner?: boolean
  is_moderator?: boolean
  joined_at?: string
  status?: 'active' | 'pending' | 'banned'
  user?: {
    id: number
    email: string
    username?: string
  }
  custom_roles?: {
    id: number
    name: string
    color: string | null
    position: number
  }[]
}

interface GroupPublication {
  id: number
  title: string
  author_name: string
  published_at: string
  status: 'published' | 'pending' | 'rejected'
}

interface GroupRole {
  id: number
  group_id: number
  name: string
  color: string | null
  position: number
  can_delete_posts: boolean
  can_delete_comments: boolean
  can_pin_posts: boolean
  can_lock_threads: boolean
  can_manage_tags: boolean
  can_approve_members: boolean
  can_kick_members: boolean
  can_ban_members: boolean
  can_invite_members: boolean
  can_view_member_list: boolean
  can_approve_publications: boolean
  can_edit_publications: boolean
  can_feature_publications: boolean
  can_edit_group_info: boolean
  can_manage_roles: boolean
  can_view_analytics: boolean
  can_export_data: boolean
  created_at: string
}

interface GroupSettings {
  name: string
  description: string
  privacy: 'public' | 'private' | 'invite-only'
  requires_approval: boolean
  subdomain_requested: string | null
  subdomain_approved: boolean
}

interface CustomDomain {
  id: number
  domain_name: string
  is_verified: boolean
  verification_token: string
  dns_configured: boolean
  ssl_status: 'pending' | 'active' | 'failed' | null
  created_at: string
  verified_at: string | null
}

interface GroupTheme {
  id?: number
  group_id?: number
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  heading_font: string
  body_font: string
  logo_url: string | null
  banner_url: string | null
  favicon_url: string | null
  custom_css: string | null
  layout_config: any
  created_at?: string
  updated_at?: string
}

export default function GroupAdmin() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])
  const [groupSlug, setGroupSlug] = useState<string>('')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [publications, setPublications] = useState<GroupPublication[]>([])
  const [roles, setRoles] = useState<GroupRole[]>([])
  const [customDomains, setCustomDomains] = useState<CustomDomain[]>([])
  const [groupTheme, setGroupTheme] = useState<GroupTheme | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'settings' | 'publications' | 'domains' | 'theme' | 'moderation' | 'invitations' | 'analytics'>('members')
  const [newDomain, setNewDomain] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // Extract group slug from URL
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/group\/([^/]+)\/admin/)
    if (match) {
      setGroupSlug(match[1])
    }
  }, [])

  useEffect(() => {
    if (groupSlug) {
      loadGroupData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug])

  const loadGroupData = async () => {
    setLoading(true)
    try {
      const token = authService.getAccessToken()
      
      // Load group settings
      const settingsRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setGroupSettings(data)
        setGroupId(data.id) // Save group ID for moderation endpoints
      }

      // Load members
      const membersRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (membersRes.ok) {
        const data = await membersRes.json()
        setMembers(data)
      }

      // Load publications
      const pubsRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/publications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (pubsRes.ok) {
        const data = await pubsRes.json()
        setPublications(data)
      }

      // Load roles
      const rolesRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        setRoles(data)
      }

      // Load custom domains
      const domainsRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/custom-domains`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (domainsRes.ok) {
        const data = await domainsRes.json()
        setCustomDomains(data)
      }

      // Load group theme
      const themeRes = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/theme`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (themeRes.ok) {
        const data = await themeRes.json()
        setGroupTheme(data)
      } else if (themeRes.status === 404) {
        // No theme yet, set default values
        setGroupTheme({
          primary_color: '#B34B0C',
          secondary_color: '#7C3306',
          accent_color: '#FF6B35',
          background_color: '#1A1816',
          text_color: '#FFFFFF',
          heading_font: 'Inter',
          body_font: 'Inter',
          logo_url: null,
          banner_url: null,
          favicon_url: null,
          custom_css: null,
          layout_config: {}
        })
      }

    } catch (err) {
      console.error('Failed to load group data:', err)
      setError('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    authService.login()
  }

  const handleLogout = async () => {
    await authService.logout()
    setUser(null)
    window.location.href = '/'
  }

  const loadInvitations = async () => {
    if (!groupId) return
    
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/group-admin/groups/${groupId}/invitations`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setPendingInvitations(data.invitations || [])
      }
    } catch (err) {
      console.error('Failed to load invitations:', err)
    }
  }

  const loadAnalytics = async () => {
    if (!groupId) return
    
    setLoadingAnalytics(true)
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupId}/analytics`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // Load invitations when activeTab changes to members or invitations
  useEffect(() => {
    if ((activeTab === 'members' || activeTab === 'invitations') && groupId) {
      loadInvitations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupId])

  // Load analytics when activeTab changes to analytics
  useEffect(() => {
    if (activeTab === 'analytics' && groupId) {
      loadAnalytics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, groupId])

  const updateMemberStatus = async (memberId: number, action: 'approve' | 'reject' | 'ban' | 'make-moderator' | 'remove-moderator') => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/members/${memberId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess(`Member ${action} successful`)
        loadGroupData()
      } else {
        setError(`Failed to ${action} member`)
      }
    } catch (err) {
      setError(`Failed to ${action} member`)
    }
  }

  const removeMember = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Member removed')
        loadGroupData()
      } else {
        setError('Failed to remove member')
      }
    } catch (err) {
      setError('Failed to remove member')
    }
  }

  const revokeInvitation = async (invitationId: number) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return

    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/group-admin/groups/${groupId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Invitation revoked')
        loadInvitations()
      } else {
        setError('Failed to revoke invitation')
      }
    } catch (err) {
      setError('Failed to revoke invitation')
    }
  }

  const updateGroupSettings = async (updates: Partial<GroupSettings>) => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (res.ok) {
        setSuccess('Settings updated')
        loadGroupData()
      } else {
        setError('Failed to update settings')
      }
    } catch (err) {
      setError('Failed to update settings')
    }
  }

  const updatePublicationStatus = async (pubId: number, status: 'published' | 'rejected') => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/publications/${pubId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        setSuccess(`Publication ${status}`)
        loadGroupData()
      } else {
        setError('Failed to update publication')
      }
    } catch (err) {
      setError('Failed to update publication')
    }
  }

  const createOrUpdateRole = async (roleData: Partial<GroupRole>) => {
    try {
      const token = authService.getAccessToken()
      const isEditing = editingRole !== null
      const url = isEditing
        ? `${API_URL}/api/v1/groups/${groupSlug}/roles/${editingRole.id}`
        : `${API_URL}/api/v1/groups/${groupSlug}/roles`
      
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      })

      if (res.ok) {
        setSuccess(isEditing ? 'Role updated' : 'Role created')
        setShowRoleModal(false)
        setEditingRole(null)
        loadGroupData()
      } else {
        setError(`Failed to ${isEditing ? 'update' : 'create'} role`)
      }
    } catch (err) {
      setError(`Failed to ${editingRole ? 'update' : 'create'} role`)
    }
  }

  const deleteRole = async (roleId: number) => {
    if (!confirm('Are you sure you want to delete this role? Members with this role will lose its permissions.')) return

    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Role deleted')
        loadGroupData()
      } else {
        setError('Failed to delete role')
      }
    } catch (err) {
      setError('Failed to delete role')
    }
  }

  const assignRoleToMember = async (memberId: number, roleId: number) => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/members/${memberId}/roles/${roleId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Role assigned to member')
        loadGroupData() // Reload to get updated member roles
      } else {
        setError('Failed to assign role')
      }
    } catch (err) {
      setError('Failed to assign role')
    }
  }

  const removeRoleFromMember = async (memberId: number, roleId: number) => {
    try {
      const token = authService.getAccessToken()
      const res = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/members/${memberId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Role removed from member')
        loadGroupData() // Reload to get updated member roles
      } else {
        setError('Failed to remove role')
      }
    } catch (err) {
      setError('Failed to remove role')
    }
  }

  const banMember = async (memberId: number) => {
    if (!groupId) {
      setError('Group ID not available')
      return
    }

    try {
      const token = authService.getAccessToken()
      const memberUserId = members.find(m => m.id === memberId)?.user_id
      if (!memberUserId) {
        setError('Member not found')
        return
      }

      const res = await fetch(`${API_URL}/api/v1/group-admin/groups/${groupId}/members/${memberUserId}/ban`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Member banned successfully')
        loadGroupData() // Reload member list
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to ban member')
      }
    } catch (err) {
      setError('Failed to ban member')
    }
  }

  const kickMember = async (memberId: number) => {
    if (!groupId) {
      setError('Group ID not available')
      return
    }

    try {
      const token = authService.getAccessToken()
      const memberUserId = members.find(m => m.id === memberId)?.user_id
      if (!memberUserId) {
        setError('Member not found')
        return
      }

      const res = await fetch(`${API_URL}/api/v1/group-admin/groups/${groupId}/members/${memberUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setSuccess('Member removed successfully')
        loadGroupData() // Reload member list
      } else {
        const data = await res.json()
        setError(data.detail || 'Failed to remove member')
      }
    } catch (err) {
      setError('Failed to remove member')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: '#B34B0C' }} />
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to access the group admin dashboard.</p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#B34B0C' }}
          >
            Log In
          </button>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 rounded-full mx-auto" style={{ borderColor: '#B34B0C', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 mt-4">Loading group data...</p>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="/admin" />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" style={{ color: '#B34B0C' }} />
            <h1 className="text-3xl font-bold text-white">{groupSettings?.name} Admin</h1>
            {user.is_staff && (
              <span className="px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#7C3306' }}>
                STAFF ACCESS
              </span>
            )}
          </div>
          <p className="text-gray-400">Manage members, settings, and publications for your group</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1F5C3A', borderLeft: '4px solid #10B981' }}>
            <p className="text-white">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#5C1F1F', borderLeft: '4px solid #EF4444' }}>
            <p className="text-white">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{ borderColor: '#6C6A68' }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'members' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'members' ? { borderColor: '#B34B0C' } : {}}
          >
            <Users className="w-5 h-5" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'roles' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'roles' ? { borderColor: '#B34B0C' } : {}}
          >
            <Shield className="w-5 h-5" />
            Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab('publications')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'publications' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'publications' ? { borderColor: '#B34B0C' } : {}}
          >
            <FileText className="w-5 h-5" />
            Publications ({publications.filter(p => p.status === 'pending').length} pending)
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'domains' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'domains' ? { borderColor: '#B34B0C' } : {}}
          >
            <Globe className="w-5 h-5" />
            Custom Domains ({customDomains.length})
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'theme' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'theme' ? { borderColor: '#B34B0C' } : {}}
          >
            <Palette className="w-5 h-5" />
            Theme
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'moderation' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'moderation' ? { borderColor: '#B34B0C' } : {}}
          >
            <ShieldAlert className="w-5 h-5" />
            Audit Log
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'invitations' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'invitations' ? { borderColor: '#B34B0C' } : {}}
          >
            <UserPlus className="w-5 h-5" />
            Invitations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'analytics' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'analytics' ? { borderColor: '#B34B0C' } : {}}
          >
            <Globe className="w-5 h-5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'settings' ? 'text-white border-b-2' : 'text-gray-400'
            }`}
            style={activeTab === 'settings' ? { borderColor: '#B34B0C' } : {}}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Group Members</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:opacity-90"
                style={{ backgroundColor: '#B34B0C' }}
              >
                <UserPlus className="w-5 h-5" />
                Invite Members
              </button>
            </div>

            {members.map(member => (
              <div key={member.id} className="p-4 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{member.display_name || member.username}</p>
                      {member.is_owner && (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#B34B0C' }}>
                          OWNER
                        </span>
                      )}
                      {member.is_moderator && (
                        <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#7C3306' }}>
                          MOD
                        </span>
                      )}
                      {member.status === 'pending' && (
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#524944', color: '#B3B2B0' }}>
                          PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{member.email || member.user?.email}</p>
                    {member.joined_at && (
                      <p className="text-xs text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                    )}
                  </div>

                  {!member.is_owner && (
                    <div className="flex items-center gap-2">
                      {member.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'approve')}
                            className="p-2 rounded-lg text-white hover:opacity-80"
                            style={{ backgroundColor: '#10B981' }}
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'reject')}
                            className="p-2 rounded-lg text-white hover:opacity-80"
                            style={{ backgroundColor: '#EF4444' }}
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {member.status === 'active' && (
                        <>
                          {!member.is_moderator ? (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'make-moderator')}
                              className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-80"
                              style={{ backgroundColor: '#7C3306' }}
                            >
                              Make Mod
                            </button>
                          ) : (
                            <button
                              onClick={() => updateMemberStatus(member.id, 'remove-moderator')}
                              className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-80"
                              style={{ backgroundColor: '#524944' }}
                            >
                              Remove Mod
                            </button>
                          )}
                          <button
                            onClick={() => removeMember(member.id)}
                            className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-80"
                            style={{ backgroundColor: '#EF4444' }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-4">Pending Invitations</h3>
                <div className="space-y-2">
                  {pendingInvitations.map(invite => (
                    <div key={invite.id} className="p-4 rounded-lg" style={{ backgroundColor: '#524944' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{invite.email}</p>
                            <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#7C3306' }}>
                              {invite.role.toUpperCase()}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-medium" style={{ 
                              backgroundColor: invite.status === 'pending' ? '#B34B0C' : '#524944',
                              color: '#B3B2B0'
                            }}>
                              {invite.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">
                            Invited by {invite.inviter_name || 'Unknown'} on {new Date(invite.created_at).toLocaleDateString()}
                          </p>
                          {invite.expires_at && (
                            <p className="text-xs text-gray-500">
                              Expires {new Date(invite.expires_at).toLocaleDateString()}
                            </p>
                          )}
                          {invite.message && (
                            <p className="text-sm text-gray-300 mt-2 italic">"{invite.message}"</p>
                          )}
                        </div>
                        {invite.status === 'pending' && (
                          <button
                            onClick={async () => {
                              try {
                                const token = authService.getAccessToken()
                                const res = await fetch(`${API_URL}/api/v1/group-admin/groups/${groupId}/invitations/${invite.id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                })
                                if (res.ok) {
                                  setSuccess('Invitation revoked')
                                  loadInvitations()
                                } else {
                                  setError('Failed to revoke invitation')
                                }
                              } catch (err) {
                                setError('Failed to revoke invitation')
                              }
                            }}
                            className="px-3 py-1 rounded text-sm font-medium text-white hover:opacity-80"
                            style={{ backgroundColor: '#EF4444' }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Members Modal */}
            {showInviteModal && groupId && (
              <InviteMembersModal
                groupId={groupId}
                onClose={() => setShowInviteModal(false)}
                onInviteSent={() => {
                  loadInvitations()
                  setSuccess('Invitations sent successfully!')
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'publications' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Group Publications</h2>
            
            {publications.filter(p => p.status === 'pending').length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-3">Pending Approval</h3>
                {publications.filter(p => p.status === 'pending').map(pub => (
                  <div key={pub.id} className="p-4 rounded-lg mb-3" style={{ backgroundColor: '#524944' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{pub.title}</p>
                        <p className="text-sm text-gray-400">by {pub.author_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updatePublicationStatus(pub.id, 'published')}
                          className="px-4 py-2 rounded-lg text-white hover:opacity-80"
                          style={{ backgroundColor: '#10B981' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updatePublicationStatus(pub.id, 'rejected')}
                          className="px-4 py-2 rounded-lg text-white hover:opacity-80"
                          style={{ backgroundColor: '#EF4444' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Published</h3>
              {publications.filter(p => p.status === 'published').map(pub => (
                <div key={pub.id} className="p-4 rounded-lg mb-3" style={{ backgroundColor: '#524944' }}>
                  <p className="font-medium text-white">{pub.title}</p>
                  <p className="text-sm text-gray-400">by {pub.author_name}</p>
                  <p className="text-xs text-gray-500">Published {new Date(pub.published_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Custom Roles</h2>
              <button
                onClick={() => {
                  setEditingRole(null)
                  setShowRoleModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: '#B34B0C' }}
              >
                <Shield className="w-5 h-5" />
                Create Role
              </button>
            </div>

            <p className="text-gray-400 mb-6">
              Create custom roles with specific permissions. Members can have multiple roles.
            </p>

            {roles.length === 0 ? (
              <div className="p-8 rounded-lg text-center" style={{ backgroundColor: '#524944' }}>
                <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#B34B0C' }} />
                <p className="text-gray-300 mb-4">No custom roles yet</p>
                <p className="text-sm text-gray-400">Create roles to delegate specific permissions to members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roles.map(role => (
                  <div key={role.id} className="p-4 rounded-lg" style={{ backgroundColor: '#524944' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3 py-1 rounded text-sm font-medium text-white"
                          style={{ backgroundColor: role.color || '#7C3306' }}
                        >
                          {role.name}
                        </span>
                        <span className="text-sm text-gray-400">Position: {role.position}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRole(role)
                            setShowRoleModal(true)
                          }}
                          className="px-3 py-1 rounded text-sm font-medium text-white hover:bg-opacity-80"
                          style={{ backgroundColor: '#7C3306' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          className="px-3 py-1 rounded text-sm font-medium text-white hover:bg-opacity-80"
                          style={{ backgroundColor: '#5C1F1F' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Permission Summary */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.can_delete_posts && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Delete Posts</span>}
                      {role.can_delete_comments && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Delete Comments</span>}
                      {role.can_pin_posts && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Pin Posts</span>}
                      {role.can_lock_threads && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Lock Threads</span>}
                      {role.can_approve_members && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Approve Members</span>}
                      {role.can_kick_members && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Kick Members</span>}
                      {role.can_ban_members && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Ban Members</span>}
                      {role.can_approve_publications && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Approve Publications</span>}
                      {role.can_edit_publications && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Edit Publications</span>}
                      {role.can_edit_group_info && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Edit Group Info</span>}
                      {role.can_manage_roles && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>Manage Roles</span>}
                      {role.can_view_analytics && <span className="px-2 py-1 rounded text-xs text-gray-300" style={{ backgroundColor: '#37322E' }}>View Analytics</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Member Role Assignment */}
            {roles.length > 0 && members.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Assign Roles to Members</h3>
                <MemberRoleManager
                  members={members}
                  roles={roles}
                  onAssignRole={assignRoleToMember}
                  onRemoveRole={removeRoleFromMember}
                  onBanMember={banMember}
                  onKickMember={kickMember}
                  currentUserId={user?.id}
                  userPermissions={{
                    can_ban_members: true, // Group owners/admins can ban
                    can_kick_members: true  // Group owners/admins can kick
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Custom Domains Tab */}
        {activeTab === 'domains' && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
              <h2 className="text-xl font-bold text-white mb-4">Custom Domains</h2>
              <p className="text-gray-300 mb-6">
                Connect your own domain to your group for a professional, branded experience.
              </p>

              {/* Add New Domain */}
              <div className="mb-8 p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                <h3 className="text-lg font-semibold text-white mb-3">Add Custom Domain</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newDomain}
                    onChange={(e) => {
                      setNewDomain(e.target.value)
                      setDomainError(null)
                    }}
                    placeholder="example.com"
                    className="flex-1 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}
                  />
                  <button
                    onClick={async () => {
                      if (!newDomain.trim()) {
                        setDomainError('Please enter a domain name')
                        return
                      }

                      try {
                        const token = authService.getAccessToken()
                        
                        const response = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/custom-domains`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ domain_name: newDomain.trim() })
                        })

                        if (response.ok) {
                          const newDomainData = await response.json()
                          setCustomDomains([...customDomains, newDomainData])
                          setNewDomain('')
                          setSuccess('Domain added! Please configure DNS records below.')
                          setTimeout(() => setSuccess(null), 5000)
                        } else {
                          const error = await response.json()
                          setDomainError(error.detail || 'Failed to add domain')
                        }
                      } catch (err) {
                        setDomainError('Network error. Please try again.')
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white whitespace-nowrap"
                    style={{ backgroundColor: '#B34B0C' }}
                  >
                    <Plus className="w-5 h-5" />
                    Add Domain
                  </button>
                </div>
                {domainError && (
                  <div className="mt-3 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#7C3306' }}>
                    <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <p className="text-white text-sm">{domainError}</p>
                  </div>
                )}
              </div>

              {/* Domains List */}
              {customDomains.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No custom domains configured yet.</p>
                  <p className="text-sm mt-2">Add your first domain to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customDomains.map((domain) => (
                    <div key={domain.id} className="p-5 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white font-mono">{domain.domain_name}</h3>
                            {domain.is_verified ? (
                              <span className="px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#10B981' }}>
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#7C3306' }}>
                                <XCircle className="w-3 h-3 inline mr-1" />
                                Pending Verification
                              </span>
                            )}
                            {domain.ssl_status === 'active' && (
                              <span className="px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#10B981' }}>
                                🔒 SSL Active
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            Added {new Date(domain.created_at).toLocaleDateString()}
                            {domain.verified_at && ` • Verified ${new Date(domain.verified_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!confirm(`Remove domain ${domain.domain_name}?`)) return

                            try {
                              const token = authService.getAccessToken()

                              const response = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/custom-domains/${domain.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                              })

                              if (response.ok) {
                                setCustomDomains(customDomains.filter(d => d.id !== domain.id))
                                setSuccess('Domain removed successfully')
                                setTimeout(() => setSuccess(null), 3000)
                              }
                            } catch (err) {
                              setError('Failed to remove domain')
                            }
                          }}
                          className="p-2 rounded hover:bg-red-900/20 transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>

                      {/* DNS Configuration Instructions */}
                      {!domain.is_verified && (
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#524944' }}>
                          <h4 className="text-sm font-semibold text-white mb-3">DNS Configuration Required</h4>
                          
                          <div className="space-y-3 mb-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Add this TXT record to verify domain ownership:</p>
                              <div className="flex items-center gap-2 p-2 rounded font-mono text-sm" style={{ backgroundColor: '#37322E' }}>
                                <code className="flex-1 text-white">
                                  TXT @ workshelf-verify={domain.verification_token}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`workshelf-verify=${domain.verification_token}`)
                                    setSuccess('Verification token copied!')
                                    setTimeout(() => setSuccess(null), 2000)
                                  }}
                                  className="p-1 hover:bg-white/10 rounded"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-gray-400 mb-1">Point your domain to WorkShelf:</p>
                              <div className="flex items-center gap-2 p-2 rounded font-mono text-sm" style={{ backgroundColor: '#37322E' }}>
                                <code className="flex-1 text-white">
                                  CNAME @ workshelf.dev
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText('workshelf.dev')
                                    setSuccess('CNAME target copied!')
                                    setTimeout(() => setSuccess(null), 2000)
                                  }}
                                  className="p-1 hover:bg-white/10 rounded"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                const token = authService.getAccessToken()

                                const response = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/custom-domains/${domain.id}/verify`, {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                })

                                if (response.ok) {
                                  const updatedDomain = await response.json()
                                  setCustomDomains(customDomains.map(d => d.id === domain.id ? updatedDomain : d))
                                  setSuccess('Domain verified successfully! SSL certificate will be issued shortly.')
                                  setTimeout(() => setSuccess(null), 5000)
                                } else {
                                  const error = await response.json()
                                  setError(error.detail || 'Verification failed. Please check your DNS records.')
                                  setTimeout(() => setError(null), 5000)
                                }
                              } catch (err) {
                                setError('Network error. Please try again.')
                              }
                            }}
                            className="w-full px-4 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#B34B0C' }}
                          >
                            <CheckCircle className="w-5 h-5" />
                            Verify DNS Configuration
                          </button>

                          <p className="text-xs text-gray-400 mt-3">
                            💡 DNS changes can take up to 48 hours to propagate. Click verify once you've configured the records.
                          </p>
                        </div>
                      )}

                      {/* SSL Status */}
                      {domain.is_verified && (
                        <div className="mt-4 p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: domain.ssl_status === 'active' ? '#065F46' : '#524944' }}>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {domain.ssl_status === 'active' && '🔒 SSL Certificate Active'}
                              {domain.ssl_status === 'pending' && '⏳ SSL Certificate Pending'}
                              {domain.ssl_status === 'failed' && '❌ SSL Certificate Failed'}
                              {!domain.ssl_status && '⏳ SSL Certificate Pending'}
                            </p>
                            <p className="text-xs text-gray-300 mt-1">
                              {domain.ssl_status === 'active' && 'Your domain is fully configured and secure!'}
                              {domain.ssl_status === 'pending' && 'SSL certificate is being issued. This usually takes a few minutes.'}
                              {domain.ssl_status === 'failed' && 'SSL certificate issuance failed. Please contact support.'}
                              {!domain.ssl_status && 'SSL certificate will be issued automatically.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme Editor Tab */}
        {activeTab === 'theme' && groupTheme && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Theme Editor - Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Colors Section */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Palette className="w-6 h-6" />
                    Brand Colors
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={groupTheme.primary_color}
                          onChange={(e) => setGroupTheme({...groupTheme, primary_color: e.target.value})}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={groupTheme.primary_color}
                          onChange={(e) => setGroupTheme({...groupTheme, primary_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded text-white font-mono text-sm"
                          style={{ backgroundColor: '#37322E' }}
                          placeholder="#B34B0C"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Main brand color (buttons, links)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={groupTheme.secondary_color}
                          onChange={(e) => setGroupTheme({...groupTheme, secondary_color: e.target.value})}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={groupTheme.secondary_color}
                          onChange={(e) => setGroupTheme({...groupTheme, secondary_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded text-white font-mono text-sm"
                          style={{ backgroundColor: '#37322E' }}
                          placeholder="#7C3306"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Darker variant for hover states</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Accent Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={groupTheme.accent_color}
                          onChange={(e) => setGroupTheme({...groupTheme, accent_color: e.target.value})}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={groupTheme.accent_color}
                          onChange={(e) => setGroupTheme({...groupTheme, accent_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded text-white font-mono text-sm"
                          style={{ backgroundColor: '#37322E' }}
                          placeholder="#FF6B35"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Highlights and CTAs</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Background Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={groupTheme.background_color}
                          onChange={(e) => setGroupTheme({...groupTheme, background_color: e.target.value})}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={groupTheme.background_color}
                          onChange={(e) => setGroupTheme({...groupTheme, background_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded text-white font-mono text-sm"
                          style={{ backgroundColor: '#37322E' }}
                          placeholder="#1A1816"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Page background</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Text Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={groupTheme.text_color}
                          onChange={(e) => setGroupTheme({...groupTheme, text_color: e.target.value})}
                          className="w-16 h-10 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={groupTheme.text_color}
                          onChange={(e) => setGroupTheme({...groupTheme, text_color: e.target.value})}
                          className="flex-1 px-3 py-2 rounded text-white font-mono text-sm"
                          style={{ backgroundColor: '#37322E' }}
                          placeholder="#FFFFFF"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Main text color</p>
                    </div>
                  </div>
                </div>

                {/* Typography Section */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <h2 className="text-xl font-bold text-white mb-4">Typography</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Heading Font</label>
                      <select
                        value={groupTheme.heading_font}
                        onChange={(e) => setGroupTheme({...groupTheme, heading_font: e.target.value})}
                        className="w-full px-4 py-2 rounded text-white"
                        style={{ backgroundColor: '#37322E' }}
                      >
                        <option value="Inter">Inter</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Merriweather">Merriweather</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Lora">Lora</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Used for titles and headings</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Body Font</label>
                      <select
                        value={groupTheme.body_font}
                        onChange={(e) => setGroupTheme({...groupTheme, body_font: e.target.value})}
                        className="w-full px-4 py-2 rounded text-white"
                        style={{ backgroundColor: '#37322E' }}
                      >
                        <option value="Inter">Inter</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Merriweather">Merriweather</option>
                        <option value="Lora">Lora</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Source Sans Pro">Source Sans Pro</option>
                        <option value="PT Serif">PT Serif</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Used for body text and paragraphs</p>
                    </div>
                  </div>
                </div>

                {/* Branding Assets Section */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <h2 className="text-xl font-bold text-white mb-4">Branding Assets</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={groupTheme.logo_url || ''}
                          onChange={(e) => setGroupTheme({...groupTheme, logo_url: e.target.value || null})}
                          placeholder="https://example.com/logo.png"
                          className="flex-1 px-4 py-2 rounded text-white"
                          style={{ backgroundColor: '#37322E' }}
                        />
                        <button
                          className="px-4 py-2 rounded text-white flex items-center gap-2"
                          style={{ backgroundColor: '#7C3306' }}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: PNG or SVG, max 200x60px</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Banner URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={groupTheme.banner_url || ''}
                          onChange={(e) => setGroupTheme({...groupTheme, banner_url: e.target.value || null})}
                          placeholder="https://example.com/banner.jpg"
                          className="flex-1 px-4 py-2 rounded text-white"
                          style={{ backgroundColor: '#37322E' }}
                        />
                        <button
                          className="px-4 py-2 rounded text-white flex items-center gap-2"
                          style={{ backgroundColor: '#7C3306' }}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: JPG or PNG, 1200x300px</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Favicon URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={groupTheme.favicon_url || ''}
                          onChange={(e) => setGroupTheme({...groupTheme, favicon_url: e.target.value || null})}
                          placeholder="https://example.com/favicon.ico"
                          className="flex-1 px-4 py-2 rounded text-white"
                          style={{ backgroundColor: '#37322E' }}
                        />
                        <button
                          className="px-4 py-2 rounded text-white flex items-center gap-2"
                          style={{ backgroundColor: '#7C3306' }}
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: ICO or PNG, 32x32px</p>
                    </div>
                  </div>
                </div>

                {/* Custom CSS Section */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <h2 className="text-xl font-bold text-white mb-4">Custom CSS</h2>
                  <p className="text-gray-300 text-sm mb-3">
                    Add custom CSS to further customize your group's appearance. Advanced users only.
                  </p>
                  <textarea
                    value={groupTheme.custom_css || ''}
                    onChange={(e) => setGroupTheme({...groupTheme, custom_css: e.target.value || null})}
                    placeholder=".my-custom-class { color: red; }"
                    rows={8}
                    className="w-full px-4 py-2 rounded text-white font-mono text-sm"
                    style={{ backgroundColor: '#37322E' }}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    ⚠️ Custom CSS will be applied globally to your group. Test carefully before saving.
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={async () => {
                    try {
                      const token = authService.getAccessToken()
                      const method = groupTheme.id ? 'PUT' : 'POST'
                      
                      const response = await fetch(`${API_URL}/api/v1/groups/${groupSlug}/theme`, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(groupTheme)
                      })

                      if (response.ok) {
                        const updatedTheme = await response.json()
                        setGroupTheme(updatedTheme)
                        setSuccess('Theme saved successfully!')
                        setTimeout(() => setSuccess(null), 3000)
                      } else {
                        const error = await response.json()
                        setError(error.detail || 'Failed to save theme')
                        setTimeout(() => setError(null), 5000)
                      }
                    } catch (err) {
                      setError('Network error. Please try again.')
                      setTimeout(() => setError(null), 5000)
                    }
                  }}
                  className="w-full px-6 py-3 rounded-lg font-medium text-white"
                  style={{ backgroundColor: '#B34B0C' }}
                >
                  Save Theme
                </button>
              </div>

              {/* Live Preview - Right Column */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Live Preview</h2>
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div 
                    className="rounded-lg p-4 space-y-4"
                    style={{ backgroundColor: groupTheme.background_color }}
                  >
                    {/* Logo */}
                    {groupTheme.logo_url && (
                      <div className="mb-3">
                        <img 
                          src={groupTheme.logo_url} 
                          alt="Logo" 
                          className="h-10 object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      </div>
                    )}

                    {/* Banner */}
                    {groupTheme.banner_url && (
                      <div className="mb-4 rounded overflow-hidden">
                        <img 
                          src={groupTheme.banner_url} 
                          alt="Banner" 
                          className="w-full h-24 object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      </div>
                    )}

                    {/* Heading */}
                    <h3 
                      className="text-2xl font-bold mb-2"
                      style={{ 
                        color: groupTheme.text_color,
                        fontFamily: groupTheme.heading_font
                      }}
                    >
                      Your Group Name
                    </h3>

                    {/* Body Text */}
                    <p 
                      className="text-sm mb-3"
                      style={{ 
                        color: groupTheme.text_color,
                        fontFamily: groupTheme.body_font,
                        opacity: 0.9
                      }}
                    >
                      This is how your group content will look with the selected theme. The heading uses {groupTheme.heading_font} and body text uses {groupTheme.body_font}.
                    </p>

                    {/* Primary Button */}
                    <button 
                      className="px-4 py-2 rounded font-medium text-sm mb-2"
                      style={{ 
                        backgroundColor: groupTheme.primary_color,
                        color: '#FFFFFF'
                      }}
                    >
                      Primary Button
                    </button>

                    {/* Secondary Button */}
                    <button 
                      className="px-4 py-2 rounded font-medium text-sm ml-2"
                      style={{ 
                        backgroundColor: groupTheme.secondary_color,
                        color: '#FFFFFF'
                      }}
                    >
                      Secondary
                    </button>

                    {/* Accent Link */}
                    <p className="text-sm mt-3">
                      <a 
                        href="#"
                        style={{ color: groupTheme.accent_color }}
                        className="font-medium"
                        onClick={(e) => e.preventDefault()}
                      >
                        Accent link
                      </a>
                    </p>

                    {/* Color Swatches */}
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: groupTheme.text_color, opacity: 0.2 }}>
                      <p className="text-xs mb-2" style={{ color: groupTheme.text_color, opacity: 0.7 }}>Color Palette:</p>
                      <div className="flex gap-2">
                        <div 
                          className="w-8 h-8 rounded border-2 border-white/20"
                          style={{ backgroundColor: groupTheme.primary_color }}
                          title="Primary"
                        />
                        <div 
                          className="w-8 h-8 rounded border-2 border-white/20"
                          style={{ backgroundColor: groupTheme.secondary_color }}
                          title="Secondary"
                        />
                        <div 
                          className="w-8 h-8 rounded border-2 border-white/20"
                          style={{ backgroundColor: groupTheme.accent_color }}
                          title="Accent"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Preview updates in real-time as you edit
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'moderation' && groupId && (
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <ModerationLog groupId={groupId} />
          </div>
        )}

        {activeTab === 'settings' && groupSettings && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
              <h2 className="text-xl font-bold text-white mb-4">Group Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Group Name</label>
                  <input
                    type="text"
                    value={groupSettings.name}
                    onChange={(e) => setGroupSettings({...groupSettings, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={groupSettings.description}
                    onChange={(e) => setGroupSettings({...groupSettings, description: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Privacy
                  </label>
                  <select
                    value={groupSettings.privacy}
                    onChange={(e) => setGroupSettings({...groupSettings, privacy: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                  >
                    <option value="public">Public - Anyone can see and join</option>
                    <option value="private">Private - Only members can see content</option>
                    <option value="invite-only">Invite Only - Must be invited to join</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={groupSettings.requires_approval}
                    onChange={(e) => setGroupSettings({...groupSettings, requires_approval: e.target.checked})}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: '#B34B0C' }}
                  />
                  <label className="text-sm text-gray-300">Require approval for new members</label>
                </div>

                {groupSettings.subdomain_requested && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                    <p className="text-sm font-medium text-gray-300 mb-1">Custom Subdomain</p>
                    <p className="text-white font-mono">{groupSettings.subdomain_requested}.workshelf.dev</p>
                    {groupSettings.subdomain_approved ? (
                      <span className="inline-block mt-2 px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#10B981' }}>
                        ✓ APPROVED
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-3 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#7C3306' }}>
                        PENDING STAFF APPROVAL
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={() => updateGroupSettings(groupSettings)}
                  className="w-full px-6 py-3 rounded-lg font-medium text-white"
                  style={{ backgroundColor: '#B34B0C' }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Manage Invitations</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                style={{ backgroundColor: '#B34B0C' }}
              >
                <UserPlus className="w-4 h-4" />
                Send Invitations
              </button>
            </div>

            {pendingInvitations.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 mb-2">No pending invitations</p>
                <p className="text-sm text-gray-500">Click "Send Invitations" to invite members to your group</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 rounded-lg flex items-center justify-between"
                    style={{ backgroundColor: '#37322E' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-white font-medium">{invitation.email}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: '#7C3306', color: '#FFF' }}>
                          {invitation.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 ml-7">
                        Invited by {invitation.inviter_name} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </div>
                      {invitation.message && (
                        <div className="text-sm text-gray-300 ml-7 mt-1 italic">
                          "{invitation.message}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => revokeInvitation(invitation.id)}
                      className="px-3 py-1.5 rounded text-sm font-medium text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: '#DC2626' }}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && groupId && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
              <h2 className="text-xl font-bold text-white mb-6">Group Analytics</h2>
              
              {loadingAnalytics ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                  <p className="text-gray-400">Loading analytics...</p>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Followers</span>
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {analyticsData.followers?.total || 0}
                      </div>
                      <div className="text-xs" style={{ color: analyticsData.followers?.new > 0 ? '#10B981' : '#6B7280' }}>
                        {analyticsData.followers?.new > 0 && '+'}{analyticsData.followers?.new || 0} new
                      </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Members</span>
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {analyticsData.members?.total || 0}
                      </div>
                      <div className="text-xs" style={{ color: analyticsData.members?.new > 0 ? '#10B981' : '#6B7280' }}>
                        {analyticsData.members?.new > 0 && '+'}{analyticsData.members?.new || 0} new
                      </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Posts</span>
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {analyticsData.posts?.total || 0}
                      </div>
                      <div className="text-xs" style={{ color: analyticsData.posts?.new > 0 ? '#10B981' : '#6B7280' }}>
                        {analyticsData.posts?.new > 0 && '+'}{analyticsData.posts?.new || 0} new
                      </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Engagement</span>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {(analyticsData.engagement?.comments || 0) + 
                         (analyticsData.engagement?.reactions || 0) + 
                         (analyticsData.engagement?.shares || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {analyticsData.engagement?.comments || 0} comments, {analyticsData.engagement?.reactions || 0} reactions
                      </div>
                    </div>
                  </div>

                  {/* Growth Rate Cards */}
                  {analyticsData.growth_rates && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                        <div className="text-sm text-gray-400 mb-1">Follower Growth</div>
                        <div className="text-lg font-bold" style={{ color: analyticsData.growth_rates.followers >= 0 ? '#10B981' : '#EF4444' }}>
                          {analyticsData.growth_rates.followers >= 0 && '+'}{analyticsData.growth_rates.followers.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                        <div className="text-sm text-gray-400 mb-1">Member Growth</div>
                        <div className="text-lg font-bold" style={{ color: analyticsData.growth_rates.members >= 0 ? '#10B981' : '#EF4444' }}>
                          {analyticsData.growth_rates.members >= 0 && '+'}{analyticsData.growth_rates.members.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                        <div className="text-sm text-gray-400 mb-1">Post Growth</div>
                        <div className="text-lg font-bold" style={{ color: analyticsData.growth_rates.posts >= 0 ? '#10B981' : '#EF4444' }}>
                          {analyticsData.growth_rates.posts >= 0 && '+'}{analyticsData.growth_rates.posts.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Posts */}
                  {analyticsData.top_posts && analyticsData.top_posts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-3">Top Posts</h3>
                      <div className="space-y-2">
                        {analyticsData.top_posts.map((post: any, index: number) => (
                          <div key={post.id} className="p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#37322E' }}>
                            <div className="text-2xl font-bold text-gray-500">#{index + 1}</div>
                            <div className="flex-1">
                              <div className="text-white font-medium mb-1">{post.title}</div>
                              <div className="text-sm text-gray-400">
                                {post.reaction_count || 0} reactions • {post.comment_count || 0} comments
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Globe className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p className="mb-2">No analytics data available</p>
                  <p className="text-sm text-gray-500">Analytics will appear once your group has some activity</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role Create/Edit Modal */}
        <RoleEditor
          isOpen={showRoleModal}
          onClose={() => {
            setShowRoleModal(false)
            setEditingRole(null)
          }}
          onSave={createOrUpdateRole}
          role={editingRole || undefined}
          existingRoles={roles}
        />
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
