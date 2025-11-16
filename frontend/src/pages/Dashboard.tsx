/**
 * Dashboard Page - Personal writing analytics
 * Shows views, reads, likes, and performance metrics for published works
 */

import { useEffect, useState } from 'react'
import { authService, User } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { WritingStreakWidget } from '../components/WritingStreakWidget'
import { 
  TrendingUp, Eye, Heart, MessageCircle, Users,
  BookOpen, Download, DollarSign,
  BarChart3, ArrowUp, ArrowDown
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface AnalyticsData {
  totalViews: number
  totalReads: number
  totalLikes: number
  totalComments: number
  totalFollowers: number
  totalDownloads: number
  totalRevenue: number
  viewsChange: number
  readsChange: number
  likesChange: number
}

interface WorkStats {
  id: number
  title: string
  views: number
  reads: number
  likes: number
  comments: number
  lastUpdated: string
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalReads: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    viewsChange: 0,
    readsChange: 0,
    likesChange: 0
  })
  const [topWorks, setTopWorks] = useState<WorkStats[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      await loadAnalytics()
      await loadTopWorks()
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/api/v1/analytics/dashboard?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        console.error('Failed to load analytics:', response.status)
        // Set mock data for development
        setAnalytics({
          totalViews: 0,
          totalReads: 0,
          totalLikes: 0,
          totalComments: 0,
          totalFollowers: 0,
          totalDownloads: 0,
          totalRevenue: 0,
          viewsChange: 0,
          readsChange: 0,
          likesChange: 15.2
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const loadTopWorks = async () => {
    try {
      const token = authService.getToken()
      const response = await fetch(`${API_URL}/api/v1/analytics/top-works?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTopWorks(data)
      } else {
        console.error('Failed to load top works:', response.status)
        // No mock data - will show empty state
        setTopWorks([])
      }
    } catch (error) {
      console.error('Error loading top works:', error)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: '#B34B0C' }} />
            <p style={{ color: '#B3B2B0' }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
      
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">Dashboard</h1>
              <p style={{ color: '#B3B2B0' }}>Analytics and insights for your published works</p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2 rounded-lg p-1" style={{ backgroundColor: '#37322E' }}>
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '7d' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
                }`}
                style={{ backgroundColor: timeRange === '7d' ? '#B34B0C' : 'transparent' }}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '30d' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
                }`}
                style={{ backgroundColor: timeRange === '30d' ? '#B34B0C' : 'transparent' }}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '90d' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
                }`}
                style={{ backgroundColor: timeRange === '90d' ? '#B34B0C' : 'transparent' }}
              >
                90 Days
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === 'all' ? 'text-white' : 'text-[#B3B2B0] hover:text-white'
                }`}
                style={{ backgroundColor: timeRange === 'all' ? '#B34B0C' : 'transparent' }}
              >
                All Time
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Writing Streak Widget - Prominent at top */}
        <div className="mb-8">
          <WritingStreakWidget />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Views */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                <Eye className="w-6 h-6" style={{ color: '#B34B0C' }} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.viewsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.viewsChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.viewsChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatNumber(analytics.totalViews)}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Views</p>
          </div>

          {/* Reads */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                <BookOpen className="w-6 h-6" style={{ color: '#B34B0C' }} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.readsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.readsChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.readsChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatNumber(analytics.totalReads)}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Reads</p>
          </div>

          {/* Likes */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                <Heart className="w-6 h-6" style={{ color: '#B34B0C' }} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.likesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.likesChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.likesChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatNumber(analytics.totalLikes)}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Likes</p>
          </div>

          {/* Followers */}
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(179, 75, 12, 0.2)' }}>
                <Users className="w-6 h-6" style={{ color: '#B34B0C' }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatNumber(analytics.totalFollowers)}</p>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Followers</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-5 h-5" style={{ color: '#B34B0C' }} />
              <span className="font-medium text-white">Comments</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(analytics.totalComments)}</p>
          </div>

          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-3">
              <Download className="w-5 h-5" style={{ color: '#B34B0C' }} />
              <span className="font-medium text-white">Downloads</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(analytics.totalDownloads)}</p>
          </div>

          <div className="p-6 rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-5 h-5" style={{ color: '#B34B0C' }} />
              <span className="font-medium text-white">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
        </div>

        {/* Top Performing Works */}
        <div className="rounded-lg border" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
          <div className="p-6 border-b" style={{ borderColor: '#6C6A68' }}>
            <h2 className="text-xl font-bold text-white">Top Performing Works</h2>
            <p className="text-sm" style={{ color: '#B3B2B0' }}>Your most popular published works</p>
          </div>
          
          <div className="divide-y divide-[#6C6A68]">
            {topWorks.length > 0 ? (
              topWorks.map((work, index) => (
                <div key={work.id} className="p-6 hover:bg-[#37322E] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-bold" style={{ color: '#6C6A68' }}>
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-3">{work.title}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                            <span className="text-sm" style={{ color: '#B3B2B0' }}>Views</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{formatNumber(work.views)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                            <span className="text-sm" style={{ color: '#B3B2B0' }}>Reads</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{formatNumber(work.reads)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                            <span className="text-sm" style={{ color: '#B3B2B0' }}>Likes</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{formatNumber(work.likes)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="w-4 h-4" style={{ color: '#B3B2B0' }} />
                            <span className="text-sm" style={{ color: '#B3B2B0' }}>Comments</span>
                          </div>
                          <p className="text-lg font-semibold text-white">{formatNumber(work.comments)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
                <p className="font-medium text-white mb-1">No published works yet</p>
                <p className="text-sm" style={{ color: '#B3B2B0' }}>Publish your first work to see analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
