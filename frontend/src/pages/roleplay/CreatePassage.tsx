/**
 * Create Passage Form - Write new IC (in-character) posts
 */

import { useState, useEffect } from 'react'
import { PassageEditor } from '../../components/PassageEditor'
import { Send, X } from 'lucide-react'

interface Character {
  id: number
  name: string
  avatar_url?: string | null
}

interface Scene {
  id: number
  title: string
}

interface CreatePassageProps {
  projectId: string
  characters: Character[]
  scenes: Scene[]
  onSubmit: (data: {
    content: any
    character_id: number
    scene_id?: number
  }) => Promise<void>
  onCancel: () => void
}

export function CreatePassage({
  projectId: _projectId,
  characters,
  scenes,
  onSubmit,
  onCancel
}: CreatePassageProps) {
  const [content, setContent] = useState<any>(null)
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null)
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first character if only one exists
  useEffect(() => {
    if (characters.length === 1) {
      setSelectedCharacterId(characters[0].id)
    }
  }, [characters])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedCharacterId) {
      setError('Please select a character')
      return
    }

    if (!content || !content.content || content.content.length === 0) {
      setError('Please write some content')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        content,
        character_id: selectedCharacterId,
        scene_id: selectedSceneId || undefined
      })
      // Form will be closed by parent
    } catch (err: any) {
      setError(err.message || 'Failed to create passage')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">New Passage</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-accent rounded-lg"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Character Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Character <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCharacterId || ''}
            onChange={(e) => setSelectedCharacterId(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg bg-background"
            required
          >
            <option value="">Select a character...</option>
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scene Selection (Optional) */}
        {scenes.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Scene (Optional)
            </label>
            <select
              value={selectedSceneId || ''}
              onChange={(e) => setSelectedSceneId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="">No specific scene</option>
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          <PassageEditor
            content={content}
            onChange={setContent}
            placeholder="Write your character's post..."
            minHeight="300px"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg hover:bg-accent"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Posting...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Post Passage
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
