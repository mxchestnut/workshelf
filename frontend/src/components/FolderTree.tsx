import { useState, useEffect } from 'react'
import { 
  Folder, 
  FolderOpen, 
  FolderPlus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Check,
  X
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface FolderData {
  id: number
  name: string
  parent_id: number | null
  color: string | null
  icon: string | null
  document_count?: number
  subfolder_count?: number
  created_at: string
  updated_at: string
}

interface Props {
  onSelectFolder: (folderId: number | null) => void
  selectedFolderId: number | null
}

export function FolderTree({ onSelectFolder, selectedFolderId }: Props) {
  const [folders, setFolders] = useState<FolderData[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState<number | null>(null) // parent_id or null for root
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState<number | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [menuOpen, setMenuOpen] = useState<number | null>(null)

  useEffect(() => {
    loadFolders()
  }, [])

  const getToken = () => localStorage.getItem('access_token')

  const loadFolders = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/folders?limit=1000`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to load folders')
      const data = await response.json()
      setFolders(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async (name: string, parentId: number | null) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, parent_id: parentId })
      })
      if (!response.ok) throw new Error('Failed to create folder')
      await loadFolders()
      if (parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId))
      }
      setCreatingFolder(null)
      setNewFolderName('')
    } catch (err: any) {
      setError(err.message || 'Failed to create folder')
    }
  }

  const updateFolder = async (id: number, name: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/folders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name })
      })
      if (!response.ok) throw new Error('Failed to update folder')
      await loadFolders()
      setEditingFolder(null)
      setEditFolderName('')
    } catch (err: any) {
      setError(err.message || 'Failed to update folder')
    }
  }

  const deleteFolder = async (id: number) => {
    if (!confirm('Delete this folder? Documents inside will not be deleted.')) return
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/v1/folders/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to delete folder')
      await loadFolders()
      if (selectedFolderId === id) {
        onSelectFolder(null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder')
    }
  }

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFolders(newExpanded)
  }

  const getSubfolders = (parentId: number | null) => {
    return folders.filter(f => f.parent_id === parentId)
  }

  const renderFolder = (folder: FolderData, level: number = 0) => {
    const subfolders = getSubfolders(folder.id)
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const isEditing = editingFolder === folder.id
    const hasMenu = menuOpen === folder.id

    return (
      <div key={folder.id}>
        <div 
          className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-neutral-lightest group ${
            isSelected ? 'bg-primary/10 text-primary font-semibold' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {subfolders.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleExpand(folder.id) }}
              className="p-0.5 hover:bg-neutral-light rounded"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
          {subfolders.length === 0 && <div className="w-4" />}
          
          <button
            onClick={() => onSelectFolder(folder.id)}
            className="flex-1 flex items-center gap-2 text-left"
          >
            {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
            {isEditing ? (
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0.5 text-sm border border-border rounded"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateFolder(folder.id, editFolderName)
                  if (e.key === 'Escape') { setEditingFolder(null); setEditFolderName('') }
                }}
              />
            ) : (
              <span className="text-sm">{folder.name}</span>
            )}
            {folder.document_count !== undefined && folder.document_count > 0 && (
              <span className="text-xs text-muted-foreground">({folder.document_count})</span>
            )}
          </button>

          {isEditing ? (
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); updateFolder(folder.id, editFolderName) }}
                className="p-0.5 hover:bg-green-100 text-green-600 rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingFolder(null); setEditFolderName('') }}
                className="p-0.5 hover:bg-red-100 text-red-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="relative opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(hasMenu ? null : folder.id) }}
                className="p-0.5 hover:bg-neutral-light rounded"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
              {hasMenu && (
                <div className="absolute right-0 mt-1 bg-white border border-border rounded shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation()
                      setCreatingFolder(folder.id)
                      setMenuOpen(null)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-lightest flex items-center gap-2"
                  >
                    <FolderPlus className="w-3 h-3" /> New Subfolder
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation()
                      setEditingFolder(folder.id)
                      setEditFolderName(folder.name)
                      setMenuOpen(null)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-lightest flex items-center gap-2"
                  >
                    <Edit2 className="w-3 h-3" /> Rename
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation()
                      deleteFolder(folder.id)
                      setMenuOpen(null)
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {creatingFolder === folder.id && (
          <div 
            className="flex items-center gap-2 px-2 py-1.5"
            style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
          >
            <Folder className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder..."
              className="flex-1 px-2 py-1 text-sm border border-border rounded"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) createFolder(newFolderName, folder.id)
                if (e.key === 'Escape') { setCreatingFolder(null); setNewFolderName('') }
              }}
            />
            <button
              onClick={() => createFolder(newFolderName, folder.id)}
              disabled={!newFolderName.trim()}
              className="p-1 hover:bg-green-100 text-green-600 rounded disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setCreatingFolder(null); setNewFolderName('') }}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {isExpanded && subfolders.map(sub => renderFolder(sub, level + 1))}
      </div>
    )
  }

  const rootFolders = getSubfolders(null)

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Folders</h3>
          <button
            onClick={() => setCreatingFolder(null)}
            className="p-1 hover:bg-neutral-lightest rounded"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {/* All Documents */}
        <div
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-neutral-lightest mb-2 ${
            selectedFolderId === null ? 'bg-primary/10 text-primary font-semibold' : ''
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm">All Documents</span>
        </div>

        {loading && <div className="text-xs text-muted-foreground px-2">Loading folders...</div>}
        {error && <div className="text-xs text-red-600 px-2">{error}</div>}

        {creatingFolder === null && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder..."
              className="flex-1 px-2 py-1 text-sm border border-border rounded"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) createFolder(newFolderName, null)
                if (e.key === 'Escape') setNewFolderName('')
              }}
            />
            <button
              onClick={() => newFolderName.trim() && createFolder(newFolderName, null)}
              disabled={!newFolderName.trim()}
              className="p-1 hover:bg-green-100 text-green-600 rounded disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        )}

        {rootFolders.map(folder => renderFolder(folder))}
      </div>
    </div>
  )
}

// Missing import
import { FileText } from 'lucide-react'
