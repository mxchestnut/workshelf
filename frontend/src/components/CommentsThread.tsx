import { useEffect, useState } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { toast } from '../services/toast'

interface Reaction {
  id: number
  comment_id: number
  user_id: number
  user: { id: number; username: string }
  reaction_type: string
  created_at: string
}

interface Comment {
  id: number
  document_id: number
  parent_id?: number | null
  anchor?: Record<string, any> | null
  user?: { id: number; username: string }
  author?: { id: number; username: string }
  content: string
  reactions?: Reaction[]
  created_at: string
  updated_at?: string
  replies?: Comment[]
}

interface Props {
  documentId: number
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

export function CommentsThread({ documentId }: Props) {
  const [pendingAnchor, setPendingAnchor] = useState<Record<string, any> | null>(null)
  const [highlightedAnchor, setHighlightedAnchor] = useState<Record<string, any> | null>(null)
  ;(window as any).setPendingCommentAnchor = (anchor: Record<string, any>) => {
    setPendingAnchor(anchor)
  }
  ;(window as any).getHighlightedCommentAnchor = () => highlightedAnchor
  
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    loadComments()
    loadCurrentUser()
  }, [documentId])

  const loadCurrentUser = async () => {
    try {
      const token = getToken()
      if (!token) return
      const response = await fetch(`${API_URL}/api/v1/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.id)
      }
    } catch (err) {
      console.error('Failed to load current user:', err)
    }
  }

  const getToken = () => localStorage.getItem('access_token')

  const [limit] = useState<number>(25)
  const [offset, setOffset] = useState<number>(0)
  const [totalLoaded, setTotalLoaded] = useState<number>(0)

  const loadComments = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments/documents/${documentId}/comments?limit=${limit}&offset=${offset}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to load comments')
      const data = await response.json()
      setComments(data || [])
      setTotalLoaded((data || []).length)
    } catch (err: any) {
      setError(err.message || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const postComment = async (content: string, parent_id?: number, anchor?: Record<string, any> | null) => {
    try {
      setSubmitting(true)
      setError(null)
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content, parent_id: parent_id || null, anchor: anchor || null })
      })
      if (!response.ok) throw new Error('Failed to post comment')
      setNewComment('')
      setPendingAnchor(null)
      await loadComments()
      toast.success('Comment posted successfully')
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to post comment'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const react = async (commentId: number, reaction_type: string = 'like') => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reaction_type })
      })
      if (!response.ok) throw new Error('Failed to react')
      await loadComments()
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to react'
      setError(errorMsg)
      toast.error(errorMsg)
    }
  }

  const removeReaction = async (commentId: number, reaction_type: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments/${commentId}/reactions/${reaction_type}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to remove reaction')
      await loadComments()
    } catch (err: any) {
      setError(err.message || 'Failed to remove reaction')
    }
  }

  const CommentItem = ({ c }: { c: Comment }) => {
    const [reply, setReply] = useState('')
    const [replying, setReplying] = useState(false)

    const submitReply = async () => {
      if (!reply.trim()) return
      setReplying(true)
      await postComment(reply, c.id)
      setReply('')
      setReplying(false)
    }

    const reactionTypes = ['like','love','insightful','question']
    
    // Aggregate reaction counts
    const reactionCounts = reactionTypes.reduce((acc, type) => {
      const count = c.reactions?.filter(r => r.reaction_type === type).length || 0
      acc[type] = count
      return acc
    }, {} as Record<string, number>)

    // Check if current user has reacted with each type
    const userReactions = reactionTypes.reduce((acc, type) => {
      acc[type] = c.reactions?.some(r => r.user_id === currentUserId && r.reaction_type === type) || false
      return acc
    }, {} as Record<string, boolean>)

    const toggleReaction = async (type: string) => {
      if (userReactions[type]) {
        await removeReaction(c.id, type)
      } else {
        await react(c.id, type)
      }
    }

    return (
      <div className="py-4"
        onMouseEnter={() => c.anchor?.text && setHighlightedAnchor(c.anchor)}
        onMouseLeave={() => setHighlightedAnchor(null)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold">{c.author?.username || c.user?.username || 'User'}</div>
            <div className="text-sm mt-1">{c.content}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(c.created_at).toLocaleString()}
              {c.anchor?.text && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded cursor-pointer" title="Anchored to text">
                  📍 "{c.anchor.text.slice(0,40)}{c.anchor.text.length>40?'…':''}"
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-2">
              {reactionTypes.map(rt => (
                <button
                  key={rt}
                  onClick={() => toggleReaction(rt)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    userReactions[rt]
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border hover:bg-neutral-lightest'
                  }`}
                  title={userReactions[rt] ? `Remove ${rt}` : `React: ${rt}`}
                >
                  {rt} {reactionCounts[rt] > 0 && `(${reactionCounts[rt]})`}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Replies */}
        {c.replies && c.replies.length > 0 && (
          <div className="pl-4 mt-3 border-l">
            {c.replies.map(r => (
              <CommentItem key={r.id} c={r} />
            ))}
          </div>
        )}
        {/* Reply form */}
        <div className="mt-3 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            className="flex-1 px-3 py-2 bg-background border border-border rounded"
          />
          <button
            onClick={submitReply}
            disabled={replying || !reply.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-sm font-semibold">Comments</h3>
        <div className="ml-auto flex gap-1 text-xs">
          <span className="px-2 py-1 rounded bg-neutral-lightest">💬 Select text → Click 💬 in toolbar</span>
        </div>
      </div>
      <div className="p-4">
        {/* New comment */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 bg-background border border-border rounded"
            />
            <button
              onClick={() => postComment(newComment, undefined, pendingAnchor)}
              disabled={submitting || !newComment.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {pendingAnchor && (
            <div className="text-xs text-muted-foreground px-2">
              📍 Anchored to: "{pendingAnchor.text?.slice(0,60)}{pendingAnchor.text?.length>60?'…':''}" 
              <button className="ml-2 underline hover:text-primary" onClick={() => setPendingAnchor(null)}>Clear</button>
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-muted-foreground">No comments yet. Be the first!</div>
        ) : (
          <div className="divide-y divide-border">
            {comments.map(c => (
              <CommentItem key={c.id} c={c} />
            ))}
          </div>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => { if (offset - limit >= 0) { setOffset(offset - limit); loadComments() } }}
            disabled={offset === 0 || loading}
            className="px-3 py-1.5 text-xs rounded border border-border disabled:opacity-50"
          >Previous</button>
          <div className="text-xs text-muted-foreground">Showing {comments.length} (offset {offset})</div>
          <button
            onClick={() => { if (totalLoaded >= limit) { setOffset(offset + limit); loadComments() } }}
            disabled={loading || comments.length < limit}
            className="px-3 py-1.5 text-xs rounded border border-border disabled:opacity-50"
          >Next</button>
        </div>
      </div>
    </div>
  )
}
