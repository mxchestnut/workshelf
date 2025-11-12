/**
 * MemberRoleManager Component
 * Interface to assign and remove custom roles from group members
 * Shows member list with role badges and multi-role assignment
 */
import { useState } from 'react'
import { Shield, X, Plus, Crown, Users, Ban, UserX } from 'lucide-react'

interface GroupRole {
  id: number
  name: string
  color: string | null
  position: number
}

interface GroupMember {
  id: number
  user_id: number
  role: 'owner' | 'admin' | 'moderator' | 'member'
  user?: {
    id: number
    email: string
    username?: string
  }
  custom_roles?: GroupRole[]
}

interface MemberRoleManagerProps {
  members: GroupMember[]
  roles: GroupRole[]
  onAssignRole: (memberId: number, roleId: number) => Promise<void>
  onRemoveRole: (memberId: number, roleId: number) => Promise<void>
  onBanMember?: (memberId: number) => Promise<void>
  onKickMember?: (memberId: number) => Promise<void>
  currentUserId?: number
  userPermissions?: {
    can_ban_members?: boolean
    can_kick_members?: boolean
  }
}

export function MemberRoleManager({ 
  members, 
  roles, 
  onAssignRole, 
  onRemoveRole,
  onBanMember,
  onKickMember,
  currentUserId,
  userPermissions = {}
}: MemberRoleManagerProps) {
  const [expandedMember, setExpandedMember] = useState<number | null>(null)
  const [assigningRole, setAssigningRole] = useState<{ memberId: number; roleId: number } | null>(null)
  const [showModerationMenu, setShowModerationMenu] = useState<number | null>(null)

  const getBaseRoleBadge = (role: string) => {
    const badges = {
      owner: { icon: Crown, label: 'Owner', color: '#FFD700' },
      admin: { icon: Shield, label: 'Admin', color: '#E74C3C' },
      moderator: { icon: Shield, label: 'Moderator', color: '#3498DB' },
      member: { icon: Users, label: 'Member', color: '#95A5A6' }
    }
    return badges[role as keyof typeof badges] || badges.member
  }

  const handleAssignRole = async (memberId: number, roleId: number) => {
    setAssigningRole({ memberId, roleId })
    try {
      await onAssignRole(memberId, roleId)
    } finally {
      setAssigningRole(null)
    }
  }

  const handleRemoveRole = async (memberId: number, roleId: number) => {
    setAssigningRole({ memberId, roleId })
    try {
      await onRemoveRole(memberId, roleId)
    } finally {
      setAssigningRole(null)
    }
  }

  const getMemberRoleIds = (member: GroupMember): number[] => {
    return member.custom_roles?.map(r => r.id) || []
  }

  const getAvailableRoles = (member: GroupMember): GroupRole[] => {
    const assignedRoleIds = getMemberRoleIds(member)
    return roles.filter(r => !assignedRoleIds.includes(r.id))
  }

  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No members to manage</p>
        </div>
      ) : (
        members.map((member) => {
          const baseRole = getBaseRoleBadge(member.role)
          const BaseIcon = baseRole.icon
          const isExpanded = expandedMember === member.id
          const availableRoles = getAvailableRoles(member)
          const assignedRoles = member.custom_roles || []

          return (
            <div
              key={member.id}
              className="p-4 rounded-lg bg-gray-800 border border-gray-700"
            >
              {/* Member Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: baseRole.color }}
                      >
                        {member.user?.username?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-white truncate">
                          {member.user?.username || member.user?.email || 'Unknown User'}
                        </p>
                        {member.user?.username && (
                          <p className="text-xs text-gray-400 truncate">
                            {member.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Badges */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Base Role Badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: baseRole.color }}
                    >
                      <BaseIcon className="h-3 w-3" />
                      {baseRole.label}
                    </span>

                    {/* Custom Role Badges */}
                    {assignedRoles.map((role) => (
                      <span
                        key={role.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white group"
                        style={{ backgroundColor: role.color || '#7289DA' }}
                      >
                        {role.name}
                        <button
                          onClick={() => handleRemoveRole(member.id, role.id)}
                          disabled={assigningRole?.memberId === member.id && assigningRole?.roleId === role.id}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Assign Role Button */}
                  {availableRoles.length > 0 && (
                    <button
                      onClick={() => setExpandedMember(isExpanded ? null : member.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Assign Role
                    </button>
                  )}
                  
                  {/* Moderation Actions - only show if user has permissions and target is not current user */}
                  {(userPermissions.can_kick_members || userPermissions.can_ban_members) && 
                   member.user_id !== currentUserId && (
                    <div className="relative">
                      <button
                        onClick={() => setShowModerationMenu(showModerationMenu === member.id ? null : member.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Moderate
                      </button>
                      
                      {showModerationMenu === member.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                          {userPermissions.can_kick_members && onKickMember && (
                            <button
                              onClick={() => {
                                setShowModerationMenu(null);
                                if (confirm(`Remove ${member.user?.username || member.user?.email} from the group?`)) {
                                  onKickMember(member.id);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-orange-400 hover:bg-gray-700 rounded-t-lg transition-colors"
                            >
                              <UserX className="h-4 w-4" />
                              <span>Kick Member</span>
                            </button>
                          )}
                          {userPermissions.can_ban_members && onBanMember && (
                            <button
                              onClick={() => {
                                setShowModerationMenu(null);
                                if (confirm(`Ban ${member.user?.username || member.user?.email} from the group? This will remove them and prevent rejoining.`)) {
                                  onBanMember(member.id);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-gray-700 rounded-b-lg transition-colors"
                            >
                              <Ban className="h-4 w-4" />
                              <span>Ban Member</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Role Assignment Dropdown */}
              {isExpanded && availableRoles.length > 0 && (
                <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-600">
                  <p className="text-xs text-gray-400 mb-2">Select a role to assign:</p>
                  <div className="space-y-1">
                    {availableRoles
                      .sort((a, b) => b.position - a.position)
                      .map((role) => (
                        <button
                          key={role.id}
                          onClick={() => handleAssignRole(member.id, role.id)}
                          disabled={assigningRole?.memberId === member.id && assigningRole?.roleId === role.id}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                        >
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: role.color || '#7289DA' }}
                          />
                          <span className="text-white text-sm font-medium">
                            {role.name}
                          </span>
                          <span className="text-gray-400 text-xs ml-auto">
                            Position: {role.position}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
