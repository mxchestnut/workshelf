/**
 * Project Detail Page - Hybrid between Obsidian and World Anvil
 * Shows document tree in sidebar with template selection
 * Cache bust v2
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { 
  ArrowLeft, FileText, User, MapPin, Clock,
  Users, Book, Scroll, Trash2
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'
console.log('[ProjectDetail] Using API_URL:', API_URL)

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
  document_type?: string
}

interface DocumentTemplate {
  id: string
  title: string
  description: string
  icon: React.ElementType
  category: string
  prompt: string
}

// Document templates - simple cards with single prompts
const DOCUMENT_TEMPLATES: Record<string, DocumentTemplate[]> = {
  novel: [
    {
      id: 'main-manuscript',
      title: 'Main Manuscript',
      description: 'Your primary story content',
      icon: Book,
      category: 'Writing',
      prompt: 'Write your story here. This is your main manuscript where your narrative comes to life.'
    },
    {
      id: 'character',
      title: 'Character Profile',
      description: 'Develop a character',
      icon: User,
      category: 'Characters',
      prompt: 'Who is this character? Describe their appearance, personality, background, motivations, and role in your story.'
    },
    {
      id: 'location',
      title: 'Location',
      description: 'Build a place in your world',
      icon: MapPin,
      category: 'World',
      prompt: 'Describe this location. What does it look like? What\'s its history? Who lives there? Why is it important to your story?'
    },
    {
      id: 'timeline',
      title: 'Timeline Event',
      description: 'Track a key event',
      icon: Clock,
      category: 'Timeline',
      prompt: 'What happened in this event? When did it occur? Who was involved? What were the consequences?'
    },
    {
      id: 'faction',
      title: 'Faction/Organization',
      description: 'Detail a group',
      icon: Users,
      category: 'World',
      prompt: 'What is this organization? What are their goals and beliefs? Who leads them? What role do they play in your world?'
    },
    {
      id: 'lore',
      title: 'Lore & Mythology',
      description: 'World history and legends',
      icon: Scroll,
      category: 'World',
      prompt: 'What is this legend or historical event? How did it shape your world? How is it remembered today?'
    }
  ],
  screenplay: [
    {
      id: 'script',
      title: 'Script',
      description: 'Your screenplay',
      icon: FileText,
      category: 'Writing',
      prompt: 'Write your screenplay here in standard script format.'
    },
    {
      id: 'character',
      title: 'Character Breakdown',
      description: 'Character details',
      icon: User,
      category: 'Characters',
      prompt: 'Who is this character? Describe them for actors and casting. Include their age, appearance, personality, and character arc.'
    },
    {
      id: 'location',
      title: 'Location/Set',
      description: 'Scene location',
      icon: MapPin,
      category: 'Locations',
      prompt: 'Describe this location. Is it INT or EXT? What\'s the visual style? What scenes take place here?'
    }
  ],
  default: [
    {
      id: 'main-content',
      title: 'Main Content',
      description: 'Your primary writing',
      icon: FileText,
      category: 'Writing',
      prompt: 'Start writing here. This is your main content area.'
    },
    {
      id: 'notes',
      title: 'Notes & Research',
      description: 'Supporting notes',
      icon: Scroll,
      category: 'Research',
      prompt: 'Collect your research, ideas, and brainstorming here. Use this space for notes that support your main work.'
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

      const response = await fetch(`${API_URL}/v1/projects/${projectId}`, {
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

      const response = await fetch(`${API_URL}/v1/documents?project_id=${projectId}`, {
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

      // Create document with empty paragraph (no text node to avoid Tiptap error)
      const initialContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph'
          }
        ]
      }

      // Fixed: Remove trailing slash to avoid FastAPI redirect
      const url = `${API_URL}/api/v1/documents`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `New ${template.title}`,
          content: initialContent,
          description: template.prompt,
          project_id: parseInt(projectId!),
          status: 'draft',
          visibility: 'private'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create document')
      }

      const document = await response.json()
      // Navigate to document editor with template context
      window.location.href = `/document/${document.id}?prompt=${encodeURIComponent(template.prompt)}`
    } catch (err) {
      console.error('[ProjectDetail] Error creating document:', err)
      alert('Failed to create document. Please try again.')
    }
  }

  const deleteProject = async () => {
    // Step 1: Ask what to do with documents
    const deleteDocuments = confirm(
      `What would you like to do with the documents in this project?\n\n` +
      `Click OK to DELETE ALL DOCUMENTS\n` +
      `Click Cancel to KEEP DOCUMENTS (they'll move to "Uncategorized")`
    )

    // Step 2: If deleting documents, require typing "delete all"
    if (deleteDocuments) {
      const confirmation = prompt(
        `⚠️ WARNING: This will permanently delete the project AND all ${documents.length} documents inside it.\n\n` +
        `Type "delete all" to confirm:`
      )
      
      if (confirmation !== 'delete all') {
        if (confirmation !== null) {
          alert('Project deletion cancelled. You must type "delete all" exactly.')
        }
        return
      }
    } else {
      // Just confirm project deletion (documents will be preserved)
      if (!confirm(`Delete this project? All ${documents.length} documents will be moved to "Uncategorized".`)) {
        return
      }
    }

    try {
      const token = localStorage.getItem('access_token')
      
      // If deleting documents, delete them first
      if (deleteDocuments) {
        console.log('[ProjectDetail] Deleting all documents in project...')
        for (const doc of documents) {
          try {
            await fetch(`${API_URL}/api/v1/documents/${doc.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            })
          } catch (err) {
            console.error(`[ProjectDetail] Failed to delete document ${doc.id}:`, err)
          }
        }
      }
      
      // Now delete the project
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to delete project'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch {
          // If response isn't JSON, use default message
        }
        console.error('Delete error:', errorMessage)
        alert(`Failed to delete project: ${errorMessage}`)
        return
      }

      // Redirect to studio after successful deletion
      window.location.href = '/studio'
    } catch (err) {
      console.error('[ProjectDetail] Error deleting project:', err)
      alert('Failed to delete project: Network error')
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
            <button
              onClick={deleteProject}
              className="p-2 rounded-lg hover:bg-red-600/10 transition-colors"
              style={{ color: '#EF4444' }}
              title="Delete project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Document Tree */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#B3B2B0' }}>
                Documents
              </h2>
              
              {documents.length > 0 ? (
                <div className="space-y-1">
                  {documents.map(doc => (
                    <a
                      key={doc.id}
                      href={`/document?id=${doc.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[#524944] transition-colors"
                      style={{ color: '#B3B2B0' }}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{doc.title}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#6C6A68' }}>
                  No documents yet. Choose a template below to get started.
                </p>
              )}
            </div>
          </div>

          {/* Main Content - Template Cards */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                {documents.length > 0 ? 'Add Document' : 'Choose a Template'}
              </h2>
              <p style={{ color: '#B3B2B0' }}>
                Select a template to create a new document with guided prompts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(template => {
                const IconComponent = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => createFromTemplate(template)}
                    className="p-5 rounded-lg hover:bg-opacity-90 transition-all text-left border border-transparent hover:border-[#B34B0C]"
                    style={{ backgroundColor: '#524944' }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <IconComponent size={28} style={{ color: '#B34B0C' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold" style={{ color: 'white' }}>
                            {template.title}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded ml-2 flex-shrink-0" 
                                style={{ backgroundColor: '#37322E', color: '#6C6A68' }}>
                            {template.category}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: '#B3B2B0' }}>
                          {template.description}
                        </p>
                        <p className="text-xs italic" style={{ color: '#6C6A68' }}>
                          "{template.prompt.substring(0, 80)}..."
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
