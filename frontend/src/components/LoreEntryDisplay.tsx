import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { BookOpen, Tag, Lock, Edit2, Trash2, Calendar } from 'lucide-react'

interface LoreEntry {
  id: number
  title: string
  content: any
  category: string
  tags: string[]
  is_public: boolean
  author: {
    id: number
    username: string
  }
  created_at: string
  updated_at: string
}

interface LoreEntryDisplayProps {
  readonly entry: LoreEntry
  readonly currentUserId?: number
  readonly onEdit?: (entry: LoreEntry) => void
  readonly onDelete?: (entryId: number) => void
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  characters: { label: 'Characters', icon: '👤', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  locations: { label: 'Locations', icon: '🗺️', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  history: { label: 'History', icon: '📜', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  magic: { label: 'Magic/Powers', icon: '✨', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  items: { label: 'Items/Artifacts', icon: '⚔️', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  factions: { label: 'Factions/Groups', icon: '🏛️', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  events: { label: 'Events', icon: '📅', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  other: { label: 'Other', icon: '📝', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
}

export function LoreEntryDisplay({ entry, currentUserId, onEdit, onDelete }: LoreEntryDisplayProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: entry.content,
    editable: false,
  })

  const categoryConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other
  const isAuthor = currentUserId === entry.author.id

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })
  }

  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${categoryConfig.color}`}>
                <span>{categoryConfig.icon}</span>
                <span>{categoryConfig.label}</span>
              </span>
              {!entry.is_public && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  <Lock className="h-3 w-3" />
                  Private
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {entry.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>by {entry.author.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(entry.created_at)}</span>
              </div>
              {entry.updated_at !== entry.created_at && (
                <span className="text-xs italic">
                  (edited {formatDate(entry.updated_at)})
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isAuthor && (onEdit || onDelete) && (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(entry)}
                  className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Edit lore entry"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this lore entry?')) {
                      onDelete(entry.id)
                    }
                  }}
                  className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Delete lore entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <Tag className="h-4 w-4 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                           rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none
                   dark:prose-invert
                   prose-headings:text-gray-900 dark:prose-headings:text-white
                   prose-p:text-gray-700 dark:prose-p:text-gray-300
                   prose-strong:text-gray-900 dark:prose-strong:text-white
                   prose-em:text-gray-700 dark:prose-em:text-gray-300
                   prose-code:text-gray-900 dark:prose-code:text-white
                   prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900
                   prose-a:text-blue-600 dark:prose-a:text-blue-400"
        />
      </div>
    </article>
  )
}
