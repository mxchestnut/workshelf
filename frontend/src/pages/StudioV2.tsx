import { useState, useEffect } from 'react'
import { FileText, FolderOpen, Folder, Plus, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { Editor } from '../components/Editor'
import { authService } from '../services/auth'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev/api'

interface Project {
  id: number
  title: string
  project_type: string
  description?: string
  target_word_count?: number
}

interface Document {
  id: number
  title: string
  content: any
  project_id: number
  status: string
  visibility: string
}

export default function StudioV2() {
  const [projects, setProjects] = useState<Project[]>([])
  const [documents, setDocuments] = useState<{ [projectId: number]: Document[] }>({})
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        authService.login()
        return
      }

      const response = await fetch(`${API_URL}/v1/projects/?skip=0&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data || [])
        
        // Auto-expand first project and load its documents
        if (data && data.length > 0) {
          const firstProjectId = data[0].id
          setExpandedProjects(new Set([firstProjectId]))
          loadDocuments(firstProjectId)
        }
      }
      setLoading(false)
    } catch (err) {
      console.error('Error loading projects:', err)
      setLoading(false)
    }
  }

  const loadDocuments = async (projectId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/v1/documents?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(prev => ({ ...prev, [projectId]: data.documents || [] }))
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
      if (!documents[projectId]) {
        loadDocuments(projectId)
      }
    }
    setExpandedProjects(newExpanded)
  }

  const createDocument = async (projectId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/v1/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
          project_id: projectId,
          status: 'draft',
          visibility: 'private'
        })
      })

      if (response.ok) {
        const newDoc = await response.json()
        setDocuments(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), newDoc]
        }))
        setSelectedDocument(newDoc)
      }
    } catch (err) {
      console.error('Error creating document:', err)
    }
  }

  const saveDocument = async () => {
    if (!selectedDocument) return

    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/v1/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: selectedDocument.title,
          content: selectedDocument.content,
          status: selectedDocument.status,
          visibility: selectedDocument.visibility
        })
      })

      if (response.ok) {
        const updated = await response.json()
        
        // Update in documents list
        setDocuments(prev => ({
          ...prev,
          [updated.project_id]: prev[updated.project_id]?.map(doc =>
            doc.id === updated.id ? updated : doc
          ) || []
        }))
      } else if (response.status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        alert('Your session has expired. Please log in again.')
        window.location.href = '/'
      }
    } catch (err) {
      console.error('Error saving:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold font-mono">Studio</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {projects.map(project => {
            const isExpanded = expandedProjects.has(project.id)
            const projectDocs = documents[project.id] || []

            return (
              <div key={project.id} className="border-b border-gray-800">
                <div
                  className="flex items-center gap-2 p-3 hover:bg-gray-800 cursor-pointer"
                  onClick={() => toggleProject(project.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4" />
                  ) : (
                    <Folder className="w-4 h-4" />
                  )}
                  <span className="flex-1 truncate font-mono text-sm">{project.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      createDocument(project.id)
                    }}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="pl-6">
                    {projectDocs.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500 font-mono">
                        No documents yet
                      </div>
                    ) : (
                      projectDocs.map(doc => (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-2 p-2 hover:bg-gray-800 cursor-pointer ${
                            selectedDocument?.id === doc.id ? 'bg-gray-800' : ''
                          }`}
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="flex-1 truncate text-xs font-mono">{doc.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <input
                type="text"
                value={selectedDocument.title}
                onChange={(e) => setSelectedDocument({ ...selectedDocument, title: e.target.value })}
                className="bg-transparent border-none outline-none text-xl font-mono"
              />
              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                content={selectedDocument.content}
                title={selectedDocument.title}
                onTitleChange={(title) => setSelectedDocument({ ...selectedDocument, title })}
                onContentChange={(content) => setSelectedDocument({ ...selectedDocument, content })}
                onSave={saveDocument}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h2 className="text-xl font-mono mb-2">No document selected</h2>
              <p className="text-gray-500 font-mono text-sm">
                Select a document from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
