import React, { useEffect, useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  AlertCircle,
  Download,
  CreditCard
} from 'lucide-react'
import { toast } from '../services/toast'

interface CreatorEarnings {
  id: number
  user_id: number
  total_earned_cents: number
  pending_payout_cents: number
  paid_out_cents: number
  subscriber_count: number
  monthly_recurring_revenue_cents: number
  platform_fee_percentage: number
  stripe_connect_enabled: boolean
  total_earned_usd: string
  pending_payout_usd: string
  paid_out_usd: string
  mrr_usd: string
  available_for_payout_usd: string
  created_at: string
  updated_at: string
}

interface Payout {
  id: number
  amount_cents: number
  amount_usd: string
  fee_cents: number
  fee_usd: string
  net_amount_cents: number
  net_amount_usd: string
  currency: string
  payout_method: string
  status: string
  requested_at: string
  processed_at: string | null
  paid_at: string | null
  notes: string | null
  failure_reason: string | null
}

interface Dashboard {
  earnings: CreatorEarnings
  recent_payouts: Payout[]
  available_for_payout_cents: number
  available_for_payout_usd: number
  minimum_payout_usd: number
}

interface ConnectStatus {
  connected: boolean
  account_id?: string
  details_submitted?: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
}

const CreatorEarnings: React.FC = () => {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [connectLoading, setConnectLoading] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<'stripe' | 'paypal' | 'bank_transfer'>('stripe')
  const [payoutNotes, setPayoutNotes] = useState('')

  useEffect(() => {
    loadDashboard()
    loadConnectStatus()
    loadPayouts()
  }, [])

  const loadDashboard = async () => {
    try {
      const response = await fetch('/api/v1/creator/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboard(data)
      } else {
        toast.error('Failed to load earnings dashboard')
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      toast.error('Failed to load earnings dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadConnectStatus = async () => {
    try {
      const response = await fetch('/api/v1/creator/connect/status')
      if (response.ok) {
        const data = await response.json()
        setConnectStatus(data)
      }
    } catch (error) {
      console.error('Error loading connect status:', error)
    }
  }

  const loadPayouts = async () => {
    try {
      const response = await fetch('/api/v1/creator/payouts?limit=20')
      if (response.ok) {
        const data = await response.json()
        setPayouts(data)
      }
    } catch (error) {
      console.error('Error loading payouts:', error)
    }
  }

  const setupStripeConnect = async () => {
    setConnectLoading(true)
    try {
      const response = await fetch('/api/v1/creator/connect/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'US' })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.onboarding_url) {
          window.location.href = data.onboarding_url
        }
      } else {
        toast.error('Failed to setup Stripe Connect')
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error)
      toast.error('Failed to setup Stripe Connect')
    } finally {
      setConnectLoading(false)
    }
  }

  const requestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) < 10) {
      toast.error('Minimum payout amount is $10.00')
      return
    }

    setPayoutLoading(true)
    try {
      const amountCents = Math.round(parseFloat(payoutAmount) * 100)
      const response = await fetch('/api/v1/creator/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_cents: amountCents,
          payout_method: payoutMethod,
          notes: payoutNotes || null
        })
      })

      if (response.ok) {
        toast.success('Payout requested successfully')
        setShowPayoutModal(false)
        setPayoutAmount('')
        setPayoutNotes('')
        loadDashboard()
        loadPayouts()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to request payout')
      }
    } catch (error) {
      console.error('Error requesting payout:', error)
      toast.error('Failed to request payout')
    } finally {
      setPayoutLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[statusLower] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">
          <p>Failed to load earnings dashboard</p>
        </div>
      </div>
    )
  }

  const { earnings, available_for_payout_usd, minimum_payout_usd } = dashboard

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Creator Earnings</h1>
        <p className="text-gray-600">Track your earnings, manage payouts, and grow your creator business</p>
      </div>

      {/* Stripe Connect Setup Banner */}
      {!connectStatus?.connected && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Setup Stripe Connect</h3>
              <p className="text-blue-700 text-sm mb-3">
                Connect your Stripe account to receive payouts directly. It only takes a few minutes.
              </p>
            </div>
            <button
              onClick={setupStripeConnect}
              disabled={connectLoading}
              className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {connectLoading ? 'Setting up...' : 'Connect Stripe'}
            </button>
          </div>
        </div>
      )}

      {connectStatus?.connected && !connectStatus?.charges_enabled && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-1">Complete Stripe Setup</h3>
              <p className="text-yellow-700 text-sm">
                Your Stripe account needs additional information before you can receive payouts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Earned</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${earnings.total_earned_usd}</p>
          <p className="text-xs text-gray-500 mt-1">Lifetime earnings</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Available</p>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${available_for_payout_usd.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ready for payout</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">MRR</p>
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">${earnings.mrr_usd}</p>
          <p className="text-xs text-gray-500 mt-1">Monthly recurring</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Subscribers</p>
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{earnings.subscriber_count}</p>
          <p className="text-xs text-gray-500 mt-1">Active subscribers</p>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Earnings Breakdown</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total Earned</span>
              <span className="font-semibold text-gray-900">${earnings.total_earned_usd}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Paid Out</span>
              <span className="font-semibold text-green-600">${earnings.paid_out_usd}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Pending Payout</span>
              <span className="font-semibold text-blue-600">${earnings.pending_payout_usd}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Platform Fee</span>
              <span className="font-semibold text-gray-900">{(earnings.platform_fee_percentage * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Request Payout Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Payout</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Available for payout</p>
            <p className="text-2xl font-bold text-green-600">${available_for_payout_usd.toFixed(2)}</p>
          </div>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={available_for_payout_usd < minimum_payout_usd || !connectStatus?.payouts_enabled}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {!connectStatus?.payouts_enabled 
              ? 'Connect Stripe to Request Payout'
              : available_for_payout_usd < minimum_payout_usd
              ? `Minimum ${minimum_payout_usd.toFixed(2)} required`
              : 'Request Payout'
            }
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Minimum payout: ${minimum_payout_usd.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Payout History</h2>
        </div>
        <div className="overflow-x-auto">
          {payouts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Download className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No payouts yet</p>
              <p className="text-sm mt-1">Request your first payout when you have sufficient earnings</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map(payout => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payout.requested_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${payout.amount_usd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ${payout.fee_usd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${payout.net_amount_usd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {payout.payout_method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(payout.processed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Request Payout</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="10.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum: ${available_for_payout_usd.toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Method
              </label>
              <select
                value={payoutMethod}
                onChange={e => setPayoutMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={payoutNotes}
                onChange={e => setPayoutNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={requestPayout}
                disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) < 10}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {payoutLoading ? 'Requesting...' : 'Request Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreatorEarnings
