/**
 * GroupActionButtons Component
 * Unified component for Join/Follow actions on groups
 * - Join: Become a full member (can post, comment)
 * - Follow: Subscribe to updates (without full membership)
 * - Auto-follows when joining
 * - Shows follower count
 */
import { useState } from 'react'
import { UserPlus, UserCheck, Heart, Users } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface GroupActionButtonsProps {
  groupId: number
  isMember: boolean
  isFollowing: boolean
  followerCount: number
  onMembershipChange?: (isMember: boolean) => void
  onFollowChange?: (isFollowing: boolean, newCount: number) => void
}

export function GroupActionButtons({
  groupId,
  isMember,
  isFollowing,
  followerCount,
  onMembershipChange,
  onFollowChange
}: GroupActionButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [localIsMember, setLocalIsMember] = useState(isMember)
  const [localIsFollowing, setLocalIsFollowing] = useState(isFollowing)
  const [localFollowerCount, setLocalFollowerCount] = useState(followerCount)

  const handleJoin = async () => {
    if (loading) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please log in to join this group')
        return
      }

      const response = await fetch(`${API_URL}/api/v1/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setLocalIsMember(true)
        onMembershipChange?.(true)
        
        // Auto-follow when joining
        if (!localIsFollowing) {
          await handleFollow()
        }
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to join group')
      }
    } catch (error) {
      console.error('Failed to join group:', error)
      alert('Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (loading) return
    
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please log in to follow this group')
        return
      }

      if (localIsFollowing) {
        // Unfollow
        const response = await fetch(`${API_URL}/api/v1/groups/${groupId}/follow`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          setLocalIsFollowing(false)
          const newCount = Math.max(0, localFollowerCount - 1)
          setLocalFollowerCount(newCount)
          onFollowChange?.(false, newCount)
        }
      } else {
        // Follow
        const response = await fetch(`${API_URL}/api/v1/groups/${groupId}/follow`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          setLocalIsFollowing(true)
          const newCount = localFollowerCount + 1
          setLocalFollowerCount(newCount)
          onFollowChange?.(true, newCount)
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
      alert('Failed to update follow status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Join Button - Only show if not a member */}
      {!localIsMember && (
        <button
          onClick={handleJoin}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          {loading ? 'Joining...' : 'Join Group'}
        </button>
      )}

      {/* Member Badge - Show if member */}
      {localIsMember && (
        <span className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-green-900/20 text-green-400 border border-green-700/50">
          <UserCheck className="h-4 w-4 mr-2" />
          Member
        </span>
      )}

      {/* Follow Button - Always available */}
      <button
        onClick={handleFollow}
        disabled={loading}
        className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          localIsFollowing
            ? 'bg-rose-900/20 text-rose-400 border-rose-700/50 hover:bg-rose-900/30'
            : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
        }`}
      >
        <Heart className={`h-4 w-4 mr-2 ${localIsFollowing ? 'fill-current' : ''}`} />
        {loading ? 'Loading...' : localIsFollowing ? 'Following' : 'Follow'}
      </button>

      {/* Follower Count */}
      <div className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700">
        <Users className="h-4 w-4 mr-2" />
        {localFollowerCount.toLocaleString()} {localFollowerCount === 1 ? 'follower' : 'followers'}
      </div>
    </div>
  )
}
