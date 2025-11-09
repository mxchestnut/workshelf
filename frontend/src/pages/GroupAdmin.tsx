/**
 * Group Admin Dashboard
 * Allows group owners to manage their group: members, settings, privacy, publications
 * Staff can access any group's admin dashboard
 */
import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { authService } from '../services/auth'
import { Users, Settings, Lock, FileText, CheckCircle, XCircle, UserPlus, Shield } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface GroupMember {
  id: number
  user_id: number
  username: string
  display_name: string
  email: string
  is_owner: boolean
  is_moderator: boolean
  joined_at: string
  status: 'active' | 'pending' | 'banned'
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
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [publications, setPublications] = useState<GroupPublication[]>([])
  const [roles, setRoles] = useState<GroupRole[]>([])
  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'settings' | 'publications'>('members')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null)

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

  if (!user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
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
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 rounded-full mx-auto" style={{ borderColor: '#B34B0C', borderTopColor: 'transparent' }} />
          <p className="text-gray-400 mt-4">Loading group data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={handleLogin} onLogout={handleLogout} currentPage="/admin" />
      
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white"
                style={{ backgroundColor: '#B34B0C' }}
              >
                <UserPlus className="w-5 h-5" />
                Invite Member
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
                    <p className="text-sm text-gray-400">{member.email}</p>
                    <p className="text-xs text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
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

        {/* Role Create/Edit Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>

              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const roleData: Partial<GroupRole> = {
                  name: formData.get('name') as string,
                  color: formData.get('color') as string || null,
                  position: parseInt(formData.get('position') as string) || 0,
                  can_delete_posts: formData.get('can_delete_posts') === 'on',
                  can_delete_comments: formData.get('can_delete_comments') === 'on',
                  can_pin_posts: formData.get('can_pin_posts') === 'on',
                  can_lock_threads: formData.get('can_lock_threads') === 'on',
                  can_manage_tags: formData.get('can_manage_tags') === 'on',
                  can_approve_members: formData.get('can_approve_members') === 'on',
                  can_kick_members: formData.get('can_kick_members') === 'on',
                  can_ban_members: formData.get('can_ban_members') === 'on',
                  can_invite_members: formData.get('can_invite_members') === 'on',
                  can_view_member_list: formData.get('can_view_member_list') === 'on',
                  can_approve_publications: formData.get('can_approve_publications') === 'on',
                  can_edit_publications: formData.get('can_edit_publications') === 'on',
                  can_feature_publications: formData.get('can_feature_publications') === 'on',
                  can_edit_group_info: formData.get('can_edit_group_info') === 'on',
                  can_manage_roles: formData.get('can_manage_roles') === 'on',
                  can_view_analytics: formData.get('can_view_analytics') === 'on',
                  can_export_data: formData.get('can_export_data') === 'on',
                }
                createOrUpdateRole(roleData)
              }}>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingRole?.name || ''}
                      required
                      className="w-full px-4 py-2 rounded-lg text-white"
                      style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                      placeholder="e.g., Editor, Moderator, Contributor"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Color (hex)</label>
                      <input
                        type="text"
                        name="color"
                        defaultValue={editingRole?.color || ''}
                        className="w-full px-4 py-2 rounded-lg text-white"
                        style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                        placeholder="#FF5733"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Position (hierarchy)</label>
                      <input
                        type="number"
                        name="position"
                        defaultValue={editingRole?.position || 0}
                        className="w-full px-4 py-2 rounded-lg text-white"
                        style={{ backgroundColor: '#37322E', borderColor: '#6C6A68' }}
                      />
                    </div>
                  </div>

                  {/* Permissions - Content Moderation */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                    <h3 className="text-sm font-semibold text-white mb-3">Content Moderation</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'can_delete_posts', label: 'Delete Posts' },
                        { name: 'can_delete_comments', label: 'Delete Comments' },
                        { name: 'can_pin_posts', label: 'Pin Posts' },
                        { name: 'can_lock_threads', label: 'Lock Threads' },
                        { name: 'can_manage_tags', label: 'Manage Tags' },
                      ].map(perm => (
                        <label key={perm.name} className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name={perm.name}
                            defaultChecked={editingRole ? editingRole[perm.name as keyof GroupRole] as boolean : false}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: '#B34B0C' }}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Permissions - Member Management */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                    <h3 className="text-sm font-semibold text-white mb-3">Member Management</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'can_approve_members', label: 'Approve Members' },
                        { name: 'can_kick_members', label: 'Kick Members' },
                        { name: 'can_ban_members', label: 'Ban Members' },
                        { name: 'can_invite_members', label: 'Invite Members' },
                        { name: 'can_view_member_list', label: 'View Member List' },
                      ].map(perm => (
                        <label key={perm.name} className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name={perm.name}
                            defaultChecked={editingRole ? editingRole[perm.name as keyof GroupRole] as boolean : perm.name === 'can_view_member_list'}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: '#B34B0C' }}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Permissions - Publishing */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                    <h3 className="text-sm font-semibold text-white mb-3">Publishing</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'can_approve_publications', label: 'Approve Publications' },
                        { name: 'can_edit_publications', label: 'Edit Publications' },
                        { name: 'can_feature_publications', label: 'Feature Publications' },
                      ].map(perm => (
                        <label key={perm.name} className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name={perm.name}
                            defaultChecked={editingRole ? editingRole[perm.name as keyof GroupRole] as boolean : false}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: '#B34B0C' }}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Permissions - Settings */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#37322E' }}>
                    <h3 className="text-sm font-semibold text-white mb-3">Settings & Administration</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'can_edit_group_info', label: 'Edit Group Info' },
                        { name: 'can_manage_roles', label: 'Manage Roles' },
                        { name: 'can_view_analytics', label: 'View Analytics' },
                        { name: 'can_export_data', label: 'Export Data' },
                      ].map(perm => (
                        <label key={perm.name} className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            name={perm.name}
                            defaultChecked={editingRole ? editingRole[perm.name as keyof GroupRole] as boolean : false}
                            className="w-4 h-4 rounded"
                            style={{ accentColor: '#B34B0C' }}
                          />
                          {perm.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleModal(false)
                      setEditingRole(null)
                    }}
                    className="flex-1 px-6 py-3 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#6C6A68' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#B34B0C' }}
                  >
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
