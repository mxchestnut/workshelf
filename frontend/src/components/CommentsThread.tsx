import { useEffect, useState } from 'react'
import { MessageSquare, Send, ThumbsUp, Loader2 } from 'lucide-react'

interface Comment {
  id: number
  document_id: number
  parent_id?: number | null
  anchor?: Record<string, any> | null
  user?: { id: number; username: string }
  author?: { id: number; username: string }
  content: string
  reactions?: { reaction_type: string; count: number }[]
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
  ;(window as any).setPendingCommentAnchor = (anchor: Record<string, any>) => {
    setPendingAnchor(anchor)
  }
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  useEffect(() => {
    loadComments()
  }, [documentId])

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
      await loadComments()
    } catch (err: any) {
      setError(err.message || 'Failed to post comment')
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

    const reactionTypes = ['like','love','insightful','question']

    return (
      <div className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm font-semibold">{c.author?.username || c.user?.username || 'User'}</div>
            <div className="text-sm mt-1">{c.content}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(c.created_at).toLocaleString()}
              {c.anchor?.text && ` • “${c.anchor.text.slice(0,40)}${c.anchor.text.length>40?'…':''}”`}
            </div>
            <div className="flex gap-2 mt-2">
              {reactionTypes.map(rt => (
                <button
                  key={rt}
                  onClick={() => react(c.id, rt)}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-neutral-lightest"
                  title={`React: ${rt}`}
                >
                  {rt}
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
          <span className="px-2 py-1 rounded bg-neutral-lightest">Anchor via editor selection → 💬</span>
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
            <div className="text-xs text-muted-foreground px-2">Anchored to selection: “{pendingAnchor.text?.slice(0,60)}{pendingAnchor.text?.length>60?'…':''}” <button className="ml-2 underline" onClick={() => setPendingAnchor(null)}>Clear</button></div>
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
