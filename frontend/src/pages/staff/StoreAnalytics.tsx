/**
 * Store Analytics - Staff only page for viewing sales data and managing store items
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navigation } from '../../components/Navigation'
import { useAuth } from "../../contexts/AuthContext"
import { 
  TrendingUp, DollarSign, ShoppingBag, Package,
  ArrowLeft, Plus, Search, Edit, Trash2, Sparkles
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

interface StoreItem {
  id: number
  title: string
  author: string
  price: number
  sales_count: number
  revenue: number
  status: 'active' | 'inactive'
  created_at: string
  has_audiobook: boolean
}

interface SalesStats {
  total_revenue: number
  total_sales: number
  active_items: number
  avg_sale_price: number
}

export function StoreAnalytics() {
  const { user, login, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SalesStats>({
    total_revenue: 0,
    total_sales: 0,
    active_items: 0,
    avg_sale_price: 0
  })
  const [items, setItems] = useState<StoreItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    checkAccess()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAccess = async () => {
    try {
      if (!user?.is_staff) {
        globalThis.location.href = '/'
        return
      }
      await loadStoreData()
    } catch (error) {
      console.error('Access check failed:', error)
      globalThis.location.href = '/'
    }
  }

  const loadStoreData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.error('No access token')
        setLoading(false)
        return
      }

      // Fetch stats and items in parallel
      const [statsRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/admin/store/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/v1/admin/store/items?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!statsRes.ok || !itemsRes.ok) {
        throw new Error('Failed to fetch store data')
      }

      const statsData = await statsRes.json()
      const itemsData = await itemsRes.json()

      setStats(statsData)
      setItems(itemsData.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author_name,
        price: item.price_usd,
        sales_count: item.total_sales,
        revenue: item.total_revenue,
        status: item.status,
        created_at: item.created_at
      })))
      
      setLoading(false)
    } catch (error) {
      console.error('Failed to load store data:', error)
      setLoading(false)
    }
  }

  const filteredItems = items
    .filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          item.title.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query)
        )
      }
      return true
    })

  // Books eligible for audiobook upgrade (hit $120 revenue threshold, no audiobook yet)
  const AUDIOBOOK_THRESHOLD = 120
  const eligibleForAudiobook = items.filter(
    item => !item.has_audiobook && item.revenue >= AUDIOBOOK_THRESHOLD
  )

  const handleAddItem = () => {
    navigate('/upload-book')
    // TODO: Open modal or navigate to add item page
  }

  const handleGenerateAudiobook = async (itemId: number, title: string) => {
    if (!confirm(`Generate ElevenLabs audiobook for "${title}"?\n\nThis will:\n• Cost ~$120 for professional voice cloning\n• Take 1-2 hours to process\n• Upgrade book to immersive bundle at $11.99\n• Give original buyers free audiobook access`)) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/store/items/${itemId}/generate-audiobook`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Audiobook generation queued for "${title}"!\n\nNote: ${data.note}\n\nYou'll be notified when the full implementation is complete.`)
        await loadStoreData()
      } else {
        const error = await response.json()
        alert(`Failed to queue audiobook generation: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to queue audiobook generation:', error)
      alert('Failed to queue audiobook generation')
    }
  }

  const handleToggleStatus = async (itemId: number, currentStatus: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/store/items/${itemId}/status?status=${newStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to update status')

      // Reload data
      await loadStoreData()
    } catch (error) {
      console.error('Failed to toggle status:', error)
      alert('Failed to update item status')
    }
  }

  const handleDeleteItem = async (itemId: number, salesCount: number) => {
    if (salesCount > 0) {
      alert(`Cannot delete item with ${salesCount} existing purchases. Mark as inactive instead.`)
      return
    }

    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/store/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) throw new Error('Failed to delete item')

      // Reload data
      await loadStoreData()
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-background min-h-screen">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => globalThis.location.href = '/staff/settings'}
              className="p-2 rounded hover:bg-card transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-primary" />
                Store Analytics
              </h1>
              <p className="text-muted-foreground mt-1">View sales data and manage store items</p>
            </div>
          </div>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 rounded flex items-center gap-2 text-primary-foreground font-semibold transition-colors bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Audiobook Eligibility Alerts */}
        {eligibleForAudiobook.length > 0 && (
          <div className="mb-8 p-6 rounded-lg border-2 bg-background border-primary">
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 flex-shrink-0 mt-1 text-primary" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                  🎉 {eligibleForAudiobook.length} {eligibleForAudiobook.length === 1 ? 'Book' : 'Books'} Ready for Immersive Upgrade!
                </h3>
                <p className="text-muted-foreground mb-4">
                  The following {eligibleForAudiobook.length === 1 ? 'book has' : 'books have'} earned enough revenue ($120+) to fund premium ElevenLabs audiobook narration. 
                  Approve to generate immersive versions and upgrade to bundles at $11.99.
                </p>
                <div className="space-y-3">
                  {eligibleForAudiobook.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded bg-card">
                      <div>
                        <p className="text-foreground font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.author} • {item.sales_count} sales • ${item.revenue.toFixed(2)} revenue
                        </p>
                      </div>
                      <button
                        onClick={() => handleGenerateAudiobook(item.id, item.title)}
                        className="px-4 py-2 rounded text-primary-foreground font-semibold hover:opacity-90 transition-opacity bg-primary"
                      >
                        Generate Audiobook
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Revenue</span>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              ${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Total Sales</span>
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.total_sales}</p>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Active Items</span>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.active_items}</p>
          </div>

          <div className="p-6 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Avg Sale Price</span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">
              ${stats.avg_sale_price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Items Management */}
        <div className="p-6 rounded-lg bg-card border border-border">
          <h2 className="text-xl font-bold text-foreground mb-6">Store Items</h2>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded text-foreground placeholder-muted-foreground bg-background border border-input"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'active' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'inactive' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Title</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Author</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Price</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Sales</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Revenue</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Audiobook</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-border">
                    <td className="py-3 px-4 text-foreground">{item.title}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.author}</td>
                    <td className="py-3 px-4 text-foreground">${item.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-foreground">{item.sales_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-foreground">${item.revenue.toFixed(2)}</span>
                        {!item.has_audiobook && item.revenue >= 60 && item.revenue < AUDIOBOOK_THRESHOLD && (
                          <span className="text-xs text-primary mt-1">
                            {Math.floor((item.revenue / AUDIOBOOK_THRESHOLD) * 100)}% to audiobook
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.has_audiobook ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                          Immersive
                        </span>
                      ) : item.revenue >= AUDIOBOOK_THRESHOLD ? (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Ready!
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-500/20 text-gray-400">
                          Ebook only
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          item.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(item.id, item.status)}
                          className="p-1 rounded hover:bg-card transition-colors"
                          title={item.status === 'active' ? 'Mark as inactive' : 'Mark as active'}
                        >
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.sales_count)}
                          className="p-1 rounded hover:bg-card transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted" />
                <p className="text-muted-foreground">No items found</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
