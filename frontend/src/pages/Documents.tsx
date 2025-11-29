/**
 * Documents List Page - View and manage all user documents
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { WritingStreakWidget } from '../components/WritingStreakWidget'
import { FolderTree } from '../components/FolderTree'
import { FileText, Plus, Search, Clock, TrendingUp } from 'lucide-react'

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

export function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
    const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    loadDocuments()
  }, [selectedFolderId])

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  }

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        // No token - show empty state instead of redirecting
        setDocuments([])
        return
      }


      const folderParam = selectedFolderId ? `&folder_id=${selectedFolderId}` : ''
      const response = await fetch(`${API_URL}/api/v1/documents?page=1&page_size=100${folderParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - clear token and show empty state
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          setDocuments([])
          return
        }
        throw new Error('Failed to load documents')
      }

      const data = await response.json()
      setDocuments(data.documents)
      setLoading(false)
    } catch (err) {
      console.error('Error loading documents:', err)
      setLoading(false)
    }
  }

  const createNewDocument = () => {
    window.location.href = '/document'
  }

  const openDocument = (id: number) => {
    window.location.href = `/document?id=${id}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-success bg-success-light'
      case 'draft': return 'text-warning bg-warning-light'
      case 'archived': return 'text-neutral bg-neutral-lightest'
      default: return 'text-neutral bg-neutral-lightest'
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="documents" />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse" style={{ color: '#B3B2B0' }}>Loading documents...</div>
        </div>
              </div>
            </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="documents" />

      <div className="flex h-screen pt-16">
        {/* Folder Sidebar */}
        <div className="w-64 border-r overflow-y-auto" style={{ backgroundColor: '#2E2A27', borderColor: '#6C6A68' }}>
          <FolderTree onSelectFolder={setSelectedFolderId} />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'white' }}>Documents</h1>
              <p style={{ color: '#B3B2B0' }}>Your writing workspace</p>
            </div>
            <button
              onClick={createNewDocument}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#B34B0C', color: 'white' }}
            >
              <Plus className="w-5 h-5" />
              New Document
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#B3B2B0' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none"
              style={{ 
                backgroundColor: '#37322E', 
                borderColor: '#6C6A68', 
                color: 'white'
              }}
            />
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Writing Streak Widget */}
        <div className="mb-8">
          <WritingStreakWidget />
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#6C6A68' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'white' }}>
              {searchQuery ? 'No documents found' : selectedFolderId ? 'No documents in this folder' : 'No documents yet'}
            </h3>
            <p className="mb-6" style={{ color: '#B3B2B0' }}>
              {searchQuery
                ? 'Try a different search term'
                : selectedFolderId
                  ? 'Create a document or move one to this folder'
                  : 'Start writing your first document'}
            </p>
            {!searchQuery && (
              <button
                onClick={createNewDocument}
                className="px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#B34B0C', color: 'white' }}
              >
                Create Your First Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc.id)}
                className="rounded-lg border p-6 transition-all cursor-pointer group hover:shadow-lg"
                style={{ 
                  backgroundColor: '#524944', 
                  borderColor: '#6C6A68' 
                }}
              >
                {/* Title */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 transition-colors line-clamp-2 group-hover:opacity-80" style={{ color: 'white' }}>
                    {doc.title}
                  </h3>
                  
                  {/* Status badge */}
                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm mb-4" style={{ color: '#B3B2B0' }}>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{doc.word_count.toLocaleString()} words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.ceil(doc.word_count / 200)} min</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t" style={{ borderColor: '#6C6A68' }}>
                  <p className="text-xs" style={{ color: '#B3B2B0' }}>
                    Updated {formatDate(doc.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

