import { useState, useEffect } from 'react'
import { FileText, Folder, Plus, ChevronRight, Loader2, Upload, Trash2, FolderPlus, FilePlus } from 'lucide-react'
import { Editor } from '../components/Editor'
import { useAuth } from "../contexts/AuthContext"
import { Navigation } from '../components/Navigation'
import { BulkUploadModal } from '../components/BulkUploadModal'
import PublishModal, { PublishData } from '../components/PublishModal'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

interface Project {
  id: number
  title: string
  project_type: string
  description?: string
  target_word_count?: number
}

interface TreeFolder {
  id: number
  name: string
  parent_id: number | null
  color: string | null
  icon: string | null
  document_count: number
  children: TreeFolder[]
}

interface Document {
  id: number
  title: string
  content: any
  project_id: number
  folder_id: number | null
  status: string
  visibility: string
}

export default function StudioV2() {
  const { user, login, logout } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [folders, setFolders] = useState<TreeFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null) // Current folder being viewed
  const [folderPath, setFolderPath] = useState<Array<{ id: number | null; name: string }>>([{ id: null, name: 'Root' }]) // Breadcrumb path
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          login()
          return
        }

        const response = await fetch(`${API_URL}/api/v1/projects/?skip=0&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setProjects(data || [])
          
          // Auto-select first project
          if (data && data.length > 0) {
            setSelectedProject(data[0])
          }
        }
        setLoading(false)
      } catch (err) {
        console.error('Error loading projects:', err)
        setLoading(false)
      }
    }
    
    loadProjects()
  }, [login])

  const loadDocuments = async (projectId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents?project_id=${projectId}&page_size=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[DOCUMENTS] Loaded documents:', data.documents?.length || 0)
        console.log('[DOCUMENTS] Sample:', data.documents?.slice(0, 3))
        console.log('[DOCUMENTS] Folder IDs distribution:', data.documents?.reduce((acc: any, d: any) => {
          const fid = d.folder_id === null ? 'null' : d.folder_id
          acc[fid] = (acc[fid] || 0) + 1
          return acc
        }, {}))
        setDocuments(data.documents || [])
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const loadFoldersAndDocuments = async (projectId: number) => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Load folder tree filtered by project
      const foldersResponse = await fetch(`${API_URL}/api/v1/folders/tree?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (foldersResponse.ok) {
        const foldersData = await foldersResponse.json()
        console.log('[FOLDER TREE] Received folders:', foldersData)
        setFolders(foldersData || [])
      }
      
      // Load documents
      await loadDocuments(projectId)
    } catch (err) {
      console.error('Error loading folders and documents:', err)
    }
  }

  const navigateToFolder = (folderId: number, folderName: string) => {
    setCurrentFolderId(folderId)
    setFolderPath(prev => [...prev, { id: folderId, name: folderName }])
  }

  const navigateBack = (targetFolderId: number | null) => {
    setCurrentFolderId(targetFolderId)
    const targetIndex = folderPath.findIndex(p => p.id === targetFolderId)
    if (targetIndex !== -1) {
      setFolderPath(folderPath.slice(0, targetIndex + 1))
    }
  }

  const createDocument = async (folderId: number | null = null) => {
    if (!selectedProject) return

    console.log('[CREATE DOC] Creating document in folder:', folderId, 'for project:', selectedProject.id)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
          project_id: selectedProject.id,
          folder_id: folderId,
          status: 'draft',
          visibility: 'private'
        })
      })

      if (response.ok) {
        const newDoc = await response.json()
        console.log('[CREATE DOC] Created document:', newDoc.id, 'in folder:', newDoc.folder_id)
        // Reload documents to ensure we have the latest data
        await loadDocuments(selectedProject.id)
        setSelectedDocument(newDoc)
      } else {
        const error = await response.json()
        console.error('[CREATE DOC] Failed:', error)
      }
    } catch (err) {
      console.error('Error creating document:', err)
    }
  }

  const createFolder = async (parentId: number | null = null) => {
    if (!selectedProject) return
    
    const name = prompt('Folder name:')
    if (!name) return

    try {
      const token = localStorage.getItem('access_token')
      console.log('[StudioV2] API_URL:', API_URL)
      console.log('[StudioV2] Full URL:', `${API_URL}/api/v1/folders/`)
      const response = await fetch(`${API_URL}/api/v1/folders/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          parent_id: parentId,
          project_id: selectedProject.id
        })
      })

      if (response.ok) {
        await loadFoldersAndDocuments(selectedProject.id)
        // if (parentId) {
        //   setExpandedFolders(prev => new Set(prev).add(parentId))
        // }
      }
    } catch (err) {
      console.error('Error creating folder:', err)
    }
  }

  const renameFolder = async (folderId: number, newName: string) => {
    if (!selectedProject) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      })

      if (response.ok) {
        await loadFoldersAndDocuments(selectedProject.id)
      }
    } catch (err) {
      console.error('Error renaming folder:', err)
    }
  }

  const deleteFolder = async (folderId: number) => {
    if (!confirm('Delete this folder? Documents inside will not be deleted.')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok && selectedProject) {
        await loadFoldersAndDocuments(selectedProject.id)
      }
    } catch (err) {
      console.error('Error deleting folder:', err)
    }
  }

  const createProject = async () => {
    if (!newProjectTitle.trim()) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/projects/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newProjectTitle,
          project_type: 'novel',
          description: ''
        })
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjects(prev => [...prev, newProject])
        setSelectedProject(newProject)
        setNewProjectTitle('')
        setShowNewProjectModal(false)
      }
    } catch (err) {
      console.error('Error creating project:', err)
    }
  }

  const deleteProject = async (projectId: number) => {
    if (!confirm('Delete this project and all its documents? This cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        if (selectedProject?.id === projectId) {
          setSelectedProject(projects[0] || null)
          setSelectedDocument(null)
        }
      }
    } catch (err) {
      console.error('Error deleting project:', err)
    }
  }

  const renameProject = async (projectId: number, newTitle: string) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      })

      if (response.ok) {
        const updated = await response.json()
        setProjects(prev => prev.map(p => p.id === projectId ? updated : p))
        if (selectedProject?.id === projectId) {
          setSelectedProject(updated)
        }
      }
    } catch (err) {
      console.error('Error renaming project:', err)
    }
  }

  const deleteDocument = async (documentId: number) => {
    if (!confirm('Delete this document? This cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
        if (selectedDocument?.id === documentId) {
          setSelectedDocument(null)
        }
      }
    } catch (err) {
      console.error('Error deleting document:', err)
    }
  }

  const handleStatusChange = async (newStatus: 'draft' | 'beta' | 'published') => {
    if (!selectedDocument) return

    // If publishing, open the publish modal instead of direct status change
    if (newStatus === 'published') {
      setShowPublishModal(true)
      return
    }

    // For draft/beta, update status directly
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...selectedDocument,
          status: newStatus
        })
      })

      if (response.ok) {
        const updated = await response.json()
        setSelectedDocument(updated)
        setDocuments(prev => prev.map(doc =>
          doc.id === updated.id ? updated : doc
        ))
      }
    } catch (err) {
      console.error('Error updating document status:', err)
    }
  }

  const handlePublish = async (publishData: PublishData) => {
    if (!selectedDocument) return

    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams({
        price_usd: publishData.price_usd.toString()
      })
      
      if (publishData.description) {
        params.append('description', publishData.description)
      }
      
      if (publishData.genres && publishData.genres.length > 0) {
        publishData.genres.forEach(genre => params.append('genres', genre))
      }

      const response = await fetch(
        `${API_URL}/api/v1/documents/${selectedDocument.id}/publish?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const result = await response.json()
        
        // Update document status
        const updatedDoc = {
          ...selectedDocument,
          status: 'published'
        }
        setSelectedDocument(updatedDoc)
        setDocuments(prev => prev.map(doc =>
          doc.id === updatedDoc.id ? updatedDoc : doc
        ))
        
        setShowPublishModal(false)
        alert(`Published successfully! ${result.message}`)
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Publishing failed')
      }
    } catch (err: any) {
      console.error('Error publishing document:', err)
      alert(`Publishing failed: ${err.message}`)
      throw err
    }
  }

  const saveDocument = async () => {
    if (!selectedDocument) return

    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${selectedDocument.id}`, {
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
        setDocuments(prev => prev.map(doc =>
          doc.id === updated.id ? updated : doc
        ))
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
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navigation 
        user={user} 
        onLogin={() => login()} onLogout={() => logout()} 
        
        currentPage="studio" 
      />
      <div className="ml-0 md:ml-80 transition-all duration-300 flex-1 overflow-hidden">
      
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Left Sidebar - File Explorer */}
        <div className="w-64 border-r border-border flex flex-col">
          {/* Header with Project Switcher */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-mono">Studio</h2>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="p-1.5 hover:bg-accent rounded transition-colors"
                title="New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Project Switcher Dropdown */}
            {selectedProject && (
              <select
                value={selectedProject.id}
                onChange={(e) => {
                  const project = projects.find(p => p.id === parseInt(e.target.value))
                  if (project) setSelectedProject(project)
                }}
                className="w-full px-2 py-1.5 text-sm font-mono bg-background border border-border rounded-lg cursor-pointer hover:bg-accent"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={() => createFolder(currentFolderId)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                title="New Folder"
              >
                <FolderPlus className="w-3 h-3" />
                <span>Folder</span>
              </button>
              <button
                onClick={() => createDocument(currentFolderId)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
                title="New Document"
              >
                <FilePlus className="w-3 h-3" />
                <span>File</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowBulkUploadModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
          </div>
          
          {/* Folder Tree */}
          {selectedProject ? (
            <FolderTreeView 
              folders={folders}
              documents={documents}
              currentFolderId={currentFolderId}
              folderPath={folderPath}
              selectedDocId={selectedDocument?.id || null}
              selectedProject={selectedProject}
              onNavigateToFolder={navigateToFolder}
              onNavigateBack={navigateBack}
              onDocumentSelect={setSelectedDocument}
              onFolderCreate={createFolder}
              onFolderRename={renameFolder}
              onFolderDelete={deleteFolder}
              onDocumentCreate={createDocument}
              onDocumentDelete={deleteDocument}
              onProjectRename={renameProject}
              onProjectDelete={deleteProject}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center">
              <p className="text-xs text-muted-foreground font-mono">
                No project selected
              </p>
            </div>
          )}
        </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedDocument ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <input
                type="text"
                value={selectedDocument.title}
                onChange={(e) => setSelectedDocument({ ...selectedDocument, title: e.target.value })}
                className="bg-transparent border-none outline-none text-xl font-mono text-foreground"
              />
              {saving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                content={selectedDocument.content}
                title={selectedDocument.title}
                status={selectedDocument.status as 'draft' | 'beta' | 'published'}
                onTitleChange={(title) => setSelectedDocument({ ...selectedDocument, title })}
                onContentChange={(content) => setSelectedDocument({ ...selectedDocument, content })}
                onSave={saveDocument}
                onStatusChange={handleStatusChange}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-mono mb-2">No document selected</h2>
              <p className="text-muted-foreground font-mono text-sm">
                Select a document from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createProject()}
              placeholder="Project title..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowNewProjectModal(false)
                  setNewProjectTitle('')
                }}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={!newProjectTitle.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <BulkUploadModal
          onClose={() => setShowBulkUploadModal(false)}
          projectId={selectedProject?.id}
          folderId={currentFolderId}
          onSuccess={async () => {
            // Reload documents to show newly uploaded files
            if (selectedProject) {
              await loadDocuments(selectedProject.id)
              // Close the modal
              setShowBulkUploadModal(false)
            }
        }}
      />
      )}

      {/* Publish Modal */}
      {showPublishModal && selectedDocument && (
        <PublishModal
          document={selectedDocument}
          onClose={() => setShowPublishModal(false)}
          onPublish={handlePublish}
        />
      )}
      </div>
    </div>
  </div>
)
}

// Folder Tree View Component
function FolderTreeView({
  folders,
  documents,
  currentFolderId,
  folderPath,
  selectedDocId,
  selectedProject,
  onNavigateToFolder,
  onNavigateBack,
  onDocumentSelect,
  onFolderCreate: _onFolderCreate,
  onFolderRename,
  onFolderDelete,
  onDocumentCreate,
  onDocumentDelete,
  onProjectRename,
  onProjectDelete
}: {
  folders: TreeFolder[]
  documents: Document[]
  currentFolderId: number | null
  folderPath: Array<{ id: number | null; name: string }>
  selectedDocId: number | null
  selectedProject: Project
  onNavigateToFolder: (folderId: number, folderName: string) => void
  onNavigateBack: (folderId: number | null) => void
  onDocumentSelect: (doc: Document) => void
  onFolderCreate: (parentId: number | null) => void
  onFolderRename: (folderId: number, newName: string) => void
  onFolderDelete: (folderId: number) => void
  onDocumentCreate: (folderId: number | null) => void
  onDocumentDelete: (docId: number) => void
  onProjectRename: (projectId: number, newTitle: string) => void
  onProjectDelete: (projectId: number) => void
}) {
  // Helper function to find all folders recursively
  const findAllFolders = (folderList: TreeFolder[]): TreeFolder[] => {
    const result: TreeFolder[] = []
    for (const folder of folderList) {
      result.push(folder)
      if (folder.children && folder.children.length > 0) {
        result.push(...findAllFolders(folder.children))
      }
    }
    return result
  }

  const allFolders = findAllFolders(folders)
  
  // Get folders and documents in current view
  const currentFolders = currentFolderId === null
    ? folders.filter(f => f.parent_id === null)
    : allFolders.filter(f => f.parent_id === currentFolderId)
  
  // Handle both null and undefined for root documents
  const currentDocs = documents.filter(d => {
    if (currentFolderId === null) {
      return d.folder_id === null || d.folder_id === undefined
    }
    return d.folder_id === currentFolderId
  })
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-border bg-background px-2 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          {folderPath.map((pathItem, index) => (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <button
                onClick={() => onNavigateBack(pathItem.id)}
                className="text-xs font-mono hover:text-primary transition-colors"
                disabled={index === folderPath.length - 1}
              >
                {pathItem.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable file/folder list */}
      <div className="flex-1 overflow-y-auto">
        {/* Folders */}
        {currentFolders.map(folder => (
          <div
            key={`folder-${folder.id}`}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer group"
            onClick={() => onNavigateToFolder(folder.id, folder.name)}
          >
            <Folder className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
            <span className="flex-1 truncate text-xs font-mono font-medium">{folder.name}</span>
            <span className="text-xs text-muted-foreground font-mono mr-1">{folder.document_count}</span>
            
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDocumentCreate(folder.id)
              }}
              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="New document"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const newName = prompt('Rename folder:', folder.name)
                if (newName && newName !== folder.name) {
                  onFolderRename(folder.id, newName)
                }
              }}
              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Rename folder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFolderDelete(folder.id)
              }}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Documents */}
        {currentDocs.map(doc => (
          <div
            key={`doc-${doc.id}`}
            className={`flex items-center gap-2 px-2 py-1.5 hover:bg-accent cursor-pointer group ${
              selectedDocId === doc.id ? 'bg-accent' : ''
            }`}
            onClick={() => onDocumentSelect(doc)}
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-xs font-mono">{doc.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDocumentDelete(doc.id)
              }}
              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete document"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {currentFolders.length === 0 && currentDocs.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground font-mono">
            No folders or documents yet
          </div>
        )}
      </div>

      {/* Project Settings Section - Fixed at bottom */}
      <div className="border-t border-border bg-background">
        <div className="px-2 py-2">
          <div className="text-xs text-muted-foreground font-mono mb-2 px-1">Project Settings</div>
          <button
            onClick={() => {
              const newTitle = prompt('Rename project:', selectedProject.title)
              if (newTitle && newTitle !== selectedProject.title) {
                onProjectRename(selectedProject.id, newTitle)
              }
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono hover:bg-accent rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            <span>Rename Project</span>
          </button>
          <button
            onClick={() => onProjectDelete(selectedProject.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete Project</span>
          </button>
        </div>
      </div>
    </div>
  )
}
