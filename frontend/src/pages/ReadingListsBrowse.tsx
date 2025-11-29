import React, { useEffect, useState } from 'react'
import { Search, List as ListIcon, Calendar, ArrowLeft, Eye } from 'lucide-react'
import { toast } from '../services/toast'

interface ReadingList {
  id: number
  user_id: number
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

const ReadingListsBrowse: React.FC = () => {
  const [lists, setLists] = useState<ReadingList[]>([])
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null)
  const [listDocuments, setListDocuments] = useState<ListDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 12

  useEffect(() => {
    loadPublicLists()
  }, [page, searchQuery])

  const loadPublicLists = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * pageSize),
        limit: String(pageSize)
      })
      
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/v1/reading-lists/public/browse?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLists(data.items)
        setTotal(data.total)
      } else {
        toast.error('Failed to load reading lists')
      }
    } catch (error) {
      console.error('Error loading reading lists:', error)
      toast.error('Failed to load reading lists')
    } finally {
      setLoading(false)
    }
  }

  const handleViewList = async (list: ReadingList) => {
    setSelectedList(list)
    setDocumentsLoading(true)
    
    try {
      const response = await fetch(`/api/v1/reading-lists/public/${list.id}/documents`)
      if (response.ok) {
        const data = await response.json()
        setListDocuments(data.items)
      } else {
        toast.error('Failed to load list documents')
      }
    } catch (error) {
      console.error('Error loading list documents:', error)
      toast.error('Failed to load list documents')
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadPublicLists()
  }

  const totalPages = Math.ceil(total / pageSize)

  if (selectedList) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setSelectedList(null)
              setListDocuments([])
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>

          <div className="bg-card border border-border rounded-lg p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{selectedList.name}</h1>
              {selectedList.description && (
                <p className="text-muted-foreground text-lg">{selectedList.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ListIcon className="w-4 h-4" />
                  {selectedList.document_count} documents
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Updated {new Date(selectedList.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold mb-4">Documents in this list</h2>
              
              {documentsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading documents...
                </div>
              ) : listDocuments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No documents in this list yet
                </div>
              ) : (
                <div className="space-y-3">
                  {listDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Added {new Date(doc.added_at).toLocaleDateString()}
                        </div>
                      </div>
                      <a
                        href={`/document/${doc.id}`}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <h1 className="text-4xl font-bold mb-4">Public Reading Lists</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Discover curated reading lists shared by the community
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reading lists..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading reading lists...
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12">
            <ListIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-xl font-medium text-muted-foreground mb-2">
              {searchQuery ? 'No matching lists found' : 'No public reading lists yet'}
            </p>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Check back later for curated reading lists'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {lists.map(list => (
                <div
                  key={list.id}
                  className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleViewList(list)}
                >
                  <div className="mb-3">
                    <h3 className="text-xl font-semibold mb-2">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <ListIcon className="w-4 h-4" />
                      {list.document_count} {list.document_count === 1 ? 'document' : 'documents'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(list.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewList(list)
                    }}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View List
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ReadingListsBrowse
