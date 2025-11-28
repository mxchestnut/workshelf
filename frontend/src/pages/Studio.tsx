/**
 * Studio Page - Writer's workspace with projects, articles, and templates
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { 
  FileText, TrendingUp, 
  Zap, Layout, PenTool, Book, BookOpen, 
  ScrollText, Film, Feather, Library, 
  User, File, Users
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface Document {
  id: number
  title: string
  content: any
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'public' | 'studio'
  word_count: number
  created_at: string
  updated_at: string
}

interface Project {
  id: number
  title: string
  description: string
  project_type: string
  target_word_count: number
  current_word_count: number
  created_at: string
  updated_at: string
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: string
  wordCountGoal?: number
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'novel',
    name: 'Novel',
    description: 'Full-length fiction work with chapters and character development',
    icon: 'Book',
    wordCountGoal: 80000
  },
  {
    id: 'novella',
    name: 'Novella',
    description: 'Medium-length fiction, perfect for focused storytelling',
    icon: 'BookOpen',
    wordCountGoal: 30000
  },
  {
    id: 'short-story',
    name: 'Short Story',
    description: 'Compact narrative with a single plot or theme',
    icon: 'ScrollText',
    wordCountGoal: 5000
  },
  {
    id: 'screenplay',
    name: 'Screenplay',
    description: 'Script format for film or television',
    icon: 'Film',
    wordCountGoal: 20000
  },
  {
    id: 'poetry',
    name: 'Poetry Collection',
    description: 'Collection of poems with themes or styles',
    icon: 'Feather',
    wordCountGoal: 3000
  },
  {
    id: 'non-fiction',
    name: 'Non-Fiction Book',
    description: 'Educational or informational book project',
    icon: 'Library',
    wordCountGoal: 50000
  },
  {
    id: 'memoir',
    name: 'Memoir',
    description: 'Personal narrative and life stories',
    icon: 'User',
    wordCountGoal: 60000
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no template',
    icon: 'File'
  }
]

// Icon component map
const iconMap: Record<string, React.ElementType> = {
  Book,
  BookOpen,
  ScrollText,
  Film,
  Feather,
  Library,
  User,
  File
}

export function Studio() {
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'projects'>('overview')

  useEffect(() => {
    const init = async () => {
      await loadUser()
      await organizeOrphanedDocuments()
      await loadDocuments()
      await loadProjects()
    }
    init()
  }, [])

  const organizeOrphanedDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/v1/projects/organize-orphaned`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('[Studio] Organized orphaned documents:', result)
      }
    } catch (err) {
      console.error('[Studio] Error organizing orphaned documents:', err)
      // Fail silently - not critical
    }
  }

  const loadUser = async () => {
    try {
      console.log('[Studio] Loading user...')
      const currentUser = await authService.getCurrentUser()
      console.log('[Studio] User loaded:', currentUser)
      setUser(currentUser)
      
      if (!currentUser) {
        console.warn('[Studio] No user found, redirecting to login')
        setTimeout(() => {
          authService.login()
        }, 100)
      }
    } catch (err) {
      console.error('[Studio] Error loading user:', err)
      setTimeout(() => {
        authService.login()
      }, 100)
    }
  }

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.log('[Studio] No token found')
        setDocuments([])
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/v1/documents?page=1&page_size=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('[Studio] Token expired or invalid')
          localStorage.removeItem('access_token')
          setDocuments([])
          setLoading(false)
          return
        }
        throw new Error('Failed to load documents')
      }

      const data = await response.json()
      console.log('[Studio] Documents loaded:', data.documents?.length || 0)
      setDocuments(data.documents || [])
      setLoading(false)
    } catch (err) {
      console.error('[Studio] Error loading documents:', err)
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        console.log('[Studio] No token found for projects')
        setProjects([])
        return
      }

      const response = await fetch(`${API_URL}/v1/projects/?skip=0&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('[Studio] Token expired or invalid')
          localStorage.removeItem('access_token')
          setProjects([])
          return
        }
        throw new Error('Failed to load projects')
      }

      const data = await response.json()
      console.log('[Studio] Projects loaded:', data?.length || 0)
      setProjects(data || [])
    } catch (err) {
      console.error('[Studio] Error loading projects:', err)
      setProjects([])
    }
  }

  const createFromTemplate = async (templateId: string) => {
    // Check if user is logged in before navigating
    const token = localStorage.getItem('access_token')
    if (!token || !user) {
      console.warn('[Studio] User not logged in, redirecting to login')
      authService.login()
      return
    }
    
    // Create project first
    try {
      const template = PROJECT_TEMPLATES.find(t => t.id === templateId)
      const projectTitle = template ? `New ${template.name}` : 'New Project'
      
      // Convert template ID to backend enum format (replace hyphens with underscores)
      const projectType = templateId.replace(/-/g, '_')
      
      console.log('[Studio] Creating project for template:', templateId, '-> project_type:', projectType)
      const response = await fetch(`${API_URL}/v1/projects/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: projectTitle,
          project_type: projectType,
          description: '',
          target_word_count: template?.wordCountGoal
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Studio] Failed to create project:', response.status, errorText)
        throw new Error(`Failed to create project: ${response.status}`)
      }
      
      const project = await response.json()
      console.log('[Studio] Project created:', project.id)
      
      // Navigate to project detail page where user can choose document templates
      window.location.href = `/project/${project.id}`
    } catch (err) {
      console.error('[Studio] Error creating project:', err)
      alert('Failed to create project. Please try again.')
    }
  }

  // Calculate stats
  const totalWords = documents.reduce((sum, doc) => sum + doc.word_count, 0)
  const recentProjects = projects.slice(0, 6)

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading studio...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
      
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>Studio</h1>
          <p style={{ color: '#B3B2B0' }}>Your creative workspace</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveSection('overview')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeSection === 'overview'
                  ? 'border-[#B34B0C] text-white font-semibold'
                  : 'border-transparent text-[#B3B2B0] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveSection('projects')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeSection === 'projects'
                  ? 'border-[#B34B0C] text-white font-semibold'
                  : 'border-transparent text-[#B3B2B0] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Projects
              </div>
            </button>
            <button
              onClick={() => window.location.href = '/groups'}
              className="px-4 py-3 border-b-2 border-transparent text-[#B3B2B0] hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Groups
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Layout className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'white' }}>{projects.length}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Active Projects</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'white' }}>{documents.length}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Documents</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <PenTool className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'white' }}>{totalWords.toLocaleString()}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Total Words</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Projects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'white' }}>Your Projects</h2>
                <button
                  onClick={() => setActiveSection('projects')}
                  className="text-sm hover:underline"
                  style={{ color: '#B34B0C' }}
                >
                  View All Projects →
                </button>
              </div>
              
              {recentProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentProjects.map(project => {
                    const template = PROJECT_TEMPLATES.find(t => t.id === project.project_type.replace(/_/g, '-'))
                    const IconComponent = template ? iconMap[template.icon] : File
                    const progress = project.target_word_count 
                      ? Math.min(100, Math.round((project.current_word_count / project.target_word_count) * 100))
                      : 0

                    return (
                      <a
                        key={project.id}
                        href={`/project/${project.id}`}
                        className="p-6 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#524944' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <IconComponent size={32} style={{ color: '#B34B0C' }} />
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#37322E', color: '#B3B2B0' }}>
                            {template?.name || project.project_type}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-sm mb-3 line-clamp-2" style={{ color: '#B3B2B0' }}>
                            {project.description}
                          </p>
                        )}
                        {project.target_word_count && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm" style={{ color: '#B3B2B0' }}>
                              <span>{project.current_word_count.toLocaleString()} / {project.target_word_count.toLocaleString()} words</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#37322E' }}>
                              <div
                                className="h-full transition-all"
                                style={{ 
                                  backgroundColor: '#B34B0C',
                                  width: `${progress}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 text-xs" style={{ color: '#6C6A68' }}>
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </div>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <Layout className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
                  <p style={{ color: '#B3B2B0' }}>No projects yet. Start a new project!</p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveSection('projects')}
                className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                style={{ backgroundColor: '#524944' }}
              >
                <Layout className="w-8 h-8 mb-3" style={{ color: '#B34B0C' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>Start a Project</h3>
                <p style={{ color: '#B3B2B0' }}>Choose from templates like novels, screenplays, and more</p>
              </button>
            </div>
          </div>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="space-y-8">
            {/* Existing Projects */}
            {projects.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>Your Projects</h2>
                    <p style={{ color: '#B3B2B0' }}>Continue working on your writing projects</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map(project => {
                    const template = PROJECT_TEMPLATES.find(t => t.id === project.project_type.replace(/_/g, '-'))
                    const IconComponent = template ? iconMap[template.icon] : File
                    const progress = project.target_word_count 
                      ? Math.min(100, Math.round((project.current_word_count / project.target_word_count) * 100))
                      : 0

                    return (
                      <a
                        key={project.id}
                        href={`/project/${project.id}`}
                        className="p-6 rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#524944' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <IconComponent size={32} style={{ color: '#B34B0C' }} />
                          <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#37322E', color: '#B3B2B0' }}>
                            {template?.name || project.project_type}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-sm mb-3 line-clamp-2" style={{ color: '#B3B2B0' }}>
                            {project.description}
                          </p>
                        )}
                        {project.target_word_count && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm" style={{ color: '#B3B2B0' }}>
                              <span>{project.current_word_count.toLocaleString()} / {project.target_word_count.toLocaleString()} words</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#37322E' }}>
                              <div
                                className="h-full transition-all"
                                style={{ 
                                  backgroundColor: '#B34B0C',
                                  width: `${progress}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-3 text-xs" style={{ color: '#6C6A68' }}>
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Project Templates */}
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                  {projects.length > 0 ? 'Start a New Project' : 'Project Templates'}
                </h2>
                <p style={{ color: '#B3B2B0' }}>
                  Choose a template to structure your writing project
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROJECT_TEMPLATES.map(template => {
                  const IconComponent = iconMap[template.icon] || File
                  return (
                    <button
                      key={template.id}
                      onClick={() => createFromTemplate(template.id)}
                      className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                      style={{ backgroundColor: '#524944' }}
                    >
                      <div className="mb-3">
                        <IconComponent size={40} style={{ color: '#B3B2B0' }} />
                      </div>
                      <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>
                        {template.name}
                      </h3>
                      <p className="text-sm mb-3" style={{ color: '#B3B2B0' }}>
                        {template.description}
                      </p>
                      {template.wordCountGoal && (
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#B34B0C' }}>
                          <Zap className="w-4 h-4" />
                          <span>{template.wordCountGoal.toLocaleString()} word goal</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
