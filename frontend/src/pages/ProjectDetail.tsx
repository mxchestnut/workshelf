/**
 * Project Detail Page - Shows project overview and document templates
 * Similar to World Anvil's world-building prompts
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { 
  ArrowLeft, Plus, FileText, User, MapPin, Clock,
  Users, Book, Scroll
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

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

interface Document {
  id: number
  title: string
  word_count: number
  status: string
  updated_at: string
}

interface DocumentTemplate {
  id: string
  title: string
  description: string
  icon: React.ElementType
  prompts: string[]
}

// Document templates for different project types
const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate[]> = {
  novel: [
    {
      id: 'main-manuscript',
      title: 'Main Manuscript',
      description: 'Your primary story content',
      icon: Book,
      prompts: ['Write your story here']
    },
    {
      id: 'character',
      title: 'Character Profile',
      description: 'Develop your characters',
      icon: User,
      prompts: [
        'Physical appearance and mannerisms',
        'Background and history',
        'Motivations and goals',
        'Relationships with other characters',
        'Character arc and development'
      ]
    },
    {
      id: 'location',
      title: 'Location',
      description: 'Build your world\'s places',
      icon: MapPin,
      prompts: [
        'Physical description',
        'History and significance',
        'Inhabitants and culture',
        'Notable features',
        'Role in the story'
      ]
    },
    {
      id: 'timeline',
      title: 'Timeline Event',
      description: 'Track key events and history',
      icon: Clock,
      prompts: [
        'Date or time period',
        'What happened',
        'Who was involved',
        'Consequences and impact',
        'Connection to main story'
      ]
    },
    {
      id: 'faction',
      title: 'Faction/Organization',
      description: 'Detail groups and organizations',
      icon: Users,
      prompts: [
        'Name and purpose',
        'Leadership structure',
        'Beliefs and values',
        'Resources and influence',
        'Allies and enemies'
      ]
    },
    {
      id: 'lore',
      title: 'Lore & Mythology',
      description: 'World history and legends',
      icon: Scroll,
      prompts: [
        'The legend or historical event',
        'Origins and authenticity',
        'Cultural significance',
        'How it\'s known today',
        'Impact on your world'
      ]
    }
  ],
  screenplay: [
    {
      id: 'script',
      title: 'Script',
      description: 'Your screenplay in standard format',
      icon: FileText,
      prompts: ['Write your screenplay here']
    },
    {
      id: 'character',
      title: 'Character Breakdown',
      description: 'Character details for actors/casting',
      icon: User,
      prompts: [
        'Physical description and age',
        'Personality and quirks',
        'Background and motivations',
        'Character arc',
        'Key scenes'
      ]
    },
    {
      id: 'location',
      title: 'Location/Set',
      description: 'Scene locations and settings',
      icon: MapPin,
      prompts: [
        'Location type (INT/EXT)',
        'Visual description',
        'Atmosphere and mood',
        'Key scenes here',
        'Production notes'
      ]
    }
  ],
  // Other project types can use simpler templates
  default: [
    {
      id: 'main-content',
      title: 'Main Content',
      description: 'Your primary writing',
      icon: FileText,
      prompts: ['Start writing here']
    },
    {
      id: 'notes',
      title: 'Notes & Research',
      description: 'Supporting notes and ideas',
      icon: Scroll,
      prompts: [
        'Research notes',
        'Ideas and brainstorming',
        'References',
        'Drafts and experiments'
      ]
    }
  ]
}

export function ProjectDetail() {
  // Extract projectId from URL path
  const pathParts = window.location.pathname.split('/')
  const projectId = pathParts[pathParts.length - 1]
  
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
    if (projectId) {
      loadProject()
      loadDocuments()
    }
  }, [projectId])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
      
      if (!currentUser) {
        authService.login()
      }
    } catch (err) {
      console.error('[ProjectDetail] Error loading user:', err)
      authService.login()
    }
  }

  const loadProject = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        authService.login()
        return
      }

      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load project')
      }

      const data = await response.json()
      setProject(data)
      setLoading(false)
    } catch (err) {
      console.error('[ProjectDetail] Error loading project:', err)
      setLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/documents?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load documents')
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error('[ProjectDetail] Error loading documents:', err)
    }
  }

  const createFromTemplate = async (template: DocumentTemplate) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        authService.login()
        return
      }

      // Create document with template prompts as initial content
      const initialContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: template.title }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: template.description, marks: [{ type: 'italic' }] }]
          },
          { type: 'paragraph' },
          ...template.prompts.map(prompt => ({
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: prompt }]
          })).flatMap((heading, idx) => [
            heading,
            { type: 'paragraph' },
            ...(idx < template.prompts.length - 1 ? [{ type: 'paragraph' }] : [])
          ])
        ]
      }

      const response = await fetch(`${API_URL}/api/v1/documents/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: template.title,
          content: initialContent,
          project_id: parseInt(projectId!),
          status: 'DRAFT',
          visibility: 'PRIVATE'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create document')
      }

      const document = await response.json()
      window.location.href = `/document/${document.id}`
    } catch (err) {
      console.error('[ProjectDetail] Error creating document:', err)
      alert('Failed to create document. Please try again.')
    }
  }

  const getTemplates = (): DocumentTemplate[] => {
    if (!project) return DOCUMENT_TEMPLATES.default
    const projectType = project.project_type.replace(/_/g, '-')
    return DOCUMENT_TEMPLATES[projectType] || DOCUMENT_TEMPLATES.default
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading project...</div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="" />
        <div className="flex items-center justify-center h-screen">
          <div style={{ color: '#B3B2B0' }}>Project not found</div>
        </div>
      </div>
    )
  }

  const progress = project.target_word_count 
    ? Math.min(100, Math.round((project.current_word_count / project.target_word_count) * 100))
    : 0

  const templates = getTemplates()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="studio" />
      
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <a 
            href="/studio"
            className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
            style={{ color: '#B34B0C' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </a>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>{project.title}</h1>
              {project.description && (
                <p style={{ color: '#B3B2B0' }}>{project.description}</p>
              )}
            </div>
          </div>

          {/* Progress */}
          {project.target_word_count && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2" style={{ color: '#B3B2B0' }}>
                <span>{project.current_word_count.toLocaleString()} / {project.target_word_count.toLocaleString()} words</span>
                <span>{progress}% complete</span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#37322E' }}>
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Existing Documents */}
        {documents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'white' }}>Documents</h2>
            <div className="grid gap-4">
              {documents.map(doc => (
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
                        <span className="capitalize">{doc.status.toLowerCase()}</span>
                        <span>•</span>
                        <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <FileText className="w-5 h-5" style={{ color: '#6C6A68' }} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Document Templates */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'white' }}>
              {documents.length > 0 ? 'Add More Documents' : 'Get Started'}
            </h2>
            <p style={{ color: '#B3B2B0' }}>
              Choose a template to add structure to your project
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => {
              const IconComponent = template.icon
              return (
                <button
                  key={template.id}
                  onClick={() => createFromTemplate(template)}
                  className="p-6 rounded-lg hover:opacity-90 transition-opacity text-left"
                  style={{ backgroundColor: '#524944' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <IconComponent size={32} style={{ color: '#B34B0C' }} />
                    <Plus className="w-5 h-5" style={{ color: '#6C6A68' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'white' }}>
                    {template.title}
                  </h3>
                  <p className="text-sm mb-3" style={{ color: '#B3B2B0' }}>
                    {template.description}
                  </p>
                  <div className="text-xs" style={{ color: '#6C6A68' }}>
                    {template.prompts.length} prompt{template.prompts.length !== 1 ? 's' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
