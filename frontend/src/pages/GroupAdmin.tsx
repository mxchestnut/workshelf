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
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'publications'>('members')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      </div>
    </div>
  )
}
