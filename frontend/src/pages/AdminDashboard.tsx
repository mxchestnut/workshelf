/**
 * Admin Dashboard - For group administrators
 * Manage groups, members, and content moderation
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { 
  Users, 
  Shield, 
  Flag,
  TrendingUp,
  UserCheck,
  MessageSquare,
  BookOpen,
  Settings,
  AlertCircle,
  Mail,
  Send,
  ShoppingBag,
  Wand2,
  X,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  CreditCard,
  ArrowUpCircle,
  Download
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

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

interface Invitation {
  id: number
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  created_at: string
  expires_at: string
  accepted_at?: string
}

interface PendingUser {
  id: number
  email: string
  username: string | null
  display_name: string | null
  created_at: string
}

interface CreatorEarnings {
  total_earnings_cents: number
  total_earnings_usd: number
  available_balance_cents: number
  available_balance_usd: number
  pending_balance_cents: number
  pending_balance_usd: number
  lifetime_payouts_cents: number
  lifetime_payouts_usd: number
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
}

interface Payout {
  id: number
  amount_cents: number
  amount_usd: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payout_method: string
  notes: string | null
  created_at: string
  processed_at: string | null
}

interface EarningsDashboard {
  earnings: CreatorEarnings
  recent_payouts: Payout[]
  available_for_payout_cents: number
  available_for_payout_usd: number
  minimum_payout_usd: number
}

interface AdminDashboardProps {
  embedded?: boolean  // When true, don't render Navigation (for use in Dashboard tabs)
}

export function AdminDashboard({ embedded = false }: AdminDashboardProps) {
  const { user, login, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [managedGroups, setManagedGroups] = useState<Group[]>([])
  // Default to site-admin tab if user is staff, otherwise overview
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'moderation' | 'site-admin' | 'creator-earnings'>('overview')
  const [isStaff, setIsStaff] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingUsersLoading, setPendingUsersLoading] = useState(false)
  const [earningsDashboard, setEarningsDashboard] = useState<EarningsDashboard | null>(null)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [stripeConnectStatus, setStripeConnectStatus] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allUsersLoading, setAllUsersLoading] = useState(false)
  const [siteStats, setSiteStats] = useState<any>(null)

  useEffect(() => {
    loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadUser = async () => {
    try {
      console.log('[AdminDashboard] Loading user...')
      console.log('[AdminDashboard] User loaded:', user)
      
      if (!user) {
        console.warn('[AdminDashboard] No user found, redirecting to login')
        setTimeout(() => {
          login()
        }, 100)
        return
      }


      // Check if user is staff or group admin
      const staffUser = user.is_staff || false
      setIsStaff(staffUser)

      // If staff user and accessing via /staff route, default to site-admin tab
      if (staffUser && window.location.pathname === '/staff') {
        setActiveTab('site-admin')
      }

      // Check if user is a group admin
      if (!staffUser && (!user.groups || user.groups.length === 0)) {
        console.warn('[AdminDashboard] User is not a group admin or staff')
        // Redirect to home or show error
        window.location.href = '/'
        return
      }

      loadAdminData()
    } catch (err) {
      console.error('[AdminDashboard] Error loading user:', err)
      setTimeout(() => {
        login()
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
          pending_requests: 0,
          total_posts: totalPosts,
          flagged_content: 0
        })
      }

      setLoading(false)
    } catch (error) {
      console.error('[AdminDashboard] Error loading admin data:', error)
      setLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading invitations:', error)
    }
  }

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || inviteLoading) return

    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setInviteMessage({ type: 'error', text: 'Not authenticated' })
        return
      }

      const response = await fetch(`${API_URL}/api/v1/invitations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail })
      })

      if (response.ok) {
        const invitation = await response.json()
        setInvitations([invitation, ...invitations])
        setInviteEmail('')
        setInviteMessage({ 
          type: 'success', 
          text: `Invitation sent to ${inviteEmail}. Share this link: ${window.location.origin}/invite/${invitation.token}` 
        })
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to send invitation' })
      }
    } catch (error) {
      console.error('[AdminDashboard] Error sending invitation:', error)
      setInviteMessage({ type: 'error', text: 'Failed to send invitation' })
    } finally {
      setInviteLoading(false)
    }
  }

  const revokeInvitation = async (invitationId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/invitations/${invitationId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setInvitations(invitations.map(inv => 
          inv.id === invitationId ? { ...inv, status: 'revoked' } : inv
        ))
      }
    } catch (error) {
      console.error('[AdminDashboard] Error revoking invitation:', error)
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setInviteMessage({ type: 'success', text: 'Invitation link copied to clipboard!' })
    setTimeout(() => setInviteMessage(null), 3000)
  }

  const loadPendingUsers = async () => {
    setPendingUsersLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingUsers(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading pending users:', error)
    } finally {
      setPendingUsersLoading(false)
    }
  }

  const loadAllUsers = async () => {
    setAllUsersLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading all users:', error)
    } finally {
      setAllUsersLoading(false)
    }
  }

  const loadSiteStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setSiteStats(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading site stats:', error)
    }
  }

  const approveUser = async (userId: number, approve: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approve })
      })

      if (response.ok) {
        // Remove from pending list
        setPendingUsers(pendingUsers.filter(u => u.id !== userId))
        setInviteMessage({ 
          type: 'success', 
          text: approve ? 'User approved successfully!' : 'User rejected successfully.' 
        })
        setTimeout(() => setInviteMessage(null), 3000)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error approving user:', error)
    }
  }

  const loadEarningsDashboard = async () => {
    setEarningsLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/creator/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setEarningsDashboard(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading earnings:', error)
    } finally {
      setEarningsLoading(false)
    }
  }

  const loadStripeConnectStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/creator/connect/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStripeConnectStatus(data)
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading Stripe Connect status:', error)
    }
  }

  const setupStripeConnect = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/creator/connect/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ country: 'US' })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Stripe onboarding
        window.location.href = data.onboarding_url
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to setup Stripe Connect' })
      }
    } catch (error) {
      console.error('[AdminDashboard] Error setting up Stripe Connect:', error)
      setInviteMessage({ type: 'error', text: 'Failed to setup Stripe Connect' })
    }
  }

  const requestPayout = async () => {
    if (!payoutAmount || payoutLoading) return
    
    const amountCents = Math.round(parseFloat(payoutAmount) * 100)
    
    if (amountCents < 1000) {
      setInviteMessage({ type: 'error', text: 'Minimum payout is $10.00' })
      return
    }

    setPayoutLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/creator/payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount_cents: amountCents,
          payout_method: 'stripe',
          notes: null
        })
      })

      if (response.ok) {
        setInviteMessage({ type: 'success', text: 'Payout requested successfully!' })
        setPayoutAmount('')
        // Reload earnings dashboard
        loadEarningsDashboard()
        setTimeout(() => setInviteMessage(null), 3000)
      } else {
        const error = await response.json()
        setInviteMessage({ type: 'error', text: error.detail || 'Failed to request payout' })
      }
    } catch (error) {
      console.error('[AdminDashboard] Error requesting payout:', error)
      setInviteMessage({ type: 'error', text: 'Failed to request payout' })
    } finally {
      setPayoutLoading(false)
    }
  }

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400'
      case 'processing': return 'text-blue-600 dark:text-blue-400'
      case 'pending': return 'text-yellow-600 dark:text-yellow-400'
      case 'failed': return 'text-red-600 dark:text-red-400'
      case 'cancelled': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-600'
    }
  }

  const getPayoutStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5" />
      case 'processing': return <Clock className="h-5 w-5 animate-spin" />
      case 'pending': return <Clock className="h-5 w-5" />
      case 'failed': return <XCircle className="h-5 w-5" />
      case 'cancelled': return <X className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  // Load invitations and pending users when Site Admin tab becomes active
  useEffect(() => {
    if (activeTab === 'site-admin' && isStaff) {
      if (invitations.length === 0) {
        loadInvitations()
      }
      loadPendingUsers()
      loadSiteStats()
      loadAllUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isStaff])

  // Load earnings dashboard when Creator Earnings tab becomes active
  useEffect(() => {
    if (activeTab === 'creator-earnings') {
      loadEarningsDashboard()
      loadStripeConnectStatus()
    }
     
  }, [activeTab])

  const navigateToGroup = (slug: string) => {
    window.location.href = `/groups/${slug}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {!embedded && (
          <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="admin" />
        )}
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {!embedded && (
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="admin" />
      )}
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      {/* Header */}
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">Manage your groups and community</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Moderation
              </div>
            </button>
            <button
              onClick={() => setActiveTab('creator-earnings')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'creator-earnings'
                  ? 'border-primary text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Creator Earnings
              </div>
            </button>
            {/* Site Admin tab - only for staff */}
            {isStaff && (
              <button
                onClick={() => setActiveTab('site-admin')}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === 'site-admin'
                    ? 'border-primary text-foreground font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Site Admin
                </div>
              </button>
            )}
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
              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.total_members || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.pending_requests || 0}</p>
                    <p className="text-sm text-muted-foreground">Pending Requests</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.total_posts || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Flag className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.flagged_content || 0}</p>
                    <p className="text-sm text-muted-foreground">Flagged Content</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab('groups')}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left bg-card border border-border"
                >
                  <Users className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Manage Groups</h3>
                  <p className="text-muted-foreground">View and manage your groups, approve members</p>
                </button>

                <button
                  onClick={() => setActiveTab('moderation')}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left bg-card border border-border"
                >
                  <Flag className="w-8 h-8 mb-3 text-primary" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">Review Reports</h3>
                  <p className="text-muted-foreground">Review flagged content and user reports</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Groups</h2>
              <button
                onClick={() => window.location.href = '/groups'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                View All Groups
              </button>
            </div>

            {managedGroups.length === 0 ? (
              <div className="text-center py-12 rounded-lg bg-card border border-border">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted" />
                <p className="text-lg font-semibold text-foreground mb-2">No groups yet</p>
                <p className="text-muted-foreground">You don't manage any groups currently</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {managedGroups.map(group => (
                  <div
                    key={group.id}
                    className="p-6 rounded-lg hover:opacity-90 transition-opacity cursor-pointer bg-card border border-border"
                    onClick={() => navigateToGroup(group.slug)}
                  >
                    <h3 className="text-xl font-bold text-foreground mb-2">{group.name}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{group.member_count} members</span>
                      <span>{group.post_count} posts</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigateToGroup(group.slug)
                      }}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
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
            <h2 className="text-2xl font-bold text-foreground mb-6">Content Moderation</h2>
            
            <div className="text-center py-12 rounded-lg bg-card border border-border">
              <Flag className="w-16 h-16 mx-auto mb-4 text-muted" />
              <p className="text-lg font-semibold text-foreground mb-2">No flagged content</p>
              <p className="text-muted-foreground">All clear! No reports to review at this time.</p>
            </div>
          </div>
        )}

        {/* Site Admin Tab - Staff Only */}
        {activeTab === 'site-admin' && isStaff && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Site Administration</h2>
              <a
                href="https://auth.nerdchurchpartners.org/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Open Keycloak Console
              </a>
            </div>

            {/* Site-Wide Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{siteStats?.total_users || allUsers.length || '...'}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{siteStats?.total_documents || '...'}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{siteStats?.total_groups || managedGroups.length}</p>
                <p className="text-sm text-muted-foreground">Total Groups</p>
              </div>

              <div className="p-6 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-1">{allUsers.filter((u: any) => u.is_staff).length || '...'}</p>
                <p className="text-sm text-muted-foreground">Active Staff</p>
              </div>
            </div>

            {/* Invite Users */}
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Invite Users
              </h3>
              
              <form onSubmit={sendInvitation} className="mb-6">
                <div className="flex gap-4">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="flex-1 px-4 py-2 rounded-lg text-foreground placeholder-muted-foreground border-2 border-input bg-background focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={inviteLoading || !inviteEmail}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>

              {inviteMessage && (
                <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
                  inviteMessage.type === 'success' ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                }`}>
                  <p className="text-white text-sm">{inviteMessage.text}</p>
                  <button
                    onClick={() => setInviteMessage(null)}
                    className="text-white hover:opacity-80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold text-foreground mb-2">Recent Invitations</h4>
                {invitations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invitations sent yet</p>
                ) : (
                  invitations.slice(0, 10).map(invitation => (
                    <div
                      key={invitation.id}
                      className="p-4 rounded-lg border-2 flex items-center justify-between border-border bg-background"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{invitation.email}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {invitation.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                            {invitation.status === 'accepted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {invitation.status === 'expired' && <XCircle className="w-4 h-4 text-gray-500" />}
                            {invitation.status === 'revoked' && <XCircle className="w-4 h-4 text-red-500" />}
                            {invitation.status}
                          </span>
                          <span>Sent {new Date(invitation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => copyInviteLink(invitation.token)}
                              className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
                            >
                              Copy Link
                            </button>
                            <button
                              onClick={() => revokeInvitation(invitation.id)}
                              className="px-3 py-1 border-2 border-border text-foreground text-sm rounded hover:border-destructive transition-colors"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending User Approvals */}
            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="w-6 h-6" />
                  Pending User Approvals
                  {pendingUsers.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {pendingUsers.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={loadPendingUsers}
                  disabled={pendingUsersLoading}
                  className="px-3 py-1 text-sm border-2 border-border text-foreground rounded hover:border-primary transition-colors disabled:opacity-50"
                >
                  {pendingUsersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="space-y-3">
                {pendingUsersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-muted-foreground">Loading pending users...</div>
                  </div>
                ) : pendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 text-muted" />
                    <p className="font-semibold text-foreground mb-1">No pending approvals</p>
                    <p className="text-sm text-muted-foreground">All users have been approved</p>
                  </div>
                ) : (
                  pendingUsers.map(user => (
                    <div
                      key={user.id}
                      className="p-4 rounded-lg border-2 flex items-center justify-between border-border bg-background"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{user.display_name || user.username || 'New User'}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{user.email}</span>
                          <span>Registered {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveUser(user.id, true)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to reject ${user.email}? This will delete their account.`)) {
                              approveUser(user.id, false)
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* All Users Management */}
            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  All Users
                  {allUsers.length > 0 && (
                    <span className="px-2 py-1 rounded-full text-sm font-semibold bg-background text-muted-foreground">
                      {allUsers.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={loadAllUsers}
                  disabled={allUsersLoading}
                  className="px-3 py-1 text-sm border-2 border-border text-foreground rounded hover:border-primary transition-colors disabled:opacity-50"
                >
                  {allUsersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {allUsersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse text-muted-foreground">Loading users...</div>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted" />
                  <p className="font-semibold text-foreground mb-1">No users found</p>
                  <p className="text-sm text-muted-foreground">User list will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allUsers.map((usr: any) => (
                    <div
                      key={usr.id}
                      className="p-4 rounded-lg border-2 border-border bg-background"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">
                              {usr.display_name || usr.username || 'Unnamed User'}
                            </p>
                            {usr.is_staff && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary text-primary-foreground">
                                STAFF
                              </span>
                            )}
                            {!usr.is_approved && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-600 text-white">
                                PENDING
                              </span>
                            )}
                            {!usr.is_active && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-600 text-white">
                                INACTIVE
                              </span>
                            )}
                            {usr.is_verified && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>{usr.email}</span>
                            {usr.username && <span>@{usr.username}</span>}
                            <span>ID: {usr.id}</span>
                            <span>Joined {new Date(usr.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!usr.is_staff && user?.id !== usr.id && (
                            <button
                              onClick={async () => {
                                if (confirm(`Make ${usr.email} a staff member?`)) {
                                  try {
                                    const token = localStorage.getItem('access_token')
                                    const response = await fetch(`${API_URL}/api/v1/admin/users/${usr.id}/make-staff`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                      }
                                    })
                                    
                                    if (response.ok) {
                                      alert(`${usr.email} is now a staff member`)
                                      loadUsers() // Reload the user list
                                    } else {
                                      const error = await response.json()
                                      alert(`Failed to make staff: ${error.detail || 'Unknown error'}`)
                                    }
                                  } catch (error) {
                                    console.error('Failed to make staff:', error)
                                    alert('Failed to make staff member')
                                  }
                                }
                              }}
                              className="px-3 py-1 text-xs border-2 border-border text-foreground rounded hover:border-primary transition-colors"
                            >
                              Make Staff
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/staff/users'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <Users className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">Manage All Users</p>
                  <p className="text-sm text-muted-foreground">View and manage user accounts</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/groups'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <Users className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">View All Groups</p>
                  <p className="text-sm text-muted-foreground">Browse and manage all groups</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/moderation'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <Flag className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">Global Moderation</p>
                  <p className="text-sm text-muted-foreground">Review all flagged content</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/settings'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <Settings className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">System Settings</p>
                  <p className="text-sm text-muted-foreground">Configure site-wide settings</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/store'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <ShoppingBag className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">Store Analytics</p>
                  <p className="text-sm text-muted-foreground">Manage store and EPUB uploads</p>
                </button>

                <button
                  onClick={() => window.location.href = '/staff/ai-templates'}
                  className="p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left bg-background"
                >
                  <Wand2 className="w-6 h-6 mb-2 text-primary" />
                  <p className="font-semibold text-foreground">AI Template Review</p>
                  <p className="text-sm text-muted-foreground">Review AI-generated templates</p>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="text-xl font-bold text-foreground mb-4">Recent Site Activity</h3>
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted" />
                <p className="text-muted-foreground">Activity feed coming soon</p>
              </div>
            </div>
          </div>
        )}

        {/* Creator Earnings Tab */}
        {activeTab === 'creator-earnings' && (
          <div className="space-y-8">
            {earningsLoading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading earnings data...</div>
              </div>
            ) : (
              <>
                {/* Earnings Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          ${earningsDashboard?.earnings.total_earnings_usd.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Earnings</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-8 h-8" style={{ color: '#10b981' }} />
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          ${earningsDashboard?.earnings.available_balance_usd.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-8 h-8" style={{ color: '#f59e0b' }} />
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          ${earningsDashboard?.earnings.pending_balance_usd.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-8 h-8" style={{ color: '#6366f1' }} />
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          ${earningsDashboard?.earnings.lifetime_payouts_usd.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-sm text-muted-foreground">Lifetime Payouts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stripe Connect Status */}
                <div className="p-6 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-primary" />
                      Stripe Connect Status
                    </h3>
                    {stripeConnectStatus?.connected && stripeConnectStatus?.charges_enabled && (
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-600/20 text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    )}
                  </div>

                  {!stripeConnectStatus?.connected || !stripeConnectStatus?.charges_enabled ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border-2 border-yellow-600/30 bg-yellow-600/10">
                        <p className="text-sm text-yellow-200 mb-3">
                          To receive payouts, you need to connect your Stripe account. This allows us to securely transfer your earnings.
                        </p>
                        <button
                          onClick={setupStripeConnect}
                          className="px-6 py-3 rounded-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 bg-primary"
                        >
                          <ArrowUpCircle className="w-5 h-5" />
                          Connect Stripe Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-background">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Account ID</p>
                          <p className="text-foreground font-mono">{stripeConnectStatus.account_id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Payouts Enabled</p>
                          <p className={stripeConnectStatus.payouts_enabled ? 'text-green-400' : 'text-red-400'}>
                            {stripeConnectStatus.payouts_enabled ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Charges Enabled</p>
                          <p className={stripeConnectStatus.charges_enabled ? 'text-green-400' : 'text-red-400'}>
                            {stripeConnectStatus.charges_enabled ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Details Submitted</p>
                          <p className={stripeConnectStatus.details_submitted ? 'text-green-400' : 'text-red-400'}>
                            {stripeConnectStatus.details_submitted ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Request Payout */}
                {stripeConnectStatus?.connected && stripeConnectStatus?.payouts_enabled && (
                  <div className="p-6 rounded-lg bg-card border border-border">
                    <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <ArrowUpCircle className="w-6 h-6 text-primary" />
                      Request Payout
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm mb-2 text-muted-foreground">
                          Available for payout: <span className="text-foreground font-bold text-lg">
                            ${earningsDashboard?.available_for_payout_usd.toFixed(2) || '0.00'}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Minimum payout: ${earningsDashboard?.minimum_payout_usd.toFixed(2) || '10.00'}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-sm mb-2 block text-muted-foreground">
                            Payout Amount (USD)
                          </label>
                          <input
                            type="number"
                            min="10"
                            step="0.01"
                            value={payoutAmount}
                            onChange={(e) => setPayoutAmount(e.target.value)}
                            placeholder="10.00"
                            className="w-full px-4 py-2 rounded-lg bg-background border-2 border-input text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={requestPayout}
                            disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) < 10}
                            className="px-6 py-2 rounded-lg font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-primary"
                          >
                            {payoutLoading ? (
                              <>
                                <Clock className="w-5 h-5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Download className="w-5 h-5" />
                                Request Payout
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {inviteMessage && (
                        <div className={`p-3 rounded-lg ${
                          inviteMessage.type === 'success' 
                            ? 'bg-green-600/20 text-green-400' 
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          <p className="text-sm">{inviteMessage.text}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payout History */}
                <div className="p-6 rounded-lg bg-card border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Payout History
                  </h3>

                  {!earningsDashboard?.recent_payouts || earningsDashboard.recent_payouts.length === 0 ? (
                    <div className="text-center py-8">
                      <Download className="w-12 h-12 mx-auto mb-3 text-muted" />
                      <p className="font-semibold text-foreground mb-1">No payouts yet</p>
                      <p className="text-sm text-muted-foreground">
                        Your payout history will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {earningsDashboard.recent_payouts.map((payout) => (
                        <div
                          key={payout.id}
                          className="p-4 rounded-lg border-2 flex items-center justify-between border-border bg-background"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-lg font-bold text-foreground">
                                ${payout.amount_usd.toFixed(2)}
                              </p>
                              <div className={`flex items-center gap-1 ${getPayoutStatusColor(payout.status)}`}>
                                {getPayoutStatusIcon(payout.status)}
                                <span className="text-sm font-medium capitalize">{payout.status}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Method: {payout.payout_method}</span>
                              <span>Requested {new Date(payout.created_at).toLocaleDateString()}</span>
                              {payout.processed_at && (
                                <span>Processed {new Date(payout.processed_at).toLocaleDateString()}</span>
                              )}
                            </div>
                            {payout.notes && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                Note: {payout.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-lg border-2 border-blue-600/30 bg-blue-600/10">
                  <h4 className="font-medium text-blue-200 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    About Creator Earnings
                  </h4>
                  <ul className="space-y-1 text-sm text-blue-300">
                    <li>• Earnings are tracked from book sales, premium content, and other monetization features</li>
                    <li>• Minimum payout is $10.00 USD</li>
                    <li>• Payouts are processed via Stripe Connect</li>
                    <li>• Processing typically takes 2-5 business days</li>
                    <li>• You can request payouts at any time once your available balance meets the minimum</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
