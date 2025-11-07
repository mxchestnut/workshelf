/**
 * Document Page - Edit and view individual documents
 */

import { useEffect, useState } from 'react'
import { Editor } from '../components/Editor'
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react'
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

  // Get document ID from URL
  const documentId = new URLSearchParams(window.location.search).get('id')

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
      const token = localStorage.getItem('token')
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
          localStorage.removeItem('token')
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
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Please log in to create documents')
        setLoading(false)
        return
      }

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
          visibility: 'private'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create document')
      }

      const data = await response.json()
      setDocument(data)
      setTitle(data.title)
      setLoading(false)
      
      // Update URL with new document ID
      window.history.pushState({}, '', `/document?id=${data.id}`)
    } catch (err) {
      console.error('Error creating document:', err)
      setError('Failed to create document')
      setLoading(false)
    }
  }

  const saveDocument = async () => {
    if (!document) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/v1/documents/${document.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content: document.content
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
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/v1/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      window.location.href = '/documents'
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('Failed to delete document')
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
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={document.visibility}
                onChange={(e) => {
                  setDocument({ ...document, visibility: e.target.value as any })
                }}
                className="px-3 py-1.5 border border-neutral-light rounded-lg text-sm bg-white"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="studio">Studio</option>
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
    </div>
  )
}
