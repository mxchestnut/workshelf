/**
 * Trash Page - Manage deleted documents and projects
 * 
 * Features:
 * - View all trashed items (documents and projects)
 * - Restore items from trash
 * - Permanently delete items
 * - Empty entire trash
 * - View trash statistics
 * - Auto-purge warning (30 days)
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  FolderOpen,
  Clock,
  Search,
  XCircle,
  CheckCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface TrashedDocument {
  id: number
  title: string
  content: any
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'public' | 'studio'
  word_count: number
  created_at: string
  updated_at: string
  deleted_at: string
  is_deleted: boolean
}

interface TrashedProject {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
  deleted_at: string
  is_deleted: boolean
  document_count?: number
}

interface TrashStats {
  total_documents: number
  total_projects: number
  documents_expiring_soon: number
  projects_expiring_soon: number
  retention_days: number
}

type Tab = 'documents' | 'projects'

export default function Trash() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('documents')
  const [documents, setDocuments] = useState<TrashedDocument[]>([])
  const [projects, setProjects] = useState<TrashedProject[]>([])
  const [stats, setStats] = useState<TrashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  useEffect(() => {
    loadUser()
    loadTrashData()
  }, [activeTab])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadTrashData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Load statistics
      const statsResponse = await fetch(`${API_URL}/api/v1/trash/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Load documents or projects based on active tab
      if (activeTab === 'documents') {
        const docsResponse = await fetch(`${API_URL}/api/v1/trash/documents`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (docsResponse.ok) {
          const docsData = await docsResponse.json()
          setDocuments(docsData.documents || [])
        }
      } else {
        const projectsResponse = await fetch(`${API_URL}/api/v1/trash/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          setProjects(projectsData.projects || [])
        }
      }
    } catch (error) {
      console.error('Error loading trash data:', error)
    } finally {
      setLoading(false)
    }
  }

  const restoreDocument = async (id: number) => {
    setActionLoading(id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trash/documents/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== id))
        if (stats) {
          setStats({
            ...stats,
            total_documents: stats.total_documents - 1
          })
        }
      } else {
        const error = await response.json()
        alert(`Failed to restore: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error restoring document:', error)
      alert('Failed to restore document')
    } finally {
      setActionLoading(null)
    }
  }

  const restoreProject = async (id: number) => {
    setActionLoading(id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trash/projects/${id}/restore?restore_documents=true`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setProjects(projects.filter(proj => proj.id !== id))
        if (stats) {
          setStats({
            ...stats,
            total_projects: stats.total_projects - 1
          })
        }
      } else {
        const error = await response.json()
        alert(`Failed to restore: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error restoring project:', error)
      alert('Failed to restore project')
    } finally {
      setActionLoading(null)
    }
  }

  const permanentlyDeleteDocument = async (id: number) => {
    if (!confirm('This will permanently delete this document. This action cannot be undone. Are you sure?')) {
      return
    }

    setActionLoading(id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trash/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setDocuments(documents.filter(doc => doc.id !== id))
        if (stats) {
          setStats({
            ...stats,
            total_documents: stats.total_documents - 1
          })
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Failed to delete document')
    } finally {
      setActionLoading(null)
    }
  }

  const permanentlyDeleteProject = async (id: number) => {
    if (!confirm('This will permanently delete this project and all its documents. This action cannot be undone. Are you sure?')) {
      return
    }

    setActionLoading(id)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trash/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setProjects(projects.filter(proj => proj.id !== id))
        if (stats) {
          setStats({
            ...stats,
            total_projects: stats.total_projects - 1
          })
        }
      } else {
        const error = await response.json()
        alert(`Failed to delete: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    } finally {
      setActionLoading(null)
    }
  }

  const emptyTrash = async () => {
    setShowEmptyConfirm(false)
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trash/empty`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setDocuments([])
        setProjects([])
        setStats({
          total_documents: 0,
          total_projects: 0,
          documents_expiring_soon: 0,
          projects_expiring_soon: 0,
          retention_days: stats?.retention_days || 30
        })
      } else {
        const error = await response.json()
        alert(`Failed to empty trash: ${error.detail}`)
      }
    } catch (error) {
      console.error('Error emptying trash:', error)
      alert('Failed to empty trash')
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const retentionDays = stats?.retention_days || 30
    const expiryDate = new Date(deleted.getTime() + retentionDays * 24 * 60 * 60 * 1000)
    const now = new Date()
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysRemaining)
  }

  const getExpiryColor = (deletedAt: string) => {
    const days = getDaysUntilDeletion(deletedAt)
    if (days <= 7) return 'text-red-400 bg-red-900/20'
    if (days <= 14) return 'text-yellow-400 bg-yellow-900/20'
    return 'text-green-400 bg-green-900/20'
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredProjects = projects.filter(proj =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && !stats) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading trash...</div>
        </div>
      </div>
    )
  }

  const totalItems = (stats?.total_documents || 0) + (stats?.total_projects || 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="" />

      <div className="max-w-7xl mx-auto px-6 py-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="w-8 h-8" style={{ color: '#EDAC53' }} />
            <h1 className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>Trash</h1>
          </div>
          <p style={{ color: '#B3B2B0' }}>
            Items in trash are automatically deleted after {stats?.retention_days || 30} days
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: '#B3B2B0' }}>Total Items</span>
              <FileText className="w-5 h-5" style={{ color: '#EDAC53' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>{totalItems}</p>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: '#B3B2B0' }}>Expiring Soon</span>
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>
              {(stats?.documents_expiring_soon || 0) + (stats?.projects_expiring_soon || 0)}
            </p>
            <p className="text-xs mt-1" style={{ color: '#B3B2B0' }}>Within 7 days</p>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: '#B3B2B0' }}>Retention Period</span>
              <Clock className="w-5 h-5" style={{ color: '#EDAC53' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>{stats?.retention_days || 30}</p>
            <p className="text-xs mt-1" style={{ color: '#B3B2B0' }}>Days until auto-delete</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#B3B2B0' }} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border"
              style={{
                backgroundColor: '#2E2A27',
                borderColor: '#6C6A68',
                color: '#F1EEEB'
              }}
            />
          </div>

          {/* Empty Trash Button */}
          {totalItems > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500 text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Empty Trash
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b" style={{ borderColor: '#6C6A68' }}>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'documents' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'documents' ? '#EDAC53' : '#B3B2B0',
              borderColor: activeTab === 'documents' ? '#EDAC53' : 'transparent'
            }}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents ({stats?.total_documents || 0})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'projects' ? 'border-b-2' : ''
            }`}
            style={{
              color: activeTab === 'projects' ? '#EDAC53' : '#B3B2B0',
              borderColor: activeTab === 'projects' ? '#EDAC53' : 'transparent'
            }}
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Projects ({stats?.total_projects || 0})
            </div>
          </button>
        </div>

        {/* Empty State */}
        {((activeTab === 'documents' && filteredDocuments.length === 0) ||
          (activeTab === 'projects' && filteredProjects.length === 0)) && (
          <div className="text-center py-16">
            <Trash2 className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#B3B2B0' }} />
            <p className="text-lg mb-2" style={{ color: '#F1EEEB' }}>Trash is empty</p>
            <p style={{ color: '#B3B2B0' }}>
              {searchQuery ? 'No items match your search' : `No ${activeTab} in trash`}
            </p>
          </div>
        )}

        {/* Documents List */}
        {activeTab === 'documents' && filteredDocuments.length > 0 && (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => {
              const daysLeft = getDaysUntilDeletion(doc.deleted_at)
              const isLoading = actionLoading === doc.id

              return (
                <div
                  key={doc.id}
                  className="rounded-lg p-6"
                  style={{ backgroundColor: '#524944' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#EDAC53' }} />
                        <h3 className="text-lg font-semibold truncate" style={{ color: '#F1EEEB' }}>
                          {doc.title || 'Untitled Document'}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm mb-3" style={{ color: '#B3B2B0' }}>
                        <span>{doc.word_count.toLocaleString()} words</span>
                        <span>•</span>
                        <span>Deleted {new Date(doc.deleted_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getExpiryColor(doc.deleted_at)}`}>
                          {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => restoreDocument(doc.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDeleteDocument(doc.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Projects List */}
        {activeTab === 'projects' && filteredProjects.length > 0 && (
          <div className="space-y-4">
            {filteredProjects.map((project) => {
              const daysLeft = getDaysUntilDeletion(project.deleted_at)
              const isLoading = actionLoading === project.id

              return (
                <div
                  key={project.id}
                  className="rounded-lg p-6"
                  style={{ backgroundColor: '#524944' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FolderOpen className="w-5 h-5 flex-shrink-0" style={{ color: '#EDAC53' }} />
                        <h3 className="text-lg font-semibold truncate" style={{ color: '#F1EEEB' }}>
                          {project.name}
                        </h3>
                      </div>
                      
                      {project.description && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: '#B3B2B0' }}>
                          {project.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#B3B2B0' }}>
                        {project.document_count !== undefined && (
                          <>
                            <span>{project.document_count} documents</span>
                            <span>•</span>
                          </>
                        )}
                        <span>Deleted {new Date(project.deleted_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getExpiryColor(project.deleted_at)}`}>
                          {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => restoreProject(project.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDeleteProject(project.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 border border-red-500 text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Empty Trash Confirmation Modal */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg p-6 max-w-md w-full" style={{ backgroundColor: '#524944' }}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-bold" style={{ color: '#F1EEEB' }}>Empty Trash?</h2>
            </div>
            
            <p className="mb-6" style={{ color: '#B3B2B0' }}>
              This will permanently delete all {totalItems} items in your trash. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                style={{
                  borderColor: '#6C6A68',
                  color: '#F1EEEB'
                }}
              >
                Cancel
              </button>
              <button
                onClick={emptyTrash}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
