import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Plus, 
  Users, 
  MessageSquare, 
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface RoleplayProject {
  id: number
  title: string
  description?: string
  genre: string
  rating: string
  posting_order?: string
  dice_system?: string
  is_active: boolean
  owner_id: number
  created_at: string
  updated_at: string
}

export function RoleplaysList() {
  const [projects, setProjects] = useState<RoleplayProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [filterRating, setFilterRating] = useState<string>('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to view roleplays')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/roleplay/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load roleplays')
      }

      const data = await response.json()
      setProjects(data)
      setLoading(false)
    } catch (err) {
      console.error('Error loading roleplays:', err)
      setError('Failed to load roleplays')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }

  const getColorForGenre = (genre: string) => {
    const colors: Record<string, string> = {
      fantasy: 'from-purple-500 to-pink-500',
      scifi: 'from-blue-500 to-cyan-500',
      horror: 'from-red-500 to-orange-500',
      mystery: 'from-indigo-500 to-purple-500',
      romance: 'from-pink-500 to-rose-500',
      adventure: 'from-green-500 to-teal-500',
      historical: 'from-amber-500 to-yellow-500',
      modern: 'from-gray-500 to-slate-500',
      other: 'from-gray-400 to-gray-500'
    }
    return colors[genre.toLowerCase()] || colors.other
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesGenre = filterGenre === '' || project.genre === filterGenre
    const matchesRating = filterRating === '' || project.rating === filterRating
    
    return matchesSearch && matchesGenre && matchesRating
  })

  const genres = Array.from(new Set(projects.map(p => p.genre)))
  const ratings = Array.from(new Set(projects.map(p => p.rating)))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error}
          </h2>
          <button
            onClick={loadProjects}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Roleplay Studio
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create and manage your roleplays
              </p>
            </div>
            <Link
              to="/roleplay/new"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Roleplay
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roleplays..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>

            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Ratings</option>
              {ratings.map(rating => (
                <option key={rating} value={rating}>{rating}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || filterGenre || filterRating ? 'No roleplays found' : 'No roleplays yet'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filterGenre || filterRating
                ? 'Try adjusting your filters'
                : 'Create your first roleplay to get started!'}
            </p>
            <Link
              to="/roleplay/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Roleplay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <Link
                key={project.id}
                to={`/roleplay/${project.id}`}
                className="group"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full border border-gray-200 dark:border-gray-700">
                  {/* Gradient Header */}
                  <div className={`h-32 bg-gradient-to-r ${getColorForGenre(project.genre)} p-6 flex items-end`}>
                    <div className="w-full">
                      <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:underline">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded">
                          {project.genre}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium bg-white/20 backdrop-blur-sm text-white rounded">
                          {project.rating}
                        </span>
                        {!project.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {project.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                        {project.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      {project.posting_order && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Posting: {project.posting_order}</span>
                        </div>
                      )}
                      {project.dice_system && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Dice: {project.dice_system}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Clock className="w-4 h-4" />
                        <span>Updated {formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats */}
        {filteredProjects.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredProjects.length} of {projects.length} roleplay{projects.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
