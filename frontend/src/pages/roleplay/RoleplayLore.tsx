import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  BookOpen, 
  Plus, 
  ArrowLeft,
  Filter,
  Search,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { CreateLoreEntry } from './CreateLoreEntry'
import { LoreEntryDisplay } from '../../components/LoreEntryDisplay'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface RoleplayProject {
  id: number
  title: string
}

interface LoreEntry {
  id: number
  title: string
  content: any
  category: string
  tags: string[]
  is_public: boolean
  author: {
    id: number
    username: string
  }
  created_at: string
  updated_at: string
}

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All', icon: '📚' },
  { value: 'characters', label: 'Characters', icon: '👤' },
  { value: 'locations', label: 'Locations', icon: '🗺️' },
  { value: 'history', label: 'History', icon: '📜' },
  { value: 'magic', label: 'Magic/Powers', icon: '✨' },
  { value: 'items', label: 'Items/Artifacts', icon: '⚔️' },
  { value: 'factions', label: 'Factions/Groups', icon: '🏛️' },
  { value: 'events', label: 'Events', icon: '📅' },
  { value: 'other', label: 'Other', icon: '📝' },
]

export function RoleplayLore() {
  const { projectId } = useParams<{ projectId: string }>()
  
  const [project, setProject] = useState<RoleplayProject | null>(null)
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadLoreData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadLoreData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to view lore')
        setLoading(false)
        return
      }

      // Parse token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]))
      setCurrentUserId(payload.sub)

      // Load project details
      const projectResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!projectResponse.ok) {
        throw new Error('Failed to load project')
      }

      const projectData = await projectResponse.json()
      setProject(projectData)

      // Load lore entries
      const loreResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}/lore`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (loreResponse.ok) {
        const loreData = await loreResponse.json()
        setLoreEntries(loreData)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading lore:', err)
      setError('Failed to load lore entries')
      setLoading(false)
    }
  }

  const handleCreateLoreEntry = async (data: {
    title: string
    content: any
    category: string
    tags: string[]
    is_public: boolean
  }) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    const response = await fetch(
      `${API_URL}/api/v1/roleplay/projects/${projectId}/lore`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      throw new Error('Failed to create lore entry')
    }

    const newEntry = await response.json()
    setLoreEntries([newEntry, ...loreEntries])
    setShowCreateForm(false)
  }

  const handleDeleteLoreEntry = async (entryId: number) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(
        `${API_URL}/api/v1/roleplay/lore/${entryId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        setLoreEntries(loreEntries.filter(entry => entry.id !== entryId))
      }
    } catch (err) {
      console.error('Failed to delete lore entry:', err)
    }
  }

  const filteredEntries = loreEntries
    .filter(entry => {
      // Filter by category
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          entry.title.toLowerCase().includes(query) ||
          entry.tags.some(tag => tag.toLowerCase().includes(query))
        )
      }
      
      return true
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error || 'Project not found'}
          </h2>
          <Link
            to="/roleplays"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Back to Roleplays
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  to={`/roleplay/${projectId}`}
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Link>
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {project.title} - Lore
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Worldbuilding and reference materials
                  </p>
                </div>
              </div>
              
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Lore Entry</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-8">
            <CreateLoreEntry
              projectId={projectId!}
              onSubmit={handleCreateLoreEntry}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {!showCreateForm && (
          <>
            {/* Filters */}
            <div className="mb-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lore by title or tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <Filter className="h-5 w-5 text-gray-400 flex-shrink-0" />
                {CATEGORY_FILTERS.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors
                      ${selectedCategory === category.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lore Entries */}
            <div className="space-y-6">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No lore entries yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery || selectedCategory !== 'all'
                      ? 'No entries match your filters'
                      : 'Start documenting your world!'}
                  </p>
                  {!searchQuery && selectedCategory === 'all' && (
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create First Lore Entry</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredEntries.length} of {loreEntries.length} entries
                  </div>
                  {filteredEntries.map((entry) => (
                    <LoreEntryDisplay
                      key={entry.id}
                      entry={entry}
                      currentUserId={currentUserId ?? undefined}
                      onDelete={handleDeleteLoreEntry}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
