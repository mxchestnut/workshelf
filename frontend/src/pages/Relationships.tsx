import React, { useEffect, useState } from 'react'
import { User, UserMinus, Loader2, RefreshCw } from 'lucide-react'
import { toast } from '../services/toast'

interface FollowerInfo {
  id: number
  email: string
  full_name?: string
  avatar_url?: string
  followed_at?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

const Relationships: React.FC = () => {
  const [followers, setFollowers] = useState<FollowerInfo[]>([])
  const [following, setFollowing] = useState<FollowerInfo[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(true)
  const [loadingFollowing, setLoadingFollowing] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadFollowers = async () => {
    setLoadingFollowers(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setFollowers([])
        return
      }
      const resp = await fetch(`${API_URL}/api/v1/relationships/followers`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (resp.ok) {
        const data = await resp.json()
        setFollowers(data.followers || [])
      } else {
        toast.error('Failed to load followers')
      }
    } catch (err) {
      console.error('Followers load error:', err)
      toast.error('Failed to load followers')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const loadFollowing = async () => {
    setLoadingFollowing(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setFollowing([])
        return
      }
      const resp = await fetch(`${API_URL}/api/v1/relationships/following`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (resp.ok) {
        const data = await resp.json()
        setFollowing(data.following || [])
      } else {
        toast.error('Failed to load following list')
      }
    } catch (err) {
      console.error('Following load error:', err)
      toast.error('Failed to load following list')
    } finally {
      setLoadingFollowing(false)
    }
  }

  const unfollow = async (userId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error('Login required')
        return
      }
      const resp = await fetch(`${API_URL}/api/v1/relationships/unfollow/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resp.ok) {
        toast.success('Unfollowed user')
        setFollowing(f => f.filter(u => u.id !== userId))
        // Optionally update followers list if reciprocal follow logic changes
      } else {
        toast.error('Failed to unfollow')
      }
    } catch (err) {
      console.error('Unfollow error:', err)
      toast.error('Failed to unfollow')
    }
  }

  const refreshLists = async () => {
    setRefreshing(true)
    await Promise.all([loadFollowers(), loadFollowing()])
    setRefreshing(false)
    toast.success('Lists refreshed')
  }

  useEffect(() => {
    loadFollowers()
    loadFollowing()
  }, [])

  const renderUser = (u: FollowerInfo, showUnfollow: boolean) => (
    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
      {u.avatar_url ? (
        <img src={u.avatar_url} alt={u.full_name || u.email} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{u.full_name || u.email}</div>
        {u.followed_at && <div className="text-xs text-gray-400">Since {new Date(u.followed_at).toLocaleDateString()}</div>}
      </div>
      <button
        onClick={() => window.location.href = `/users/${(u.email || '').split('@')[0]}`}
        className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
      >View</button>
      {showUnfollow && (
        <button
          onClick={() => unfollow(u.id)}
          className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-1"
        >
          <UserMinus className="w-3 h-3" /> Unfollow
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Relationships</h1>
          <button
            onClick={refreshLists}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Followers */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Followers</h2>
            {loadingFollowers ? (
              <div className="p-6 text-center text-gray-400">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                Loading followers...
              </div>
            ) : (
              <div className="space-y-3">
                {followers.map(u => renderUser(u, false))}
                {followers.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No followers yet</div>}
              </div>
            )}
          </div>

          {/* Following */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Following</h2>
            {loadingFollowing ? (
              <div className="p-6 text-center text-gray-400">
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                Loading following...
              </div>
            ) : (
              <div className="space-y-3">
                {following.map(u => renderUser(u, true))}
                {following.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">Not following anyone yet</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Relationships
