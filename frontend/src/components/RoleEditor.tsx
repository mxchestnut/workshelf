/**
 * RoleEditor Component
 * Modal for creating and editing Discord-style custom roles
 * Includes name, color picker, position/hierarchy, and permission toggles
 */
import { useState, useEffect } from 'react'
import { X, Palette, TrendingUp } from 'lucide-react'
import { RolePermissions } from './RolePermissions'

interface GroupRole {
  id?: number
  group_id?: number
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
}

interface RoleEditorProps {
  isOpen: boolean
  onClose: () => void
  onSave: (role: Partial<GroupRole>) => Promise<void>
  role?: GroupRole
  existingRoles: GroupRole[]
}

const DEFAULT_ROLE: Partial<GroupRole> = {
  name: '',
  color: '#7289DA', // Discord blue
  position: 0,
  can_delete_posts: false,
  can_delete_comments: false,
  can_pin_posts: false,
  can_lock_threads: false,
  can_manage_tags: false,
  can_approve_members: false,
  can_kick_members: false,
  can_ban_members: false,
  can_invite_members: false,
  can_view_member_list: true, // Default enabled
  can_approve_publications: false,
  can_edit_publications: false,
  can_feature_publications: false,
  can_edit_group_info: false,
  can_manage_roles: false,
  can_view_analytics: false,
  can_export_data: false
}

const PRESET_COLORS = [
  '#7289DA', // Discord Blurple
  '#99AAB5', // Discord Gray
  '#43B581', // Discord Green
  '#FAA61A', // Discord Yellow
  '#F04747', // Discord Red
  '#9B59B6', // Purple
  '#E91E63', // Pink
  '#FF6B6B', // Light Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Mint
  '#FFEAA7'  // Cream
]

export function RoleEditor({ isOpen, onClose, onSave, role, existingRoles }: RoleEditorProps) {
  const [formData, setFormData] = useState<Partial<GroupRole>>(DEFAULT_ROLE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when opening with new role or closing
  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData(role)
      } else {
        // Calculate next position
        const maxPosition = Math.max(...existingRoles.map(r => r.position), 0)
        setFormData({ ...DEFAULT_ROLE, position: maxPosition + 1 })
      }
      setError(null)
    }
  }, [isOpen, role, existingRoles])

  const updatePermission = (key: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    // Validation
    if (!formData.name?.trim()) {
      setError('Role name is required')
      return
    }

    if (formData.name.length > 100) {
      setError('Role name must be 100 characters or less')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const permissions = Object.keys(formData)
    .filter(key => key.startsWith('can_'))
    .reduce((acc, key) => {
      acc[key] = formData[key as keyof GroupRole] as boolean
      return acc
    }, {} as Record<string, boolean>)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {role ? 'Edit Role' : 'Create Role'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Role Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Beta Readers, Moderators, VIP Members"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.name?.length || 0}/100 characters
            </p>
          </div>

          {/* Color Picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Palette className="h-4 w-4" />
              Role Color
            </label>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="color"
                value={formData.color || '#7289DA'}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="h-10 w-20 rounded cursor-pointer border-2 border-gray-700"
              />
              <input
                type="text"
                value={formData.color || '#7289DA'}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="#7289DA"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                pattern="^#[0-9A-Fa-f]{6}$"
                maxLength={7}
              />
              <div 
                className="px-4 py-2 rounded-lg font-medium text-sm"
                style={{ backgroundColor: formData.color || '#7289DA', color: '#fff' }}
              >
                Preview
              </div>
            </div>
            {/* Preset Colors */}
            <div className="grid grid-cols-12 gap-2">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className="h-8 rounded border-2 transition-all hover:scale-110"
                  style={{ 
                    backgroundColor: color,
                    borderColor: formData.color === color ? '#fff' : 'transparent'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Position/Hierarchy */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <TrendingUp className="h-4 w-4" />
              Hierarchy Position
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={Math.max(...existingRoles.map(r => r.position), 10) + 1}
                value={formData.position || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) }))}
                className="flex-1"
              />
              <span className="text-white font-mono bg-gray-800 px-3 py-1 rounded">
                {formData.position || 0}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Higher numbers have more authority. Owner/Admin roles have highest priority.
            </p>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
            <RolePermissions
              permissions={permissions}
              onChange={updatePermission}
              disabled={saving}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-800/50">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name?.trim()}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
