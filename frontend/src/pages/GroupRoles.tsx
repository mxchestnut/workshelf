/**
 * Group Roles Management Page
 * Discord-style custom roles with granular permissions
 */

import { useEffect, useState } from 'react'
import { useAuth } from "../contexts/AuthContext"
import { Navigation } from '../components/Navigation'
import { 
  Shield, Plus, Save, Trash2, GripVertical, ChevronDown, ChevronUp,
  FileText, Users, Settings
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Role {
  id: number
  group_id: number
  name: string
  color: string | null
  position: number
  // Content moderation
  can_delete_posts: boolean
  can_delete_comments: boolean
  can_pin_posts: boolean
  can_lock_threads: boolean
  can_manage_tags: boolean
  // Member management
  can_approve_members: boolean
  can_kick_members: boolean
  can_ban_members: boolean
  can_invite_members: boolean
  can_view_member_list: boolean
  // Publishing
  can_approve_publications: boolean
  can_edit_publications: boolean
  can_feature_publications: boolean
  // Settings
  can_edit_group_info: boolean
  can_manage_roles: boolean
  can_view_analytics: boolean
  can_export_data: boolean
  created_at: string
  updated_at: string
}

interface PermissionCategory {
  title: string
  icon: any
  permissions: {
    key: keyof Role
    label: string
    description: string
  }[]
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    title: 'Content Moderation',
    icon: Shield,
    permissions: [
      { key: 'can_delete_posts', label: 'Delete Posts', description: 'Remove posts from the group' },
      { key: 'can_delete_comments', label: 'Delete Comments', description: 'Remove comments from posts' },
      { key: 'can_pin_posts', label: 'Pin Posts', description: 'Pin important posts to the top' },
      { key: 'can_lock_threads', label: 'Lock Threads', description: 'Prevent further replies' },
      { key: 'can_manage_tags', label: 'Manage Tags', description: 'Create and edit content tags' },
    ]
  },
  {
    title: 'Member Management',
    icon: Users,
    permissions: [
      { key: 'can_approve_members', label: 'Approve Members', description: 'Accept membership requests' },
      { key: 'can_kick_members', label: 'Kick Members', description: 'Remove members from group' },
      { key: 'can_ban_members', label: 'Ban Members', description: 'Permanently ban members' },
      { key: 'can_invite_members', label: 'Invite Members', description: 'Send group invitations' },
      { key: 'can_view_member_list', label: 'View Member List', description: 'See all group members' },
    ]
  },
  {
    title: 'Publishing',
    icon: FileText,
    permissions: [
      { key: 'can_approve_publications', label: 'Approve Publications', description: 'Approve content for publishing' },
      { key: 'can_edit_publications', label: 'Edit Publications', description: 'Edit published content' },
      { key: 'can_feature_publications', label: 'Feature Publications', description: 'Highlight content as featured' },
    ]
  },
  {
    title: 'Group Settings',
    icon: Settings,
    permissions: [
      { key: 'can_edit_group_info', label: 'Edit Group Info', description: 'Modify group name, description, etc.' },
      { key: 'can_manage_roles', label: 'Manage Roles', description: 'Create and edit custom roles' },
      { key: 'can_view_analytics', label: 'View Analytics', description: 'Access group analytics and statistics' },
      { key: 'can_export_data', label: 'Export Data', description: 'Export group content and data' },
    ]
  },
]

const DEFAULT_COLORS = [
  '#ED4245', // Red
  '#F47FFF', // Pink
  '#EB459E', // Magenta
  '#FEE75C', // Yellow
  '#57F287', // Green
  '#5865F2', // Blurple
  '#3498DB', // Blue
  '#9B59B6', // Purple
  '#E67E22', // Orange
  '#95A5A6', // Gray
]

export default function GroupRoles() {
  // Remove useLocation line - it was added by mistake and not used
  const pathParts = location.pathname.split('/')
  const groupIdIndex = pathParts.indexOf('groups') + 1
  const groupId = groupIdIndex > 0 && groupIdIndex < pathParts.length 
    ? parseInt(pathParts[groupIdIndex])
    : null

  const { user, login, logout, getAccessToken } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Content Moderation']))

  useEffect(() => {
    loadUser()
    if (groupId) {
      loadRoles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  const loadUser = async () => {
    try {
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token || !groupId) return

      const response = await fetch(`${API_URL}/api/v1/groups/${groupId}/roles`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error('Error loading roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = () => {
    setIsCreating(true)
    setEditingRole({
      name: 'New Role',
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      position: roles.length > 0 ? Math.max(...roles.map(r => r.position)) + 1 : 0,
      can_delete_posts: false,
      can_delete_comments: false,
      can_pin_posts: false,
      can_lock_threads: false,
      can_manage_tags: false,
      can_approve_members: false,
      can_kick_members: false,
      can_ban_members: false,
      can_invite_members: false,
      can_view_member_list: true,
      can_approve_publications: false,
      can_edit_publications: false,
      can_feature_publications: false,
      can_edit_group_info: false,
      can_manage_roles: false,
      can_view_analytics: false,
      can_export_data: false,
    })
    setSelectedRole(null)
  }

  const handleEditRole = (role: Role) => {
    setEditingRole({ ...role })
    setSelectedRole(role)
    setIsCreating(false)
  }

  const handleSaveRole = async () => {
    if (!editingRole || !groupId) return

    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const url = isCreating
        ? `${API_URL}/api/v1/groups/${groupId}/roles`
        : `${API_URL}/api/v1/groups/${groupId}/roles/${selectedRole?.id}`

      const response = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingRole)
      })

      if (response.ok) {
        await loadRoles()
        setEditingRole(null)
        setSelectedRole(null)
        setIsCreating(false)
      }
    } catch (error) {
      console.error('Error saving role:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token || !groupId) return

      const response = await fetch(`${API_URL}/api/v1/groups/${groupId}/roles/${role.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        await loadRoles()
        if (selectedRole?.id === role.id) {
          setSelectedRole(null)
          setEditingRole(null)
        }
      }
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleAllPermissions = (category: PermissionCategory, value: boolean) => {
    if (!editingRole) return
    const updates: any = { ...editingRole }
    category.permissions.forEach(perm => {
      updates[perm.key] = value
    })
    setEditingRole(updates)
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading roles...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">

      <div className="pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#F1EEEB' }}>
              <Shield className="inline w-8 h-8 mr-2" />
              Custom Roles & Permissions
            </h1>
            <p style={{ color: '#B3B2B0' }}>
              Create custom roles with specific permissions. Members can have multiple roles.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="lg:col-span-1">
              <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: '#F1EEEB' }}>Roles</h2>
                  <button
                    onClick={handleCreateRole}
                    className="p-2 rounded hover:opacity-80"
                    style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      onClick={() => handleEditRole(role)}
                      className={`p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${
                        selectedRole?.id === role.id ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedRole?.id === role.id ? '#6C6A68' : '#2E2A27',
                        borderLeft: `4px solid ${role.color || '#B3B2B0'}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                          <span className="font-medium" style={{ color: '#F1EEEB' }}>
                            {role.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRole(role)
                          }}
                          className="p-1 rounded hover:bg-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#ED4245' }} />
                        </button>
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#B3B2B0' }}>
                        Position: {role.position}
                      </div>
                    </div>
                  ))}
                </div>

                {roles.length === 0 && (
                  <div className="text-center py-8" style={{ color: '#B3B2B0' }}>
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No custom roles yet</p>
                    <p className="text-xs">Click + to create one</p>
                  </div>
                )}
              </div>
            </div>

            {/* Role Editor */}
            <div className="lg:col-span-2">
              {editingRole ? (
                <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold" style={{ color: '#F1EEEB' }}>
                      {isCreating ? 'Create New Role' : 'Edit Role'}
                    </h2>
                    <button
                      onClick={handleSaveRole}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Role'}
                    </button>
                  </div>

                  {/* Role Name & Color */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#F1EEEB' }}>
                        Role Name
                      </label>
                      <input
                        type="text"
                        value={editingRole.name || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: '#2E2A27',
                          borderColor: '#6C6A68',
                          color: '#F1EEEB'
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#F1EEEB' }}>
                        Role Color
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {DEFAULT_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setEditingRole({ ...editingRole, color })}
                            className={`w-10 h-10 rounded-lg ${editingRole.color === color ? 'ring-2 ring-white' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#F1EEEB' }}>
                        Position (Higher = More Authority)
                      </label>
                      <input
                        type="number"
                        value={editingRole.position || 0}
                        onChange={(e) => setEditingRole({ ...editingRole, position: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: '#2E2A27',
                          borderColor: '#6C6A68',
                          color: '#F1EEEB'
                        }}
                      />
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-4">
                    {PERMISSION_CATEGORIES.map(category => {
                      const Icon = category.icon
                      const isExpanded = expandedCategories.has(category.title)
                      const allEnabled = category.permissions.every(p => editingRole[p.key])
                      const someEnabled = category.permissions.some(p => editingRole[p.key])

                      return (
                        <div key={category.title} className="border rounded-lg" style={{ borderColor: '#6C6A68' }}>
                          <div
                            onClick={() => toggleCategory(category.title)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:opacity-80"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5" style={{ color: '#EDAC53' }} />
                              <span className="font-medium" style={{ color: '#F1EEEB' }}>
                                {category.title}
                              </span>
                              <span className="text-xs" style={{ color: '#B3B2B0' }}>
                                ({category.permissions.filter(p => editingRole[p.key]).length}/{category.permissions.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleAllPermissions(category, !allEnabled)
                                }}
                                className="text-xs px-2 py-1 rounded hover:opacity-80"
                                style={{
                                  backgroundColor: someEnabled ? '#EDAC53' : '#2E2A27',
                                  color: someEnabled ? '#2E2A27' : '#B3B2B0'
                                }}
                              >
                                {allEnabled ? 'Disable All' : 'Enable All'}
                              </button>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" style={{ color: '#B3B2B0' }} />
                              ) : (
                                <ChevronDown className="w-5 h-5" style={{ color: '#B3B2B0' }} />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t p-4 space-y-3" style={{ borderColor: '#6C6A68' }}>
                              {category.permissions.map(permission => (
                                <label
                                  key={String(permission.key)}
                                  className="flex items-start gap-3 cursor-pointer hover:opacity-80"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editingRole[permission.key] as boolean || false}
                                    onChange={(e) => setEditingRole({
                                      ...editingRole,
                                      [permission.key]: e.target.checked
                                    })}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium" style={{ color: '#F1EEEB' }}>
                                      {permission.label}
                                    </div>
                                    <div className="text-xs" style={{ color: '#B3B2B0' }}>
                                      {permission.description}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg p-12 text-center" style={{ backgroundColor: '#524944' }}>
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#B3B2B0' }} />
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#F1EEEB' }}>
                    Select a role to edit
                  </h3>
                  <p style={{ color: '#B3B2B0' }}>
                    Choose a role from the list or create a new one
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
