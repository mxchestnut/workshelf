import { useEffect, useState } from 'react'
import { Search, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface SearchResult {
  id: number
  type: 'document' | 'user' | 'studio'
  title: string
  description?: string
  url: string
  relevance_score: number
}

export function AdvancedSearch() {
  const [q, setQ] = useState('')
  const [type, setType] = useState<'document' | 'user' | 'studio' | 'all'>('all')
  const [includeTags, setIncludeTags] = useState<string>('')
  const [excludeTags, setExcludeTags] = useState<string>('')
  const [requireAllTags, setRequireAllTags] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

  useEffect(() => {
    // Run search when filters change and query is non-empty
    if (q.trim().length > 0) {
      runSearch()
    } else {
      setResults([])
      setTotal(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, includeTags, excludeTags, requireAllTags, page, pageSize])

  const parseTags = (s: string) => (
    s
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  )

  const runSearch = async () => {
    try {
      setLoading(true)
      setError(null)

      const authAccounts = JSON.parse(localStorage.getItem(`msal.account.keys`) || `[]`);
      const token = (authAccounts.length > 0 ? localStorage.getItem(`msal.token.${authAccounts[0]}.accessToken`) : null) || localStorage.getItem('access_token')
      const body = {
        q,
        type,
        page,
        page_size: pageSize,
        include_tags: includeTags ? parseTags(includeTags) : undefined,
        exclude_tags: excludeTags ? parseTags(excludeTags) : undefined,
        require_all_tags: requireAllTags
      }

      const response = await fetch(`${API_URL}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Search failed' }))
        throw new Error(err.detail || 'Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Search</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Search published works, books, and public content across WorkShelf
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Keywords</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Search published works, books, tags..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={type}
                onChange={(e) => { setType(e.target.value as any); setPage(1); }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              >
                <option value="all">All</option>
                <option value="document">Documents</option>
                <option value="user">Users</option>
                <option value="studio">Studios</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Include Tags (comma-separated)</label>
              <input
                type="text"
                value={includeTags}
                onChange={(e) => { setIncludeTags(e.target.value); setPage(1); }}
                placeholder="e.g. poetry, sci-fi"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Exclude Tags</label>
              <input
                type="text"
                value={excludeTags}
                onChange={(e) => { setExcludeTags(e.target.value); setPage(1); }}
                placeholder="e.g. gore, spoilers"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2 mt-6 md:mt-0">
              <input
                id="require-all"
                type="checkbox"
                checked={requireAllTags}
                onChange={(e) => { setRequireAllTags(e.target.checked); setPage(1); }}
                className="w-4 h-4"
              />
              <label htmlFor="require-all" className="text-sm">Require all included tags</label>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {total} results
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Page Size</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-card border border-border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-muted-foreground">No results yet. Enter keywords to search.</div>
          ) : (
            <div className="divide-y divide-border">
              {results.map(r => (
                <a key={`${r.type}-${r.id}`} href={r.url} className="block p-6 hover:bg-accent">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground uppercase tracking-wide">{r.type}</div>
                      <div className="text-lg font-semibold">{r.title}</div>
                      {r.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Relevance: {r.relevance_score.toFixed(2)}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
