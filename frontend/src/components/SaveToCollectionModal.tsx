/**
 * SaveToCollectionModal - Modal for saving content to collections
 * Supports creating new collections and adding items to existing ones
 */

import { useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth'
import { X, Plus, Folder, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface Collection {
  id: number
  name: string
  description: string | null
  item_count: number
}

interface SaveToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'post' | 'document' | 'ebook' | 'author' | 'group' | 'user' | 'article'
  itemId: number
  itemTitle?: string
}

export function SaveToCollectionModal({ isOpen, onClose, itemType, itemId, itemTitle }: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [savedCollections, setSavedCollections] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionDescription, setNewCollectionDescription] = useState('')

  const checkSavedStatus = useCallback(async () => {
    try {
      const token = await authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/collections/check/${itemType}/${itemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSavedCollections(data.collections.map((c: any) => c.id))
      }
    } catch (error) {
      console.error('Failed to check saved status:', error)
    }
  }, [itemType, itemId])

  const loadCollections = async () => {
    try {
      const token = await authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Failed to load collections:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCollections()
      checkSavedStatus()
    }
    // checkSavedStatus is stable and doesn't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemType, itemId])

  const createCollection = async () => {
    if (!newCollectionName.trim()) return
    
    setLoading(true)
    try {
      const token = await authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/collections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCollectionName,
          description: newCollectionDescription || null,
          is_public: false
        })
      })
      
      if (response.ok) {
        const newCollection = await response.json()
        setCollections([...collections, newCollection])
        setNewCollectionName('')
        setNewCollectionDescription('')
        setShowNewCollection(false)
        
        // Automatically save item to new collection
        await saveToCollection(newCollection.id)
      }
    } catch (error) {
      console.error('Failed to create collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveToCollection = async (collectionId: number) => {
    setLoading(true)
    try {
      const token = await authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/collections/${collectionId}/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item_type: itemType.toUpperCase(),
          item_id: itemId,
          note: null
        })
      })
      
      if (response.ok) {
        setSavedCollections([...savedCollections, collectionId])
        // Update item count
        setCollections(collections.map(c => 
          c.id === collectionId ? { ...c, item_count: c.item_count + 1 } : c
        ))
      } else if (response.status === 400) {
        // Already saved
        console.log('Item already in collection')
      }
    } catch (error) {
      console.error('Failed to save to collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromCollection = async (collectionId: number, itemId: number) => {
    setLoading(true)
    try {
      const token = await authService.getAccessToken()
      const response = await fetch(`${API_URL}/api/v1/collections/${collectionId}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        setSavedCollections(savedCollections.filter(id => id !== collectionId))
        setCollections(collections.map(c => 
          c.id === collectionId ? { ...c, item_count: Math.max(0, c.item_count - 1) } : c
        ))
      }
    } catch (error) {
      console.error('Failed to remove from collection:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Save to Collection</h2>
            {itemTitle && <p className="text-sm text-muted-foreground mt-1">{itemTitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* New Collection Form */}
          {showNewCollection ? (
            <div className="mb-4 p-4 border border-border rounded-lg bg-background">
              <input
                type="text"
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full px-3 py-2 mb-2 border border-border rounded bg-background text-foreground"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                className="w-full px-3 py-2 mb-2 border border-border rounded bg-background text-foreground resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={createCollection}
                  disabled={!newCollectionName.trim() || loading}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewCollection(false)
                    setNewCollectionName('')
                    setNewCollectionDescription('')
                  }}
                  className="px-4 py-2 border border-border rounded hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCollection(true)}
              className="w-full flex items-center justify-center gap-2 p-3 mb-4 border-2 border-dashed border-border rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
              <span>New Collection</span>
            </button>
          )}

          {/* Collections List */}
          <div className="space-y-2">
            {collections.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No collections yet. Create one to get started!
              </p>
            ) : (
              collections.map((collection) => {
                const isSaved = savedCollections.includes(collection.id)
                return (
                  <button
                    key={collection.id}
                    onClick={() => isSaved ? removeFromCollection(collection.id, itemId) : saveToCollection(collection.id)}
                    disabled={loading}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSaved
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isSaved ? (
                        <Check className="w-5 h-5 text-primary" />
                      ) : (
                        <Folder className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-foreground">{collection.name}</div>
                      {collection.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {collection.description}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {collection.item_count}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-accent text-foreground rounded hover:bg-accent/80"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
