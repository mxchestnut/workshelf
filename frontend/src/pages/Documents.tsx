/**
 * Documents List Page - View and manage all user documents
 */

import { useEffect, useState, useRef } from 'react'
import { authService } from '../services/auth'
import { Navigation } from '../components/Navigation'
import { WritingStreakWidget } from '../components/WritingStreakWidget'
import { FolderTree } from '../components/FolderTree'
import { FileText, Plus, Search, Clock, Upload, X } from 'lucide-react'

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
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<string>('')
  const [showImportModal, setShowImportModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

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

  const handleImportClick = () => {
    setShowImportModal(true)
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFolderSelect = () => {
    folderInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    await uploadFiles(Array.from(files))
  }

  const handleFolderChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    // Build file paths map for folder structure
    const filePaths: { [key: string]: string } = {}
    Array.from(files).forEach((file, index) => {
      filePaths[index.toString()] = (file as any).webkitRelativePath || file.name
    })
    
    await uploadFiles(Array.from(files), filePaths)
  }

  const uploadFiles = async (files: File[], filePaths?: { [key: string]: string }) => {
    setImporting(true)
    setImportProgress('Uploading files...')
    
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        alert('Please login to import documents')
        return
      }

      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      
      if (selectedFolderId) {
        formData.append('folder_id', selectedFolderId.toString())
      }
      
      if (filePaths) {
        formData.append('file_paths', JSON.stringify(filePaths))
      }

      const response = await fetch(`${API_URL}/api/v1/storage/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }

      const result = await response.json()
      setImportProgress(`✓ Imported ${result.imported} document(s)`)
      
      // Reload documents after successful import
      setTimeout(() => {
        loadDocuments()
        setShowImportModal(false)
        setImporting(false)
        setImportProgress('')
      }, 2000)

    } catch (error: any) {
      console.error('Import failed:', error)
      setImportProgress(`✗ Import failed: ${error.message}`)
      setTimeout(() => {
        setImporting(false)
        setImportProgress('')
      }, 3000)
    }
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
                <div className="flex gap-3">
                  <button
                    onClick={handleImportClick}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#524944', color: '#F1EEEB', border: '1px solid #6C6A68' }}
                  >
                    <Upload className="w-5 h-5" />
                    Import
                  </button>
                  <button
                    onClick={handleNewDocument}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#EDAC53', color: '#2E2A27' }}
                  >
                    <Plus className="w-5 h-5" />
                    New Document
                  </button>
                </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !importing && setShowImportModal(false)}>
          <div className="rounded-lg p-6 max-w-md w-full mx-4" style={{ backgroundColor: '#524944' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#F1EEEB' }}>Import Documents</h2>
              {!importing && (
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-neutral-light hover:text-neutral-lighter"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {importing ? (
              <div className="text-center py-8">
                <div className="animate-pulse mb-4" style={{ color: '#EDAC53' }}>
                  <Upload className="w-12 h-12 mx-auto" />
                </div>
                <p style={{ color: '#F1EEEB' }}>{importProgress}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: '#B3B2B0' }}>
                  Import markdown files (.md), text files (.txt), Word documents (.docx), or zip archives.
                  Folder structure will be preserved.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleFileSelect}
                    className="w-full py-3 px-4 rounded-lg border-2 border-dashed hover:opacity-80 transition-opacity"
                    style={{ borderColor: '#6C6A68', color: '#F1EEEB' }}
                  >
                    <FileText className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Select Files</div>
                    <div className="text-xs" style={{ color: '#B3B2B0' }}>Choose one or more files</div>
                  </button>

                  <button
                    onClick={handleFolderSelect}
                    className="w-full py-3 px-4 rounded-lg border-2 border-dashed hover:opacity-80 transition-opacity"
                    style={{ borderColor: '#6C6A68', color: '#F1EEEB' }}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Select Folder</div>
                    <div className="text-xs" style={{ color: '#B3B2B0' }}>Import entire folder structure</div>
                  </button>
                </div>

                <div className="text-xs" style={{ color: '#B3B2B0' }}>
                  <strong>Supported formats:</strong> .md, .markdown, .txt, .html, .docx, .odt, .pdf, .zip
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt,.html,.htm,.docx,.odt,.pdf,.zip"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore - webkitdirectory is not in TypeScript types but works in browsers
        webkitdirectory="true"
        onChange={handleFolderChange}
        className="hidden"
      />
    </div>
  )
}
