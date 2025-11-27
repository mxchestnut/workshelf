/**
 * Document Page - Edit and view individual documents
 */

import { useEffect, useState } from 'react'
import { Editor } from '../components/Editor'
import { WritingPromptsSidebar } from '../components/WritingPromptsSidebar'
import { ArrowLeft, Trash2, ExternalLink, Sparkles } from 'lucide-react'
import '../components/Editor.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface DocumentData {
  id: number
  title: string
  content: any // TipTap JSON
  status: 'draft' | 'published' | 'archived'
  visibility: 'private' | 'public' | 'studio'
  word_count: number
  created_at: string
  updated_at: string
}

export function Document() {
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Get document ID from URL path (/document/123) or query (?id=123)
  const pathParts = window.location.pathname.split('/')
  const pathId = pathParts[2] // /document/123 -> 123
  const urlParams = new URLSearchParams(window.location.search)
  const queryId = urlParams.get('id')
  const documentId = pathId || queryId
  const projectId = urlParams.get('project')
  const promptText = urlParams.get('prompt')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Cmd/Ctrl + S: Manual save
      if (modKey && e.key === 's') {
        e.preventDefault()
        if (document) {
          saveDocument()
        }
      }

      // Cmd/Ctrl + K: Toggle writing prompts
      if (modKey && e.key === 'k') {
        e.preventDefault()
        setPromptsOpen(!promptsOpen)
      }

      // Cmd/Ctrl + /: Show keyboard shortcuts
      if (modKey && e.key === '/') {
        e.preventDefault()
        setShowShortcuts(!showShortcuts)
      }

      // Cmd/Ctrl + Shift + P: Toggle publish status
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        if (document) {
          const newStatus = document.status === 'published' ? 'draft' : 'published'
          setDocument({ ...document, status: newStatus })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [document, promptsOpen, showShortcuts])

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId)
    } else {
      // Create new document
      createNewDocument()
    }
  }, [documentId])

  const loadDocument = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to edit documents')
        setLoading(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          setError('Please log in to edit documents')
          setLoading(false)
          return
        }
        throw new Error('Failed to load document')
      }

      const data = await response.json()
      setDocument(data)
      setTitle(data.title)
      setLoading(false)
    } catch (err) {
      console.error('Error loading document:', err)
      setError('Failed to load document')
      setLoading(false)
    }
  }

  const createNewDocument = async () => {
    try {
      const token = localStorage.getItem('access_token')
      console.log('[Document] Creating new document, token:', token ? 'present' : 'missing')
      
      if (!token) {
        console.error('[Document] No access token found')
        setError('Please log in to create documents')
        setLoading(false)
        return
      }

      console.log('[Document] POST to:', `${API_URL}/api/v1/documents`)
      const response = await fetch(`${API_URL}/api/v1/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: { type: 'doc', content: [] },
          status: 'draft',
          visibility: 'private',
          ...(projectId && { project_id: parseInt(projectId) })
        })
      })

      console.log('[Document] Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Document] Create failed:', errorText)
        let errorMessage = `Failed to create document: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.detail || errorMessage
        } catch {
          // errorText is not JSON, use as is
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[Document] Document created:', data.id)
      setDocument(data)
      setTitle(data.title)
      setLoading(false)
      
      // Update URL with new document ID
      window.history.pushState({}, '', `/document?id=${data.id}`)
    } catch (err) {
      console.error('Error creating document:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create document'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const saveDocument = async () => {
    if (!document) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content: document.content,
          status: document.status,
          visibility: document.visibility
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save document')
      }

      const data = await response.json()
      setDocument(data)
    } catch (err) {
      console.error('Error saving document:', err)
      throw err // Let the Editor component handle the error
    }
  }

  const deleteDocument = async () => {
    if (!document) return
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Failed to delete document'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch {
          // If response isn't JSON, use default message
        }
        console.error('Delete error:', errorMessage)
        alert(`Failed to delete document: ${errorMessage}`)
        return
      }

      window.location.href = '/documents'
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete document: Network error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-neutral">Loading...</div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-error">{error || 'Document not found'}</p>
        <button
          onClick={() => window.location.href = '/documents'}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Back to Documents
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Template Prompt Banner */}
      {promptText && (
        <div className="border-b" style={{ backgroundColor: '#524944', borderColor: '#6C6A68' }}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#B34B0C' }} />
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#B34B0C' }}>
                  Writing Prompt
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#B3B2B0' }}>
                  {promptText}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Info Banner */}
      {document.status === 'published' && document.visibility === 'public' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-green-800">
            <span className="text-lg">✅</span>
            <span>This document is <strong>published and public</strong> - it will appear on your public profile!</span>
          </div>
        </div>
      )}
      {document.status === 'draft' && document.visibility === 'public' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-yellow-800">
            <span className="text-lg">⚠️</span>
            <span>This document is set to public, but it's still a <strong>draft</strong>. Change status to "Published" to show it on your profile.</span>
          </div>
        </div>
      )}
      {document.status === 'published' && document.visibility === 'private' && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-blue-800">
            <span className="text-lg">🔒</span>
            <span>This document is published but <strong>private</strong>. Change visibility to "Public" to show it on your profile.</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="border-b border-neutral-light bg-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/documents'}
              className="p-2 hover:bg-neutral-lightest rounded-lg transition-colors"
              title="Back to documents"
            >
              <ArrowLeft className="w-5 h-5 text-neutral" />
            </button>
            <div className="flex items-center gap-3">
              <select
                value={document.status}
                onChange={(e) => {
                  setDocument({ ...document, status: e.target.value as any })
                }}
                className="px-3 py-1.5 border border-neutral-light rounded-lg text-sm bg-white"
                title="Document status"
              >
                <option value="draft">📝 Draft</option>
                <option value="published">✅ Published</option>
                <option value="archived">📦 Archived</option>
              </select>
              <select
                value={document.visibility}
                onChange={(e) => {
                  setDocument({ ...document, visibility: e.target.value as any })
                }}
                className="px-3 py-1.5 border border-neutral-light rounded-lg text-sm bg-white"
                title="Who can see this document"
              >
                <option value="private">🔒 Private (only you)</option>
                <option value="public">🌐 Public (on your profile)</option>
                <option value="studio">👥 Studio (shared)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {document.status === 'published' && document.visibility === 'public' && (
              <button
                onClick={() => window.open(`/view/${document.id}`, '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral hover:bg-neutral-lightest rounded-lg transition-colors"
                title="View published document"
              >
                <ExternalLink className="w-4 h-4" />
                View
              </button>
            )}
            <button
              onClick={() => setPromptsOpen(!promptsOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-lightest rounded-lg transition-colors"
              style={{ color: promptsOpen ? '#B34B0C' : undefined }}
              title="Writing prompts and help (⌘K)"
            >
              <Sparkles className="w-4 h-4" />
              Prompts
            </button>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="px-3 py-1.5 text-sm text-neutral hover:bg-neutral-lightest rounded-lg transition-colors"
              title="Keyboard shortcuts (⌘/)"
            >
              ⌨️
            </button>
            <button
              onClick={deleteDocument}
              className="p-2 text-error hover:bg-error-light rounded-lg transition-colors"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          content={document.content}
          title={title}
          onTitleChange={setTitle}
          onContentChange={(content) => {
            setDocument({ ...document, content })
          }}
          onSave={saveDocument}
          autoSave={true}
          placeholder="Start writing your story..."
        />
      </div>

      {/* Writing Prompts Sidebar */}
      <WritingPromptsSidebar
        isOpen={promptsOpen}
        onClose={() => setPromptsOpen(false)}
        onInsertText={(text) => {
          // Insert prompt text into the editor
          // Note: This would ideally insert at cursor position
          console.log('Insert prompt:', text)
        }}
      />

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-neutral-darkest">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-neutral hover:text-neutral-darkest"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-neutral-light">
                <span className="text-neutral">Save document</span>
                <kbd className="px-2 py-1 bg-neutral-lightest border border-neutral-light rounded text-sm font-mono">
                  {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} S
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-light">
                <span className="text-neutral">Toggle writing prompts</span>
                <kbd className="px-2 py-1 bg-neutral-lightest border border-neutral-light rounded text-sm font-mono">
                  {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} K
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-neutral-light">
                <span className="text-neutral">Show shortcuts</span>
                <kbd className="px-2 py-1 bg-neutral-lightest border border-neutral-light rounded text-sm font-mono">
                  {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} /
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral">Toggle publish status</span>
                <kbd className="px-2 py-1 bg-neutral-lightest border border-neutral-light rounded text-sm font-mono">
                  {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} ⇧ P
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
