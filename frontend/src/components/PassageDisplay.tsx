/**
 * Passage Display - Show IC (in-character) posts in the roleplay
 */

import { useState } from 'react'
import { MessageCircle, Heart, Edit, Trash2 } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'

interface PassageProps {
  passage: {
    id: number
    content: any // TipTap JSON
    character: {
      id: number
      name: string
      avatar_url?: string
    }
    author: {
      id: number
      username: string
    }
    created_at: string
    updated_at: string
    word_count?: number
    reaction_count?: number
    user_reaction?: string | null
  }
  currentUserId?: number
  onEdit?: (passageId: number) => void
  onDelete?: (passageId: number) => void
  onReact?: (passageId: number, emoji: string) => void
}

export function PassageDisplay({
  passage,
  currentUserId,
  onEdit,
  onDelete,
  onReact
}: PassageProps) {
  const [showActions, setShowActions] = useState(false)
  const isAuthor = currentUserId === passage.author.id

  // Create editor instance to display content
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
      TextAlign
    ],
    content: passage.content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none'
      }
    }
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Character Avatar */}
        <div className="flex-shrink-0">
          {passage.character.avatar_url ? (
            <img
              src={passage.character.avatar_url}
              alt={passage.character.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {passage.character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Character & Author Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-semibold text-lg">
              {passage.character.name}
            </h3>
            <span className="text-sm text-muted-foreground">
              by @{passage.author.username}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(passage.created_at)}
            {passage.updated_at !== passage.created_at && ' (edited)'}
            {passage.word_count && ` · ${passage.word_count} words`}
          </div>
        </div>

        {/* Actions (show on hover if author) */}
        {isAuthor && showActions && (
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={() => onEdit(passage.id)}
                className="p-2 hover:bg-accent rounded-lg"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(passage.id)}
                className="p-2 hover:bg-accent rounded-lg text-red-500"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <EditorContent editor={editor} />
      </div>

      {/* Footer - Reactions */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t">
        <button
          onClick={() => onReact && onReact(passage.id, '❤️')}
          className={`flex items-center gap-1 text-sm hover:text-primary transition-colors ${
            passage.user_reaction === '❤️' ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Heart className="w-4 h-4" fill={passage.user_reaction === '❤️' ? 'currentColor' : 'none'} />
          {passage.reaction_count || 0}
        </button>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <MessageCircle className="w-4 h-4" />
          Reply
        </button>
      </div>
    </div>
  )
}
