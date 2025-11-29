import { useState } from 'react'
import { Plus, Save, X, Loader2, Edit2, Trash2, List as ListIcon } from 'lucide-react'

interface ReadingList {
  id: number
  name: string
  description: string | null
  is_public: boolean
  document_count: number
  created_at: string
  updated_at: string
}

interface ListDocument {
  id: number
  title: string
  added_at: string
}

interface ReadingListsTabProps {
  lists: ReadingList[]
  loading: boolean
  onCreateList: (name: string, description: string, isPublic: boolean) => Promise<void>
  onUpdateList: (list: ReadingList) => Promise<void>
  onDeleteList: (listId: number) => Promise<void>
  onViewDocuments: (list: ReadingList) => Promise<ListDocument[]>
  onRemoveDocument: (listId: number, documentId: number) => Promise<void>
}

export function ReadingListsTab({
  lists,
  loading,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onViewDocuments,
  onRemoveDocument
}: ReadingListsTabProps) {
  const [showCreateList, setShowCreateList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [newListPublic, setNewListPublic] = useState(false)
  const [editingList, setEditingList] = useState<ReadingList | null>(null)
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null)
  const [listDocuments, setListDocuments] = useState<ListDocument[]>([])
  const [savingList, setSavingList] = useState(false)
  const [deletingListId, setDeletingListId] = useState<number | null>(null)

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    
    setSavingList(true)
    try {
      await onCreateList(newListName, newListDescription, newListPublic)
      setNewListName('')
      setNewListDescription('')
      setNewListPublic(false)
      setShowCreateList(false)
    } finally {
      setSavingList(false)
    }
  }

  const handleUpdateList = async () => {
    if (!editingList) return
    
    setSavingList(true)
    try {
      await onUpdateList(editingList)
      setEditingList(null)
    } finally {
      setSavingList(false)
    }
  }

  const handleDeleteList = async (listId: number) => {
    if (!confirm('Are you sure you want to delete this reading list?')) return
    
    setDeletingListId(listId)
    try {
      await onDeleteList(listId)
      if (selectedList?.id === listId) {
        setSelectedList(null)
        setListDocuments([])
      }
    } finally {
      setDeletingListId(null)
    }
  }

  const handleViewDocuments = async (list: ReadingList) => {
    setSelectedList(list)
    const docs = await onViewDocuments(list)
    setListDocuments(docs)
  }

  const handleRemoveDocument = async (listId: number, documentId: number) => {
    await onRemoveDocument(listId, documentId)
    setListDocuments(prev => prev.filter(doc => doc.id !== documentId))
    if (selectedList) {
      setSelectedList({ ...selectedList, document_count: selectedList.document_count - 1 })
    }
  }

  return (
    <div className="space-y-6">
      {/* Create New List Button */}
      {!showCreateList && !selectedList && (
        <button
          onClick={() => setShowCreateList(true)}
          className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-5 h-5" />
          Create New Reading List
        </button>
      )}

      {/* Create List Form */}
      {showCreateList && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create Reading List</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">List Name</label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Summer Reading 2025"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="What's this list about?"
                rows={3}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-public"
                checked={newListPublic}
                onChange={(e) => setNewListPublic(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="is-public" className="text-sm">Make this list public</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim() || savingList}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {savingList ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create List
              </button>
              <button
                onClick={() => {
                  setShowCreateList(false)
                  setNewListName('')
                  setNewListDescription('')
                  setNewListPublic(false)
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Detail View */}
      {selectedList && (
        <div className="space-y-4">
          <button
            onClick={() => {
              setSelectedList(null)
              setListDocuments([])
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            ← Back to Lists
          </button>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedList.name}</h2>
                {selectedList.description && (
                  <p className="text-muted-foreground mt-1">{selectedList.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{selectedList.document_count} documents</span>
                  <span>{selectedList.is_public ? 'Public' : 'Private'}</span>
                </div>
              </div>
            </div>
            
            {listDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No documents in this list yet
              </div>
            ) : (
              <div className="space-y-2">
                {listDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(doc.added_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveDocument(selectedList.id, doc.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lists Grid */}
      {!selectedList && (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No reading lists yet. Create one to get started!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map(list => (
              <div key={list.id} className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
                {editingList?.id === list.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingList.name}
                      onChange={(e) => setEditingList({...editingList, name: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                    />
                    <textarea
                      value={editingList.description || ''}
                      onChange={(e) => setEditingList({...editingList, description: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingList.is_public}
                        onChange={(e) => setEditingList({...editingList, is_public: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <label className="text-sm">Public</label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateList}
                        disabled={savingList}
                        className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
                      >
                        {savingList ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingList(null)}
                        className="px-3 py-1 bg-muted text-foreground rounded text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold">{list.name}</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingList(list)}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          disabled={deletingListId === list.id}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        >
                          {deletingListId === list.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {list.description && (
                      <p className="text-sm text-muted-foreground mb-3">{list.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {list.document_count} document{list.document_count !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {list.is_public ? '🌐 Public' : '🔒 Private'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewDocuments(list)}
                      className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      View Documents
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
