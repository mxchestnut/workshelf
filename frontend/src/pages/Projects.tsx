import { useState, useEffect } from 'react'
import { 
  FolderOpen, 
  Users, 
  FileText, 
  Clock,
  MoreVertical,
  Briefcase,
  CheckCircle2,
  Plus
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Project {
  id: number
  name: string
  description: string
  document_count: number
  collaborator_count: number
  created_at: string
  updated_at: string
}

const colors = [
  'bg-blue-500',
  'bg-purple-500', 
  'bg-green-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-indigo-500'
]

const getColorForProject = (id: number) => colors[id % colors.length]

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  const diffInDays = diffInHours / 24
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`
  if (diffInDays < 7) return `${Math.floor(diffInDays)} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  return `${Math.floor(diffInDays / 30)} months ago`
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to view your projects')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.')
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        } else {
          setError('Unable to load your projects. Please try again.')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setProjects(data)
      setLoading(false)
    } catch (err) {
      console.error('Error loading projects:', err)
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const createNewProject = () => {
    // Navigate to project creation
    window.location.href = '/projects/new'
  }

  const openProject = (projectId: number) => {
    window.location.href = `/project/${projectId}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-md border border-neutral-light p-6 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
            <div className="flex gap-4 mb-4">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-error">{error}</p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Go Home
        </button>
      </div>
    )
  }

  const totalDocuments = projects.reduce((sum, p) => sum + p.document_count, 0)
  const avgProgress = projects.length > 0 ? 50 : 0 // TODO: Add real progress tracking

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Briefcase className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-80">Active</span>
          </div>
          <div className="text-3xl font-bold mb-1">{projects.length}</div>
          <div className="text-sm opacity-90">Projects</div>
        </div>

        <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-primary" />
            <span className="text-sm text-neutral">Total</span>
          </div>
          <div className="text-3xl font-bold text-neutral-darkest mb-1">{totalDocuments}</div>
          <div className="text-sm text-neutral">Documents</div>
        </div>

        <div className="bg-white border border-neutral-light p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <span className="text-sm text-neutral">Average</span>
          </div>
          <div className="text-3xl font-bold text-neutral-darkest mb-1">{avgProgress}%</div>
          <div className="text-sm text-neutral">Complete</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-neutral-light rounded-xl shadow-sm p-12 text-center">
          <FolderOpen className="w-16 h-16 text-neutral-light mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-darkest mb-2">No projects yet</h3>
          <p className="text-neutral mb-6">Start your writing journey by creating your first project!</p>
          <button
            onClick={createNewProject}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-light rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-light">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-darkest">Your Projects</h2>
              <button 
                onClick={createNewProject}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>

          <div className="divide-y divide-neutral-light">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="px-6 py-4 hover:bg-neutral-light/30 transition-colors cursor-pointer"
                onClick={() => openProject(project.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 ${getColorForProject(project.id)} rounded-lg flex items-center justify-center`}>
                      <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-neutral-darkest mb-1">{project.name}</h3>
                      <p className="text-sm text-neutral mb-3">{project.description || 'No description'}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-neutral mb-3">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {project.document_count} document{project.document_count !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {project.collaborator_count} collaborator{project.collaborator_count !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatRelativeTime(project.updated_at)}
                        </span>
                      </div>

                      {/* Progress bar removed - need backend support for actual progress tracking */}
                    </div>
                  </div>

                  <button 
                    className="p-2 hover:bg-neutral-light rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Show project menu
                    }}
                  >
                    <MoreVertical className="w-5 h-5 text-neutral" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
