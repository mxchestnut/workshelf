import { useEffect, useState } from 'react'
import { MessageSquare, Send, ThumbsUp, Loader2 } from 'lucide-react'

interface Comment {
  id: number
  document_id: number
  parent_id?: number | null
  anchor?: string | null
  author: { id: number; username: string }
  content: string
  reactions: { type: string; count: number }[]
  created_at: string
  replies?: Comment[]
}

interface Props {
  documentId: number
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

export function CommentsThread({ documentId }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    loadComments()
  }, [documentId])

  const getToken = () => localStorage.getItem('access_token')

  const loadComments = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments?document_id=${documentId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!response.ok) throw new Error('Failed to load comments')
      const data = await response.json()
      setComments(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const postComment = async (content: string, parent_id?: number) => {
    try {
      setSubmitting(true)
      setError(null)
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ document_id: documentId, content, parent_id: parent_id || null })
      })
      if (!response.ok) throw new Error('Failed to post comment')
      setNewComment('')
      await loadComments()
    } catch (err: any) {
      setError(err.message || 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const react = async (commentId: number, type: string = 'like') => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type })
      })
      if (!response.ok) throw new Error('Failed to react')
      await loadComments()
    } catch (err: any) {
      setError(err.message || 'Failed to react')
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

    return (
      <div className="py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">{c.author?.username || 'User'}</div>
            <div className="text-sm mt-1">{c.content}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(c.created_at).toLocaleString()}
              {c.anchor && ` • at ${c.anchor}`}
            </div>
          </div>
          <button
            onClick={() => react(c.id, 'like')}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-neutral-lightest"
            title="Like"
          >
            <ThumbsUp className="w-3 h-3" />
            {(c.reactions?.find(r => r.type === 'like')?.count ?? 0)}
          </button>
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
      </div>
      <div className="p-4">
        {/* New comment */}
        <div className="flex gap-2 mb-4">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 px-3 py-2 bg-background border border-border rounded"
          />
          <button
            onClick={() => postComment(newComment)}
            disabled={submitting || !newComment.trim()}
            className="px-3 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
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
      </div>
    </div>
  )
}
