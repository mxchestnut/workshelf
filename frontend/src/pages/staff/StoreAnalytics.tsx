/**
 * Store Analytics - Staff only page for viewing sales data and managing store items
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { authService, User } from '../../services/auth'
import { 
  TrendingUp, DollarSign, ShoppingBag, Package,
  ArrowLeft, Plus, Search, Edit, Trash2, Sparkles
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

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
  const [user, setUser] = useState<User | null>(null)
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
      const currentUser = await authService.getCurrentUser()
      if (!currentUser || !currentUser.is_staff) {
        window.location.href = '/'
        return
      }
      setUser(currentUser)
      await loadStoreData()
    } catch (error) {
      console.error('Access check failed:', error)
      window.location.href = '/'
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
    console.log('Add new store item')
    // TODO: Open modal or navigate to add item page
  }

  const handleGenerateAudiobook = async (itemId: number, title: string) => {
    if (!confirm(`Generate ElevenLabs audiobook for "${title}"?\n\nThis will:\n• Cost ~$120 for professional voice cloning\n• Take 1-2 hours to process\n• Upgrade book to immersive bundle at $11.99\n• Give original buyers free audiobook access`)) {
      return
    }

    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      // TODO: Implement backend endpoint POST /api/v1/admin/store/items/{itemId}/generate-audiobook
      console.log(`Queueing audiobook generation for item ${itemId}`)
      alert(`Audiobook generation queued for "${title}"!\n\nYou'll be notified when complete.`)
      // For now, just reload data
      await loadStoreData()
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
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
        <div className="ml-0 md:ml-80 transition-all duration-300">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading...</div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ backgroundColor: '#1C1917', minHeight: '100vh' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
      <div className="ml-0 md:ml-80 transition-all duration-300">
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/staff/settings'}
              className="p-2 rounded hover:bg-[#524944] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="w-8 h-8" style={{ color: '#B34B0C' }} />
                Store Analytics
              </h1>
              <p className="text-[#B3B2B0] mt-1">View sales data and manage store items</p>
            </div>
          </div>
          <button
            onClick={handleAddItem}
            className="px-4 py-2 rounded flex items-center gap-2 text-white font-semibold transition-colors"
            style={{ backgroundColor: '#B34B0C' }}
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {/* Audiobook Eligibility Alerts */}
        {eligibleForAudiobook.length > 0 && (
          <div className="mb-8 p-6 rounded-lg border-2" style={{ 
            backgroundColor: '#37322E', 
            borderColor: '#B34B0C' 
          }}>
            <div className="flex items-start gap-4">
              <Sparkles className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: '#B34B0C' }} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  🎉 {eligibleForAudiobook.length} {eligibleForAudiobook.length === 1 ? 'Book' : 'Books'} Ready for Immersive Upgrade!
                </h3>
                <p className="text-[#B3B2B0] mb-4">
                  The following {eligibleForAudiobook.length === 1 ? 'book has' : 'books have'} earned enough revenue ($120+) to fund premium ElevenLabs audiobook narration. 
                  Approve to generate immersive versions and upgrade to bundles at $11.99.
                </p>
                <div className="space-y-3">
                  {eligibleForAudiobook.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded" style={{ backgroundColor: '#524944' }}>
                      <div>
                        <p className="text-white font-semibold">{item.title}</p>
                        <p className="text-sm text-[#B3B2B0]">
                          {item.author} • {item.sales_count} sales • ${item.revenue.toFixed(2)} revenue
                        </p>
                      </div>
                      <button
                        onClick={() => handleGenerateAudiobook(item.id, item.title)}
                        className="px-4 py-2 rounded text-white font-semibold hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#B34B0C' }}
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
          <div className="p-6 rounded-lg" style={{ backgroundColor: '#37322E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#B3B2B0] text-sm">Total Revenue</span>
              <DollarSign className="w-5 h-5" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white">
              ${stats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#37322E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#B3B2B0] text-sm">Total Sales</span>
              <ShoppingBag className="w-5 h-5" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white">{stats.total_sales}</p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#37322E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#B3B2B0] text-sm">Active Items</span>
              <Package className="w-5 h-5" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white">{stats.active_items}</p>
          </div>

          <div className="p-6 rounded-lg" style={{ backgroundColor: '#37322E' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#B3B2B0] text-sm">Avg Sale Price</span>
              <TrendingUp className="w-5 h-5" style={{ color: '#B34B0C' }} />
            </div>
            <p className="text-3xl font-bold text-white">
              ${stats.avg_sale_price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Items Management */}
        <div className="p-6 rounded-lg" style={{ backgroundColor: '#37322E' }}>
          <h2 className="text-xl font-bold text-white mb-6">Store Items</h2>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B3B2B0]" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded text-white placeholder-[#B3B2B0]"
                style={{ backgroundColor: '#524944' }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'all' ? 'text-white' : 'text-[#B3B2B0]'
                }`}
                style={{ backgroundColor: filterStatus === 'all' ? '#B34B0C' : '#524944' }}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'active' ? 'text-white' : 'text-[#B3B2B0]'
                }`}
                style={{ backgroundColor: filterStatus === 'active' ? '#B34B0C' : '#524944' }}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-4 py-2 rounded font-semibold transition-colors ${
                  filterStatus === 'inactive' ? 'text-white' : 'text-[#B3B2B0]'
                }`}
                style={{ backgroundColor: filterStatus === 'inactive' ? '#B34B0C' : '#524944' }}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: '#524944' }}>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Title</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Author</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Price</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Sales</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Revenue</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Audiobook</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-[#B3B2B0] font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b" style={{ borderColor: '#524944' }}>
                    <td className="py-3 px-4 text-white">{item.title}</td>
                    <td className="py-3 px-4 text-[#B3B2B0]">{item.author}</td>
                    <td className="py-3 px-4 text-white">${item.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-white">{item.sales_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-white">${item.revenue.toFixed(2)}</span>
                        {!item.has_audiobook && item.revenue >= 60 && item.revenue < AUDIOBOOK_THRESHOLD && (
                          <span className="text-xs text-[#B34B0C] mt-1">
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
                          className="p-1 rounded hover:bg-[#524944] transition-colors"
                          title={item.status === 'active' ? 'Mark as inactive' : 'Mark as active'}
                        >
                          <Edit className="w-4 h-4 text-[#B3B2B0]" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.sales_count)}
                          className="p-1 rounded hover:bg-[#524944] transition-colors"
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
                <Package className="w-12 h-12 mx-auto mb-4" style={{ color: '#6C6A68' }} />
                <p className="text-[#B3B2B0]">No items found</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}\n    </div>
  )
}
