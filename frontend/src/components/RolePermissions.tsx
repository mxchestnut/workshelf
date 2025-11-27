/**
 * RolePermissions Component
 * 17 permission toggles organized by category for Discord-style role management
 * Categories: Content Moderation, Member Management, Publishing, Settings
 */
import { 
  Trash2, MessageSquare, Pin, Lock, Tag,
  UserCheck, UserX, Ban, UserPlus, Users,
  FileCheck, Edit3, Star,
  Settings, Shield, BarChart3, Download
} from 'lucide-react'

interface Permission {
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface PermissionCategory {
  name: string
  permissions: Permission[]
}

interface RolePermissionsProps {
  permissions: Record<string, boolean>
  onChange: (key: string, value: boolean) => void
  disabled?: boolean
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: 'Content Moderation',
    permissions: [
      {
        key: 'can_delete_posts',
        label: 'Delete Posts',
        description: 'Remove posts from the group',
        icon: Trash2
      },
      {
        key: 'can_delete_comments',
        label: 'Delete Comments',
        description: 'Remove comments on posts',
        icon: MessageSquare
      },
      {
        key: 'can_pin_posts',
        label: 'Pin Posts',
        description: 'Pin important posts to the top',
        icon: Pin
      },
      {
        key: 'can_lock_threads',
        label: 'Lock Threads',
        description: 'Prevent replies to posts',
        icon: Lock
      },
      {
        key: 'can_manage_tags',
        label: 'Manage Tags',
        description: 'Create and edit post tags',
        icon: Tag
      }
    ]
  },
  {
    name: 'Member Management',
    permissions: [
      {
        key: 'can_approve_members',
        label: 'Approve Members',
        description: 'Accept member join requests',
        icon: UserCheck
      },
      {
        key: 'can_kick_members',
        label: 'Kick Members',
        description: 'Remove members from the group',
        icon: UserX
      },
      {
        key: 'can_ban_members',
        label: 'Ban Members',
        description: 'Permanently ban members',
        icon: Ban
      },
      {
        key: 'can_invite_members',
        label: 'Invite Members',
        description: 'Send invitations to join',
        icon: UserPlus
      },
      {
        key: 'can_view_member_list',
        label: 'View Member List',
        description: 'See all group members',
        icon: Users
      }
    ]
  },
  {
    name: 'Publishing',
    permissions: [
      {
        key: 'can_approve_publications',
        label: 'Approve Publications',
        description: 'Approve content for publishing',
        icon: FileCheck
      },
      {
        key: 'can_edit_publications',
        label: 'Edit Publications',
        description: 'Edit published content',
        icon: Edit3
      },
      {
        key: 'can_feature_publications',
        label: 'Feature Publications',
        description: 'Mark content as featured',
        icon: Star
      }
    ]
  },
  {
    name: 'Settings & Administration',
    permissions: [
      {
        key: 'can_edit_group_info',
        label: 'Edit Group Info',
        description: 'Modify group settings and details',
        icon: Settings
      },
      {
        key: 'can_manage_roles',
        label: 'Manage Roles',
        description: 'Create and assign roles',
        icon: Shield
      },
      {
        key: 'can_view_analytics',
        label: 'View Analytics',
        description: 'Access group analytics',
        icon: BarChart3
      },
      {
        key: 'can_export_data',
        label: 'Export Data',
        description: 'Download group data',
        icon: Download
      }
    ]
  }
]

export function RolePermissions({ permissions, onChange, disabled = false }: RolePermissionsProps) {
  return (
    <div className="space-y-6">
      {PERMISSION_CATEGORIES.map((category) => (
        <div key={category.name}>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            {category.name}
          </h4>
          <div className="space-y-2">
            {category.permissions.map((permission) => {
              const Icon = permission.icon
              const isEnabled = permissions[permission.key] || false

              return (
                <label
                  key={permission.key}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/30'
                  }`}
                  style={{ backgroundColor: isEnabled ? '#37322E' : 'transparent' }}
                >
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => onChange(permission.key, e.target.checked)}
                    disabled={disabled}
                    className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-white text-sm">
                        {permission.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {permission.description}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
