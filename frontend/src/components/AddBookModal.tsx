import { useState } from 'react'
import { X, Search, BookOpen, Plus, Loader2 } from 'lucide-react'

interface AddBookModalProps {
  isOpen: boolean
  onClose: () => void
  onBookAdded: () => void
}

interface BookSearchResult {
  isbn: string
  title: string
  author: string
  cover_url?: string
  publisher?: string
  publish_year?: number
  page_count?: number
  description?: string
}

export default function AddBookModal({ isOpen, onClose, onBookAdded }: AddBookModalProps) {
  const [searchMode, setSearchMode] = useState<'isbn' | 'manual'>('isbn')
  const [isbnQuery, setIsbnQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<BookSearchResult | null>(null)
  const [adding, setAdding] = useState(false)

  // Manual entry form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    cover_url: '',
    publisher: '',
    publish_year: '',
    page_count: '',
    description: '',
    status: 'want-to-read' as string,
    rating: '',
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const handleSearchISBN = async () => {
    if (!isbnQuery.trim()) return

    setSearching(true)
    setSearchResult(null)

    try {
      // Try Google Books API
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnQuery}`
      )
      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo
        const result: BookSearchResult = {
          isbn: isbnQuery,
          title: book.title || '',
          author: book.authors?.join(', ') || '',
          cover_url: book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '',
          publisher: book.publisher || '',
          publish_year: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : undefined,
          page_count: book.pageCount || undefined,
          description: book.description || '',
        }
        setSearchResult(result)
      } else {
        alert('No book found with this ISBN. Try manual entry instead.')
      }
    } catch (error) {
      console.error('Failed to search ISBN:', error)
      alert('Failed to search for book. Please try manual entry.')
    } finally {
      setSearching(false)
    }
  }

  const handleAddFromSearch = async () => {
    if (!searchResult) return

    setAdding(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_type: 'book',
          isbn: searchResult.isbn,
          title: searchResult.title,
          author: searchResult.author,
          cover_url: searchResult.cover_url,
          publisher: searchResult.publisher,
          publish_year: searchResult.publish_year,
          page_count: searchResult.page_count,
          description: searchResult.description,
          status: 'want-to-read',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add book')
      }

      // Reset and close
      setSearchResult(null)
      setIsbnQuery('')
      onBookAdded()
      onClose()
    } catch (error: any) {
      console.error('Failed to add book:', error)
      alert(error.message || 'Failed to add book to shelf')
    } finally {
      setAdding(false)
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.author) {
      alert('Title and author are required')
      return
    }

    setAdding(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          item_type: 'book',
          isbn: formData.isbn || undefined,
          title: formData.title,
          author: formData.author,
          cover_url: formData.cover_url || undefined,
          publisher: formData.publisher || undefined,
          publish_year: formData.publish_year ? parseInt(formData.publish_year) : undefined,
          page_count: formData.page_count ? parseInt(formData.page_count) : undefined,
          description: formData.description || undefined,
          status: formData.status,
          rating: formData.rating ? parseInt(formData.rating) : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to add book')
      }

      // Reset and close
      setFormData({
        title: '',
        author: '',
        isbn: '',
        cover_url: '',
        publisher: '',
        publish_year: '',
        page_count: '',
        description: '',
        status: 'want-to-read',
        rating: '',
      })
      onBookAdded()
      onClose()
    } catch (error: any) {
      console.error('Failed to add book:', error)
      alert(error.message || 'Failed to add book to shelf')
    } finally {
      setAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold">Add Book to Shelf</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSearchMode('isbn')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchMode === 'isbn'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4 inline mr-2" />
              ISBN Search
            </button>
            <button
              onClick={() => setSearchMode('manual')}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchMode === 'manual'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {searchMode === 'isbn' ? (
            <div className="space-y-4">
              {/* ISBN Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={isbnQuery}
                    onChange={(e) => setIsbnQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchISBN()}
                    placeholder="Enter ISBN-10 or ISBN-13"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSearchISBN}
                    disabled={searching || !isbnQuery.trim()}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  We'll search Google Books for this ISBN
                </p>
              </div>

              {/* Search Result */}
              {searchResult && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex gap-4">
                    {searchResult.cover_url ? (
                      <img
                        src={searchResult.cover_url}
                        alt={searchResult.title}
                        className="w-24 h-32 object-cover rounded-lg shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {searchResult.title}
                      </h3>
                      <p className="text-gray-600 mb-2">{searchResult.author}</p>
                      {searchResult.publisher && (
                        <p className="text-sm text-gray-500">
                          {searchResult.publisher}
                          {searchResult.publish_year && ` (${searchResult.publish_year})`}
                        </p>
                      )}
                      {searchResult.page_count && (
                        <p className="text-sm text-gray-500">
                          {searchResult.page_count} pages
                        </p>
                      )}
                      {searchResult.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                          {searchResult.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleAddFromSearch}
                    disabled={adding}
                    className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {adding ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add to Bookshelf
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAddManual} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Book title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN (optional)
                </label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  placeholder="ISBN-10 or ISBN-13"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="want-to-read">📚 Want to Read</option>
                  <option value="reading">📖 Currently Reading</option>
                  <option value="read">✅ Read</option>
                  <option value="dnf">❌ Did Not Finish</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  placeholder="Optional rating"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Cover URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cover Image URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.cover_url}
                  onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Publisher & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    placeholder="Publisher"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year (optional)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="2100"
                    value={formData.publish_year}
                    onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                    placeholder="2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Page Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Count (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.page_count}
                  onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                  placeholder="Number of pages"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Book description or synopsis"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={adding}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Adding Book...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Bookshelf
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
