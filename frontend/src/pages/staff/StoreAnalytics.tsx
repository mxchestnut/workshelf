/**
 * Store Analytics - Staff only page for viewing sales data and managing store items
 */

import { useEffect, useState } from 'react'
import { Navigation } from '../../components/Navigation'
import { authService, User } from '../../services/auth'
import { 
  TrendingUp, DollarSign, ShoppingBag, Package,
  ArrowLeft, Plus, Search, Edit, Trash2
} from 'lucide-react'

interface StoreItem {
  id: number
  title: string
  author: string
  price: number
  sales_count: number
  revenue: number
  status: 'active' | 'inactive'
  created_at: string
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
      // TODO: Implement API endpoints
      // const token = localStorage.getItem('access_token')
      // const [statsRes, itemsRes] = await Promise.all([
      //   fetch(`${API_URL}/api/v1/admin/store/stats`, {
      //     headers: { 'Authorization': `Bearer ${token}` }
      //   }),
      //   fetch(`${API_URL}/api/v1/admin/store/items`, {
      //     headers: { 'Authorization': `Bearer ${token}` }
      //   })
      // ])
      
      // Mock data for now
      setStats({
        total_revenue: 12543.50,
        total_sales: 487,
        active_items: 142,
        avg_sale_price: 25.76
      })

      setItems([
        {
          id: 1,
          title: 'The Midnight Garden',
          author: 'Sarah Johnson',
          price: 29.99,
          sales_count: 45,
          revenue: 1349.55,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Quantum Dreams',
          author: 'Michael Chen',
          price: 34.99,
          sales_count: 38,
          revenue: 1329.62,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          title: 'Desert Winds',
          author: 'Elena Rodriguez',
          price: 24.99,
          sales_count: 52,
          revenue: 1299.48,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          title: 'City of Echoes',
          author: 'David Park',
          price: 19.99,
          sales_count: 31,
          revenue: 619.69,
          status: 'inactive',
          created_at: new Date().toISOString()
        }
      ])
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

  const handleAddItem = () => {
    console.log('Add new store item')
    // TODO: Open modal or navigate to add item page
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ backgroundColor: '#1C1917', minHeight: '100vh' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} />
      
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
                    <td className="py-3 px-4 text-white">
                      ${item.revenue.toFixed(2)}
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
                          onClick={() => console.log('Edit item', item.id)}
                          className="p-1 rounded hover:bg-[#524944] transition-colors"
                        >
                          <Edit className="w-4 h-4 text-[#B3B2B0]" />
                        </button>
                        <button
                          onClick={() => console.log('Delete item', item.id)}
                          className="p-1 rounded hover:bg-[#524944] transition-colors"
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
    </div>
  )
}
