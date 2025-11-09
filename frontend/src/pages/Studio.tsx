/**
 * Studio Page - Writer's workspace with projects, articles, and templates
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { 
  FileText, Sparkles, TrendingUp, 
  Zap, Layout, PenTool 
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
    icon: '📚',
    wordCountGoal: 80000
  },
  {
    id: 'novella',
    name: 'Novella',
    description: 'Medium-length fiction, perfect for focused storytelling',
    icon: '📖',
    wordCountGoal: 30000
  },
  {
    id: 'short-story',
    name: 'Short Story',
    description: 'Compact narrative with a single plot or theme',
    icon: '📝',
    wordCountGoal: 5000
  },
  {
    id: 'screenplay',
    name: 'Screenplay',
    description: 'Script format for film or television',
    icon: '🎬',
    wordCountGoal: 20000
  },
  {
    id: 'poetry',
    name: 'Poetry Collection',
    description: 'Collection of poems with themes or styles',
    icon: '✨',
    wordCountGoal: 3000
  },
  {
    id: 'non-fiction',
    name: 'Non-Fiction Book',
    description: 'Educational or informational book project',
    icon: '📕',
    wordCountGoal: 50000
  },
  {
    id: 'memoir',
    name: 'Memoir',
    description: 'Personal narrative and life stories',
    icon: '🪞',
    wordCountGoal: 60000
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with no template',
    icon: '📄'
  }
]

export function Studio() {
  const [user, setUser] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'overview' | 'projects'>('overview')

  useEffect(() => {
    loadUser()
    loadDocuments()
  }, [])

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

      const response = await fetch(`${API_URL}/api/v1/documents?page=1&page_size=100`, {
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

  const createFromTemplate = (templateId: string) => {
    // Check if user is logged in before navigating
    const token = localStorage.getItem('access_token')
    if (!token || !user) {
      console.warn('[Studio] User not logged in, redirecting to login')
      authService.login()
      return
    }
    
    // Navigate to document creator with template
    window.location.href = `/document?template=${templateId}`
  }

  const goToDocuments = () => {
    window.location.href = '/documents'
  }

  // Calculate stats
  const totalWords = documents.reduce((sum, doc) => sum + doc.word_count, 0)
  const publishedCount = documents.filter(d => d.status === 'published').length
  const recentDocs = documents.slice(0, 5)

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
        <div className="max-w-7xl mx-auto px-6 py-8">
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              <div className="p-6 rounded-lg" style={{ backgroundColor: '#524944' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-8 h-8" style={{ color: '#B34B0C' }} />
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'white' }}>{publishedCount}</p>
                    <p className="text-sm" style={{ color: '#B3B2B0' }}>Published</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Documents */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: 'white' }}>Recent Work</h2>
                <button
                  onClick={goToDocuments}
                  className="text-sm hover:underline"
                  style={{ color: '#B34B0C' }}
                >
                  View All Documents →
                </button>
              </div>
              
              {recentDocs.length > 0 ? (
                <div className="grid gap-4">
                  {recentDocs.map(doc => (
                    <a
                      key={doc.id}
                      href={`/document/${doc.id}`}
                      className="p-4 rounded-lg hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#524944' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{ color: 'white' }}>{doc.title}</h3>
                          <div className="flex items-center gap-4 text-sm" style={{ color: '#B3B2B0' }}>
                            <span>{doc.word_count.toLocaleString()} words</span>
                            <span>•</span>
                            <span className="capitalize">{doc.status}</span>
                            <span>•</span>
                            <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <FileText className="w-5 h-5" style={{ color: '#6C6A68' }} />
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg" style={{ backgroundColor: '#524944' }}>
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#6C6A68' }} />
                  <p style={{ color: '#B3B2B0' }}>No documents yet. Start a new project!</p>
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
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>Project Templates</h2>
              <p className="mb-6" style={{ color: '#B3B2B0' }}>
                Choose a template to structure your writing project
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PROJECT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => createFromTemplate(template.id)}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                  style={{ backgroundColor: '#524944' }}
                >
                  <div className="text-4xl mb-3">{template.icon}</div>
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
