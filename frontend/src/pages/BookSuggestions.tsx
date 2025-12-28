import { useEffect, useState } from 'react'
import { BookOpen, Plus, Loader2, CheckCircle, XCircle, Clock, Save } from 'lucide-react'

interface Suggestion {
  id: number
  query: string
  title?: string
  author?: string
  isbn?: string
  reason?: string
  description?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string
  reviewed_at?: string
  admin_notes?: string
}

export function BookSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

  useEffect(() => {
    loadSuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`);
      const token = (authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null) || localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/book-suggestions`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to load suggestions')
      const data = await response.json()
      setSuggestions(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions')
    } finally {
      setLoading(false)
    }
  }

  const submitSuggestion = async () => {
    if (!query.trim()) return
    try {
      setSaving(true)
      setError(null)
      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`);
      const token = (authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null) || localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/book-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          query,
          title: title || undefined,
          author: author || undefined,
          isbn: isbn || undefined,
          reason: reason || undefined,
          description: description || undefined
        })
      })
      if (!response.ok) throw new Error('Failed to submit suggestion')
      // Reset form
      setQuery('')
      setTitle('')
      setAuthor('')
      setIsbn('')
      setReason('')
      setDescription('')
      await loadSuggestions()
    } catch (err: any) {
      setError(err.message || 'Failed to submit suggestion')
    } finally {
      setSaving(false)
    }
  }

  const statusBadge = (status: Suggestion['status']) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-green-500/10 text-green-600"><CheckCircle className="w-3 h-3" /> Approved</span>
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500/10 text-red-600"><XCircle className="w-3 h-3" /> Rejected</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3" /> Pending</span>
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Book Suggestions</h1>
        </div>

        {/* Suggestion Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5" /> Suggest a Book</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Search Query*</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title, author, or keywords"
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ISBN</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why should we add this?"
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={submitSuggestion}
              disabled={saving || !query.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Submit Suggestion
            </button>
          </div>
          {error && <div className="mt-3 text-red-500 text-sm">{error}</div>}
        </div>

        {/* My Suggestions */}
        <div className="bg-card border border-border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-muted-foreground">No suggestions yet. Submit your first one above.</div>
          ) : (
            <div className="divide-y divide-border">
              {suggestions.map(s => (
                <div key={s.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold">{s.title || s.query}</div>
                      <div className="text-sm text-muted-foreground">
                        {s.author ? s.author : s.description}
                      </div>
                      {s.reason && (
                        <div className="text-xs text-muted-foreground mt-1">Reason: {s.reason}</div>
                      )}
                    </div>
                    {statusBadge(s.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Submitted {new Date(s.created_at).toLocaleDateString()}
                    {s.reviewed_at && ` • Reviewed ${new Date(s.reviewed_at).toLocaleDateString()}`}
                  </div>
                  {s.admin_notes && (
                    <div className="text-xs text-muted-foreground mt-1">Admin notes: {s.admin_notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
