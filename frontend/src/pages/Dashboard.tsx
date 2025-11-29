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
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 animate-pulse text-primary" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
      
      {/* Header */}
      <div className="border-b bg-card border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Analytics and insights for your published works</p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2 rounded-lg p-1 bg-muted">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '7d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '30d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === '90d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  timeRange === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
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
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.viewsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.viewsChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.viewsChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formatNumber(analytics.totalViews)}</p>
            <p className="text-sm text-muted-foreground">Total Views</p>
          </div>

          {/* Reads */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.readsChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.readsChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.readsChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formatNumber(analytics.totalReads)}</p>
            <p className="text-sm text-muted-foreground">Total Reads</p>
          </div>

          {/* Likes */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${analytics.likesChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {analytics.likesChange >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(analytics.likesChange)}%
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formatNumber(analytics.totalLikes)}</p>
            <p className="text-sm text-muted-foreground">Total Likes</p>
          </div>

          {/* Followers */}
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formatNumber(analytics.totalFollowers)}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Comments</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.totalComments)}</p>
          </div>

          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-3">
              <Download className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Downloads</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(analytics.totalDownloads)}</p>
          </div>

          <div className="p-6 rounded-lg border bg-card border-border">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
        </div>

        {/* Top Performing Works */}
        <div className="rounded-lg border bg-card border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Top Performing Works</h2>
            <p className="text-sm text-muted-foreground">Your most popular published works</p>
          </div>
          
          <div className="divide-y divide-border">
            {topWorks.length > 0 ? (
              topWorks.map((work, index) => (
                <div key={work.id} className="p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-3">{work.title}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Views</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{formatNumber(work.views)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Reads</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{formatNumber(work.reads)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Likes</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{formatNumber(work.likes)}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Comments</span>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{formatNumber(work.comments)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground mb-1">No published works yet</p>
                <p className="text-sm text-muted-foreground">Publish your first work to see analytics</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
