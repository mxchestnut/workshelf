import { useEffect, useState } from 'react'
import { Navigation } from '../components/Navigation'
import { User, authService } from '../services/auth'
import { Clock, CheckCircle, XCircle, Send, Inbox } from 'lucide-react'

interface BetaRequestItem {
  id: number
  document_title?: string
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
  created_at: string
  deadline?: string | null
  reader_display_name?: string
  author_display_name?: string
}

export default function MyBetaRequests() {
  const [user, setUser] = useState<User | null>(null)
  const [sent, setSent] = useState<BetaRequestItem[]>([])
  const [received, setReceived] = useState<BetaRequestItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const currentUser = await authService.getCurrentUser()
    setUser(currentUser)
    try {
      const token = await authService.getAccessToken()
      const s = await fetch('/api/v1/beta-requests/sent', { headers: { 'Authorization': `Bearer ${token}` } })
      if (s.ok) {
        const sd = await s.json()
        setSent(sd.requests || sd || [])
      }
      const r = await fetch('/api/v1/beta-requests/received', { headers: { 'Authorization': `Bearer ${token}` } })
      if (r.ok) {
        const rd = await r.json()
        setReceived(rd.requests || rd || [])
      }
    } catch (e) {
      // Ignore for now
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status: BetaRequestItem['status']) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-600',
      accepted: 'bg-green-600',
      declined: 'bg-red-600',
      completed: 'bg-blue-600',
      cancelled: 'bg-gray-600'
    }
    return <span className={`px-2 py-1 rounded text-xs text-white ${map[status]}`}>{status}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
        <div className="max-w-6xl mx-auto px-6 py-12 text-center text-foreground">Loading requests...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation user={user} onLogin={() => {}} onLogout={() => authService.logout()} />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-6">My Beta Requests</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Send className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Sent</span>
            </div>
            {sent.length === 0 ? (
              <p className="text-muted-foreground">No sent requests.</p>
            ) : (
              <div className="space-y-3">
                {sent.map(item => (
                  <div key={item.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-foreground font-medium">To: {item.reader_display_name || 'Beta Reader'}</div>
                      {statusBadge(item.status)}
                    </div>
                    <p className="text-muted-foreground mt-1">{item.document_title || 'Untitled Document'}</p>
                    {item.message && <p className="text-muted-foreground mt-1 line-clamp-2">{item.message}</p>}
                    <div className="text-xs text-muted-foreground mt-2">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Inbox className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Received</span>
            </div>
            {received.length === 0 ? (
              <p className="text-muted-foreground">No received requests.</p>
            ) : (
              <div className="space-y-3">
                {received.map(item => (
                  <div key={item.id} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-foreground font-medium">From: {item.author_display_name || 'Author'}</div>
                      {statusBadge(item.status)}
                    </div>
                    <p className="text-muted-foreground mt-1">{item.document_title || 'Untitled Document'}</p>
                    {item.message && <p className="text-muted-foreground mt-1 line-clamp-2">{item.message}</p>}
                    <div className="text-xs text-muted-foreground mt-2">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
