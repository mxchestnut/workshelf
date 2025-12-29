import { useState, useEffect } from 'react'
import { 
  User, BookOpen, Calendar, MapPin, Award, Globe, 
  Heart, Edit, History, X, Check, Clock, Plus
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { useAuth } from "../contexts/AuthContext"
import { Navigation } from '../components/Navigation'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

interface Author {
  id: number
  name: string
  bio?: string
  photo_url?: string
  birth_year?: number
  death_year?: number
  nationality?: string
  website?: string
  social_links?: Record<string, string>
  genres?: string[]
  awards?: string[]
  is_verified: boolean
  is_bestseller: boolean
  follower_count: number
  books_published: number
  total_sales: number
  is_following: boolean
}

interface Book {
  id: number
  title: string
  cover_url?: string
  final_price: number
  rating_average?: number
  rating_count: number
  published_at?: string
}

interface Edit {
  id: number
  user_id: number
  field_name: string
  old_value?: string
  new_value: string
  edit_summary?: string
  status: string
  created_at: string
  reviewed_at?: string
  rejection_reason?: string
}

export default function Author() {
  // Get author ID from URL path (e.g., /authors/123)
  const authorId = window.location.pathname.split('/authors/')[1]
  
  const [author, setAuthor] = useState<Author | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [revisions, setRevisions] = useState<Edit[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showRevisions, setShowRevisions] = useState(false)
  const [editSummary, setEditSummary] = useState('')
  const { user, login, logout } = useAuth()

  // Load user
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = () => {
    // User loading logic removed - placeholder function
  }

  // TipTap editor for bio editing
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write a biography for this author...',
      }),
      Typography,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
    ],
    content: author?.bio || '',
    editable: isEditing,
  })

  useEffect(() => {
    if (authorId) {
      loadAuthor()
      loadBooks()
      loadRevisions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId])

  useEffect(() => {
    if (editor && author?.bio) {
      editor.commands.setContent(author.bio)
    }
  }, [author?.bio, editor])

  const loadAuthor = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}`, { headers })
      if (!response.ok) throw new Error('Failed to load author')
      
      const data = await response.json()
      setAuthor(data)
    } catch (error) {
      console.error('Error loading author:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}/books`)
      if (!response.ok) throw new Error('Failed to load books')
      
      const data = await response.json()
      setBooks(data)
    } catch (error) {
      console.error('Error loading books:', error)
    }
  }

  const loadRevisions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(
        `${API_URL}/api/v1/authors/${authorId}/revisions?include_pending=true`,
        { headers }
      )
      if (!response.ok) throw new Error('Failed to load revisions')
      
      const data = await response.json()
      setRevisions(data)
    } catch (error) {
      console.error('Error loading revisions:', error)
    }
  }

  const handleFollow = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to follow author')
      
      setAuthor(prev => prev ? { ...prev, is_following: true, follower_count: prev.follower_count + 1 } : null)
    } catch (error) {
      console.error('Error following author:', error)
      alert('Failed to follow author')
    }
  }

  const handleUnfollow = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}/follow`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to unfollow author')
      
      setAuthor(prev => prev ? { ...prev, is_following: false, follower_count: Math.max(0, prev.follower_count - 1) } : null)
    } catch (error) {
      console.error('Error unfollowing author:', error)
      alert('Failed to unfollow author')
    }
  }

  const startEditing = () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      window.location.href = '/login'
      return
    }
    setIsEditing(true)
    editor?.setEditable(true)
  }

  const handleAddToVault = async (bookId: number, bookTitle: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/store/${bookId}/add-to-shelf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to add to vault')
      
      alert(`"${bookTitle}" added to your vault!`)
    } catch (error) {
      console.error('Error adding to vault:', error)
      alert('Failed to add book to vault')
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    editor?.setEditable(false)
    editor?.commands.setContent(author?.bio || '')
    setEditSummary('')
  }

  const submitEdit = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const newBio = editor?.getHTML() || ''
    
    try {
      const response = await fetch(`${API_URL}/api/v1/authors/${authorId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          field_name: 'bio',
          new_value: newBio,
          edit_summary: editSummary || 'Updated biography',
        }),
      })

      if (!response.ok) throw new Error('Failed to submit edit')
      
      alert('Edit submitted for moderation! It will appear after admin approval.')
      setIsEditing(false)
      editor?.setEditable(false)
      setEditSummary('')
      loadRevisions()
    } catch (error) {
      console.error('Error submitting edit:', error)
      alert('Failed to submit edit')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="authors" />
        <div className="ml-0 md:ml-80 transition-all duration-300">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Author Not Found</h1>
              <p style={{ color: '#B3B2B0' }}>The author you're looking for doesn't exist.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#37322E' }}>
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="authors" />
      
      {/* Main content with left margin for sidebar */}
      <div className="ml-0 md:ml-80 transition-all duration-300">
        {/* Header */}
        <div className="text-white py-16" style={{ 
        background: 'linear-gradient(135deg, #B34B0C 0%, #7C3306 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Author Photo */}
            <div className="flex-shrink-0">
              {author.photo_url ? (
                <img
                  src={author.photo_url}
                  alt={author.name}
                  className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl"
                  loading="lazy"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-white bg-opacity-20 flex items-center justify-center border-4 border-white shadow-xl">
                  <User className="w-20 h-20 text-white" />
                </div>
              )}
            </div>

            {/* Author Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-5xl font-bold">{author.name}</h1>
                {author.is_verified && (
                  <Check className="w-8 h-8 text-blue-300" />
                )}
              </div>

              <div className="flex flex-wrap gap-4 mb-4" style={{ color: '#FED7AA' }}>
                {author.birth_year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>
                      {author.birth_year}{author.death_year ? ` - ${author.death_year}` : ''}
                    </span>
                  </div>
                )}
                {author.nationality && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{author.nationality}</span>
                  </div>
                )}
                {author.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    <a href={author.website} target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
                      Website
                    </a>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="text-3xl font-bold">{author.follower_count}</div>
                  <div style={{ color: '#FED7AA' }}>Followers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{author.books_published}</div>
                  <div style={{ color: '#FED7AA' }}>Books</div>
                </div>
                {author.total_sales > 0 && (
                  <div>
                    <div className="text-3xl font-bold">{author.total_sales.toLocaleString()}</div>
                    <div style={{ color: '#FED7AA' }}>Sales</div>
                  </div>
                )}
              </div>

              {/* Genres */}
              {author.genres && author.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {author.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full text-sm"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#FFFFFF' }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Follow Button */}
              <div className="mt-6">
                {author.is_following ? (
                  <button
                    onClick={handleUnfollow}
                    className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                    style={{ color: '#B34B0C' }}
                  >
                    <Check className="w-5 h-5" />
                    Following
                  </button>
                ) : (
                  <button
                    onClick={handleFollow}
                    className="flex items-center gap-2 px-6 py-3 bg-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                    style={{ color: '#B34B0C' }}
                  >
                    <Heart className="w-5 h-5" />
                    Follow Author
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Biography - Wiki Style */}
            <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#524944' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Biography</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRevisions(!showRevisions)}
                    className="flex items-center gap-2 px-4 py-2 transition-colors rounded-lg"
                    style={{ color: '#B3B2B0' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#B3B2B0'}
                  >
                    <History className="w-5 h-5" />
                    History
                  </button>
                  {!isEditing ? (
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                      style={{ backgroundColor: '#B34B0C' }}
                    >
                      <Edit className="w-5 h-5" />
                      Edit Bio
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={cancelEditing}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <X className="w-5 h-5" />
                        Cancel
                      </button>
                      <button
                        onClick={submitEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                        Submit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Edit Summary (optional)
                  </label>
                  <input
                    type="text"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="Briefly describe your changes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              )}

              <div className={`prose max-w-none ${isEditing ? 'border-2 border-purple-300 rounded-lg p-4' : ''}`}>
                <EditorContent editor={editor} />
              </div>

              {!author.bio && !isEditing && (
                <p className="text-gray-500 italic">
                  No biography yet. Be the first to contribute!
                </p>
              )}
            </div>

            {/* Revision History */}
            {showRevisions && revisions.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Revision History</h2>
                <div className="space-y-4">
                  {revisions.map((edit) => (
                    <div key={edit.id} className="border-l-4 border-purple-300 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              Edited {edit.field_name}
                            </span>
                            {edit.status === 'pending' && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                            {edit.status === 'approved' && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Approved
                              </span>
                            )}
                            {edit.status === 'rejected' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center gap-1">
                                <X className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                          </div>
                          {edit.edit_summary && (
                            <p className="text-sm text-gray-600 mt-1">{edit.edit_summary}</p>
                          )}
                          {edit.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">Reason: {edit.rejection_reason}</p>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(edit.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Books */}
            <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#524944' }}>
              <h2 className="text-2xl font-bold text-white mb-6">Books by {author.name}</h2>
              
              {books.length === 0 ? (
                <p className="italic" style={{ color: '#B3B2B0' }}>No books available yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                  {books.map((book) => (
                    <div key={book.id} className="group">
                      <a
                        href={`/book/store-${book.id}`}
                        className="block cursor-pointer"
                      >
                        <div 
                          className="aspect-[2/3] rounded-lg shadow-md overflow-hidden mb-2 group-hover:shadow-xl transition-shadow"
                          style={{ background: 'linear-gradient(135deg, #6C6A68 0%, #524944 100%)' }}
                        >
                          {book.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-16 h-16" style={{ color: '#B3B2B0' }} />
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-white line-clamp-2 group-hover:opacity-80 transition-opacity">
                          {book.title}
                        </h3>
                        <p className="text-sm font-bold mt-1" style={{ color: '#B34B0C' }}>
                          ${book.final_price.toFixed(2)}
                        </p>
                      </a>
                      {/* Add to Vault Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          handleAddToVault(book.id, book.title)
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-white hover:opacity-90"
                        style={{ backgroundColor: '#7C3306' }}
                      >
                        <Plus className="w-3 h-3" />
                        Add to Shelf
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Awards */}
            {author.awards && author.awards.length > 0 && (
              <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: '#524944' }}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Awards
                </h3>
                <ul className="space-y-2">
                  {author.awards.map((award, index) => (
                    <li key={index} className="text-sm" style={{ color: '#B3B2B0' }}>
                      • {award}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Stats */}
            <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: '#524944' }}>
              <h3 className="text-lg font-bold text-white mb-4">Quick Facts</h3>
              <div className="space-y-3 text-sm">
                {author.is_bestseller && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Award className="w-4 h-4" />
                    <span>Bestselling Author</span>
                  </div>
                )}
                {author.books_published > 0 && (
                  <div className="flex items-center gap-2" style={{ color: '#B3B2B0' }}>
                    <BookOpen className="w-4 h-4" />
                    <span>{author.books_published} {author.books_published === 1 ? 'book' : 'books'} published</span>
                  </div>
                )}
                {author.is_verified && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Check className="w-4 h-4" />
                    <span>Verified Author</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
