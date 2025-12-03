/**
 * Documents List Page - View and manage all user documents
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { WritingStreakWidget } from '../components/WritingStreakWidget'
import { FolderTree } from '../components/FolderTree'
import { FileText, Plus, Search, Clock } from 'lucide-react'

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

export default function Documents() {
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
        setDocuments([])
        setLoading(false)
        return
      }

      let url = `${API_URL}/api/v1/documents`
      if (selectedFolderId) {
        url += `?folder_id=${selectedFolderId}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        console.error('Failed to load documents')
        setDocuments([])
      }
    } catch (error) {
      console.error('Error loading documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleNewDocument = () => {
    window.location.href = '/document'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-400 bg-yellow-900/20'
      case 'published': return 'text-green-400 bg-green-900/20'
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
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => authService.login()} onLogout={() => authService.logout()} currentPage="documents" />

      <div className="flex h-screen pt-16">
        {/* Folder Sidebar */}
        <div className="w-64 border-r overflow-y-auto" style={{ backgroundColor: '#2E2A27', borderColor: '#6C6A68' }}>
          <FolderTree selectedFolderId={selectedFolderId} onSelectFolder={setSelectedFolderId} />
        </div>

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-y-auto" role="main">
          {/* Header */}
          <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold" style={{ color: '#F1EEEB' }}>My Documents</h1>
                <button
                  onClick={handleNewDocument}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
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
                  placeholder="Search documents..."
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
            </div>
          </div>

          {/* Writing Streak Widget */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            <WritingStreakWidget />
          </div>

          {/* Documents Grid */}
          <div className="max-w-7xl mx-auto px-6 pb-12">
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: '#B3B2B0' }} />
                <p className="text-lg mb-2" style={{ color: '#F1EEEB' }}>No documents yet</p>
                <p className="mb-6" style={{ color: '#B3B2B0' }}>Start writing to see your documents here</p>
                <button
                  onClick={handleNewDocument}
                  className="px-6 py-3 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg p-6 cursor-pointer transition-all hover:scale-105"
                    style={{ backgroundColor: '#524944' }}
                    onClick={() => window.location.href = `/document?id=${doc.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <FileText className="w-6 h-6" style={{ color: '#EDAC53' }} />
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2" style={{ color: '#F1EEEB' }}>
                      {doc.title || 'Untitled Document'}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm" style={{ color: '#B3B2B0' }}>
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{doc.word_count.toLocaleString()} words</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{Math.ceil(doc.word_count / 200)} min</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-xs" style={{ color: '#B3B2B0' }}>
                      Updated {new Date(doc.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
