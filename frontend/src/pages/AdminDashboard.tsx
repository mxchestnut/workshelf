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
  MessageSquare
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

export function AdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [managedGroups, setManagedGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'moderation'>('overview')

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

      // Check if user is a group admin
      if (!currentUser.groups || currentUser.groups.length === 0) {
        console.warn('[AdminDashboard] User is not a group admin')
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
          pending_requests: 0, // TODO: Get from API
          total_posts: totalPosts,
          flagged_content: 0 // TODO: Get from API
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('[AdminDashboard] Error loading admin data:', err)
      setLoading(false)
    }
  }

  const navigateToGroup = (slug: string) => {
    window.location.href = `/groups/${slug}`
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="admin" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="admin" />
      
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
      </div>
    </div>
  )
}
