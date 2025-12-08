/**
 * VersionHistory Component - Git-style version history viewer
 * Shows document versions with restore capability
 */

import { useState, useEffect } from 'react'
import { Clock, RotateCcw, X, FileText, ArrowRight } from 'lucide-react'
import { toast } from '../services/toast'
import { DocumentMode } from './ModeSwitcher'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface DocumentVersion {
  id: number
  version_number: number
  title: string
  content: any
  mode: DocumentMode
  previous_mode?: DocumentMode
  is_mode_transition: boolean
  change_summary?: string
  created_at: string
  author: {
    id: number
    username: string
  }
}

interface VersionHistoryProps {
  documentId: number
  isOpen: boolean
  onClose: () => void
  onRestore?: () => void
}

export function VersionHistory({ documentId, isOpen, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)

  useEffect(() => {
    if (isOpen && documentId) {
      loadVersions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentId])

  const loadVersions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/documents/${documentId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load versions')
      }

      const data = await response.json()
      setVersions(data)
    } catch (err) {
      console.error('Error loading versions:', err)
      toast.error('Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  const restoreVersion = async (versionNumber: number) => {
    if (!confirm(`Restore document to version ${versionNumber}? This will create a new version with the old content.`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/documents/${documentId}/versions/${versionNumber}/restore`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to restore version')
      }

      toast.success(`Restored to version ${versionNumber}`)
      onRestore?.()
      onClose()
    } catch (err) {
      console.error('Error restoring version:', err)
      toast.error('Failed to restore version')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getModeColor = (mode: DocumentMode) => {
    switch (mode) {
      case 'alpha': return 'text-blue-600 bg-blue-50'
      case 'beta': return 'text-purple-600 bg-purple-50'
      case 'publish': return 'text-green-600 bg-green-50'
      case 'read': return 'text-amber-600 bg-amber-50'
    }
  }

  const getModeLabel = (mode: DocumentMode) => {
    switch (mode) {
      case 'alpha': return 'Alpha'
      case 'beta': return 'Beta'
      case 'publish': return 'Publish'
      case 'read': return 'Read'
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-light">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-neutral" />
            <h2 className="text-xl font-bold text-neutral-darkest">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-lightest rounded-lg transition-colors"
            aria-label="Close version history"
          >
            <X className="w-5 h-5 text-neutral" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-neutral">Loading versions...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p>No version history yet</p>
              <p className="text-sm mt-1">Versions are created automatically when you change modes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`
                    border rounded-lg p-4 transition-all
                    ${selectedVersion?.id === version.id 
                      ? 'border-primary bg-primary-light' 
                      : 'border-neutral-light hover:border-neutral hover:bg-neutral-lightest'
                    }
                    cursor-pointer
                  `}
                  onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-neutral-darkest">
                          v{version.version_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getModeColor(version.mode)}`}>
                          {getModeLabel(version.mode)}
                        </span>
                        {version.is_mode_transition && version.previous_mode && (
                          <div className="flex items-center gap-1 text-xs text-neutral">
                            <span className={`px-1.5 py-0.5 rounded ${getModeColor(version.previous_mode)}`}>
                              {getModeLabel(version.previous_mode)}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                            <span className={`px-1.5 py-0.5 rounded ${getModeColor(version.mode)}`}>
                              {getModeLabel(version.mode)}
                            </span>
                          </div>
                        )}
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      
                      {version.change_summary && (
                        <p className="text-sm text-neutral mb-2">{version.change_summary}</p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-neutral">
                        <span>by @{version.author.username}</span>
                        <span>•</span>
                        <span>{formatDate(version.created_at)}</span>
                      </div>
                    </div>

                    {index !== 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreVersion(version.version_number)
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary-light rounded-lg transition-colors"
                        title="Restore this version"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </button>
                    )}
                  </div>

                  {selectedVersion?.id === version.id && (
                    <div className="mt-4 pt-4 border-t border-neutral-light">
                      <h4 className="text-sm font-semibold text-neutral-darkest mb-2">Title:</h4>
                      <p className="text-sm text-neutral-darkest mb-3 font-medium">{version.title}</p>
                      
                      <h4 className="text-sm font-semibold text-neutral-darkest mb-2">Content Preview:</h4>
                      <div className="text-sm text-neutral bg-neutral-lightest rounded p-4 max-h-64 overflow-y-auto prose prose-sm">
                        {version.content && typeof version.content === 'object' && version.content.blocks ? (
                          <div>
                            {version.content.blocks.slice(0, 5).map((block: any, idx: number) => (
                              <div key={idx} className="mb-2">
                                {block.type === 'paragraph' && <p>{block.data.text}</p>}
                                {block.type === 'header' && (
                                  <div className={`font-bold ${block.data.level === 1 ? 'text-lg' : 'text-base'}`}>
                                    {block.data.text}
                                  </div>
                                )}
                                {block.type === 'list' && (
                                  <ul className="list-disc pl-4">
                                    {block.data.items.map((item: string, i: number) => (
                                      <li key={i}>{item}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                            {version.content.blocks.length > 5 && (
                              <p className="text-xs text-neutral italic mt-2">
                                ... and {version.content.blocks.length - 5} more blocks
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(version.content, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
