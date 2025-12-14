import React, { useState } from 'react'
import { PassageEditor } from '../../components/PassageEditor'
import { BookOpen, Tag, Lock, Globe, X } from 'lucide-react'

interface CreateLoreEntryProps {
  readonly onSubmit: (data: {
    title: string
    content: any
    category: string
    tags: string[]
    is_public: boolean
  }) => Promise<void>
  readonly onCancel: () => void
}

const LORE_CATEGORIES = [
  { value: 'characters', label: 'Characters', icon: '👤' },
  { value: 'locations', label: 'Locations', icon: '🗺️' },
  { value: 'history', label: 'History', icon: '📜' },
  { value: 'magic', label: 'Magic/Powers', icon: '✨' },
  { value: 'items', label: 'Items/Artifacts', icon: '⚔️' },
  { value: 'factions', label: 'Factions/Groups', icon: '🏛️' },
  { value: 'events', label: 'Events', icon: '📅' },
  { value: 'other', label: 'Other', icon: '📝' },
]

export function CreateLoreEntry({ onSubmit, onCancel }: CreateLoreEntryProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<any>(null)
  const [category, setCategory] = useState<string>('other')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please enter a title for this lore entry')
      return
    }

    if (!content) {
      setError('Please write some content for this lore entry')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        content,
        category,
        tags,
        is_public: isPublic,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lore entry')
      setIsSubmitting(false)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().toLowerCase()
      if (!tags.includes(newTag)) {
        setTags([...tags, newTag])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Lore Entry
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="lore-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            id="lore-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., The Ancient Library of Mysteries"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LORE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`p-3 rounded-md border-2 transition-colors text-sm font-medium
                  ${category === cat.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                disabled={isSubmitting}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div>{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content *
          </label>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <PassageEditor
              content={content}
              onChange={setContent}
              placeholder="Describe this lore element in detail..."
              minHeight="300px"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Tag className="inline h-4 w-4 mr-1" />
            Tags (optional)
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type a tag and press Enter"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30
                             text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                      disabled={isSubmitting}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Public/Private Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="h-5 w-5 text-green-600" />
            ) : (
              <Lock className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {isPublic ? 'Public' : 'Private'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {isPublic
                  ? 'All participants can see this lore entry'
                  : 'Only you can see this lore entry'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isPublic ? 'bg-green-600' : 'bg-orange-600'}`}
            disabled={isSubmitting}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isPublic ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                Create Lore Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
