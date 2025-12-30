/**
 * Read Page - Readium-powered reading experience for published works
 */
import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, Lock, BookOpen } from 'lucide-react'
import EpubReader from '../components/EpubReader'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface StoreItem {
  id: number
  title: string
  author_name: string
  description?: string
  price_usd: number
  epub_blob_url?: string
  cover_blob_url?: string
  cover_url?: string
}

export default function ReadPage() {
  // Get itemId from URL path: /read/:itemId
  const itemId = window.location.pathname.split('/read/')[1]
  const [storeItem, setStoreItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [showReader, setShowReader] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [inVault, setInVault] = useState(false)
  const [addingToShelf, setAddingToShelf] = useState(false)

  const loadStoreItem = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      
      // Fetch store item details
      const response = await fetch(`${API_URL}/api/v1/store/${itemId}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      })

      if (!response.ok) {
        throw new Error('Book not found')
      }

      const item = await response.json()
      setStoreItem(item)

      // Check if user has access (purchased or free)
      if (item.price_usd === 0) {
        // Free books are accessible to everyone
        setHasAccess(true)
      } else if (token) {
        // Check if user has purchased
        const accessResponse = await fetch(`${API_URL}/api/v1/store/${itemId}/access`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (accessResponse.ok) {
          const accessData = await accessResponse.json()
          setHasAccess(accessData.has_access)
        }
      }

      setLoading(false)
    } catch (err: any) {
      console.error('Error loading book:', err)
      setError(err.message || 'Failed to load book')
      setLoading(false)
    }
  }, [itemId])

  const checkIfInVault = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/vault`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const vault = await response.json()
        // Check if this store item is already in vault
        const found = vault.some((item: any) => 
          item.store_item_id?.toString() === itemId
        )
        setInVault(found)
      }
    } catch (error) {
      console.error('Failed to check vault:', error)
    }
  }, [itemId])

  useEffect(() => {
    loadStoreItem()
    checkIfInVault()
  }, [loadStoreItem, checkIfInVault])

  const handleAddToVault = async () => {
    if (!storeItem) return
    
    setAddingToShelf(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setAddingToShelf(false)
        return
      }

      const response = await fetch(`${API_URL}/api/v1/vault`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_type: 'book',
          title: storeItem.title,
          author: storeItem.author_name,
          cover_url: storeItem.cover_url,
          epub_url: storeItem.epub_blob_url,
          store_item_id: parseInt(itemId || '0'),
          status: 'want-to-read',
        }),
      })

      if (response.ok) {
        setInVault(true)
      }
    } catch (error) {
      console.error('Failed to add to vault:', error)
    } finally {
      setAddingToShelf(false)
    }
  }

  const handleProgressChange = async (location: string, progress: number) => {
    setReadingProgress(progress)
    
    // Save progress to backend
    try {
      const token = localStorage.getItem('access_token')
      if (!token || !storeItem) return

      await fetch(`${API_URL}/api/v1/reading-progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          store_item_id: storeItem.id,
          location,
          progress_percentage: progress
        })
      })
    } catch (err) {
      console.error('Failed to save reading progress:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    )
  }

  if (error || !storeItem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-4">Book Not Found</h2>
          <p className="text-muted-foreground mb-6">{error || 'The book you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/store')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Browse Store
          </button>
        </div>
      </div>
    )
  }

  // Show reader if user has access
  if (showReader && hasAccess && storeItem.epub_blob_url) {
    return (
      <EpubReader
        epubUrl={storeItem.epub_blob_url}
        bookTitle={storeItem.title}
        onClose={() => setShowReader(false)}
        onProgressChange={handleProgressChange}
      />
    )
  }

  // Book details page
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover */}
          <div className="flex-shrink-0">
            {storeItem.cover_blob_url ? (
              <img
                src={storeItem.cover_blob_url}
                alt={storeItem.title}
                className="w-64 h-96 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-64 h-96 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg shadow-lg flex items-center justify-center">
                <div className="text-center p-6">
                  <h3 className="text-white text-2xl font-bold mb-2">{storeItem.title}</h3>
                  <p className="text-white/80 text-sm">{storeItem.author_name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2">{storeItem.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">by {storeItem.author_name}</p>

            {storeItem.description && (
              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-foreground">{storeItem.description}</p>
              </div>
            )}

            {/* Price */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-foreground">
                {storeItem.price_usd === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  `$${storeItem.price_usd.toFixed(2)}`
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {hasAccess ? (
                <>
                  <button
                    onClick={() => setShowReader(true)}
                    className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    {readingProgress > 0 ? `Continue Reading (${Math.round(readingProgress)}%)` : 'Start Reading'}
                  </button>
                  {!inVault && (
                    <button
                      onClick={handleAddToVault}
                      disabled={addingToShelf}
                      className="w-full md:w-auto px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      {addingToShelf ? 'Adding...' : 'Save to Vault'}
                    </button>
                  )}
                  {inVault && (
                    <div className="flex items-center gap-2 text-green-600">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-medium">In your vault</span>
                    </div>
                  )}
                </>
              ) : storeItem.price_usd === 0 ? (
                <button
                  onClick={() => {
                    setHasAccess(true)
                    setShowReader(true)
                  }}
                  className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Read for Free
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('access_token')
                        const response = await fetch(`${API_URL}/api/v1/store/create-checkout`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            store_item_id: storeItem.id,
                            success_url: `${globalThis.location.origin}/store/success?item_id=${storeItem.id}`,
                            cancel_url: `${globalThis.location.origin}/read/${storeItem.id}`
                          })
                        })

                        if (response.ok) {
                          const data = await response.json()
                          globalThis.location.href = data.checkout_url
                        } else {
                          const error = await response.json()
                          alert(`Checkout failed: ${error.detail || 'Unknown error'}`)
                        }
                      } catch (error) {
                        console.error('Checkout error:', error)
                        alert('Failed to initiate checkout. Please try again.')
                      }
                    }}
                    className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Purchase for ${storeItem.price_usd.toFixed(2)}
                  </button>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Purchase required to read this book</span>
                  </div>
                </div>
              )}
            </div>

            {/* Reading Info */}
            <div className="mt-8 p-4 bg-accent rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Read with Workshelf</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Adjustable font size and themes</li>
                <li>• Text-to-speech with natural voices</li>
                <li>• Automatic progress sync across devices</li>
                <li>• Available on mobile and desktop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
