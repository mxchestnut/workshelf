import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Book, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Tag,
  Globe
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface LoreEntry {
  id: number
  title: string
  content: string
  category?: string | null
  tags?: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export function LoreWiki() {
  const { projectId } = useParams<{ projectId: string }>()
  const [entries, setEntries] = useState<LoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [selectedEntry, setSelectedEntry] = useState<LoreEntry | null>(null)

  useEffect(() => {
    loadEntries()
  }, [projectId])

  const loadEntries = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}/lore`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load lore entries')
      }

      const data = await response.json()
      setEntries(data)
      setLoading(false)
    } catch (err) {
      console.error('Error loading lore:', err)
      setError('Failed to load lore wiki')
      setLoading(false)
    }
  }

  const deleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lore entry?')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/roleplay/lore/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setEntries(entries.filter(e => e.id !== id))
        if (selectedEntry?.id === id) {
          setSelectedEntry(null)
        }
      }
    } catch (err) {
      console.error('Error deleting lore entry:', err)
      alert('Failed to delete lore entry')
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = searchQuery === '' ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesCategory = filterCategory === '' || entry.category === filterCategory

    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                to={`/roleplay/${projectId}`}
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Book className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Lore Wiki
                </h1>
              </div>
            </div>
            <Link
              to={`/roleplay/${projectId}/lore/new`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Link>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lore entries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {error}
            </h2>
            <button
              onClick={loadEntries}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Try Again
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || filterCategory ? 'No entries found' : 'No lore entries yet'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filterCategory
                ? 'Try adjusting your search or filters'
                : 'Create your first lore entry to build your world!'}
            </p>
            <Link
              to={`/roleplay/${projectId}/lore/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Entry
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Entries List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'Entry' : 'Entries'}
              </h2>
              <div className="space-y-2">
                {filteredEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedEntry?.id === entry.id
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {entry.title}
                    </h3>
                    {entry.category && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <Tag className="w-3 h-3" />
                        {entry.category}
                      </div>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                            +{entry.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.is_public && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Globe className="w-3 h-3" />
                        Public
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Entry Detail */}
            <div className="lg:col-span-2">
              {selectedEntry ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Entry Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">{selectedEntry.title}</h2>
                        {selectedEntry.category && (
                          <div className="flex items-center gap-2 text-blue-100">
                            <Tag className="w-4 h-4" />
                            <span className="text-sm">{selectedEntry.category}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to={`/roleplay/${projectId}/lore/${selectedEntry.id}/edit`}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => deleteEntry(selectedEntry.id)}
                          className="p-2 bg-white/20 hover:bg-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Entry Content */}
                  <div className="p-6">
                    <div className="prose dark:prose-invert max-w-none">
                      <div
                        className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
                      />
                    </div>

                    {/* Tags */}
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedEntry.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-4">
                        <span>
                          Created: {new Date(selectedEntry.created_at).toLocaleDateString()}
                        </span>
                        <span>
                          Updated: {new Date(selectedEntry.updated_at).toLocaleDateString()}
                        </span>
                        {selectedEntry.is_public && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Globe className="w-4 h-4" />
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Select an entry
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a lore entry from the list to view its details
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
