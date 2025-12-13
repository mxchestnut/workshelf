import { useState } from 'react'
import { BookOpen, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface CreateForm {
  title: string
  description: string
  genre: string
  rating: string
  posting_order: string
  dice_system: string
  min_post_length: string
}

export function CreateRoleplay() {
  const [form, setForm] = useState<CreateForm>({
    title: '',
    description: '',
    genre: 'fantasy',
    rating: 'pg-13',
    posting_order: 'free-form',
    dice_system: 'none',
    min_post_length: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to create a roleplay')
        setLoading(false)
        return
      }

      // Step 1: Create the base project
      const projectResponse = await fetch(`${API_URL}/api/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          content: 'Roleplay project',
          is_public: false
        })
      })

      if (!projectResponse.ok) {
        throw new Error('Failed to create project')
      }

      const project = await projectResponse.json()

      // Step 2: Create the roleplay settings
      const roleplayResponse = await fetch(`${API_URL}/api/v1/roleplay/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: project.id,
          genre: form.genre,
          rating: form.rating,
          posting_order: form.posting_order,
          dice_system: form.dice_system,
          dice_enabled: form.dice_system !== 'none',
          min_post_length: form.min_post_length ? parseInt(form.min_post_length) : null,
          has_lore_wiki: true,
          has_character_sheets: true,
          has_maps: false
        })
      })

      if (!roleplayResponse.ok) {
        throw new Error('Failed to create roleplay settings')
      }

      const roleplay = await roleplayResponse.json()

      // Redirect to the new roleplay
      window.location.href = `/roleplay/${roleplay.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create roleplay')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <a
              href="/roleplays"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Create New Roleplay
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set up your roleplay project
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
            </div>
          )}

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter roleplay title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your roleplay..."
              />
            </div>

            {/* Genre */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Genre *
              </label>
              <select
                required
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="fantasy">Fantasy</option>
                <option value="sci-fi">Sci-Fi</option>
                <option value="modern">Modern</option>
                <option value="historical">Historical</option>
                <option value="horror">Horror</option>
                <option value="romance">Romance</option>
                <option value="slice-of-life">Slice of Life</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Rating *
              </label>
              <select
                required
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="g">G - General Audiences</option>
                <option value="pg">PG - Parental Guidance</option>
                <option value="pg-13">PG-13 - Teens</option>
                <option value="r">R - Mature (17+)</option>
                <option value="nc-17">NC-17 - Adults Only (18+)</option>
              </select>
            </div>

            {/* Posting Order */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Posting Order *
              </label>
              <select
                required
                value={form.posting_order}
                onChange={(e) => setForm({ ...form, posting_order: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="free-form">Free Form</option>
                <option value="strict">Strict Turn Order</option>
                <option value="flexible">Flexible Order</option>
              </select>
            </div>

            {/* Dice System */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Dice System
              </label>
              <select
                value={form.dice_system}
                onChange={(e) => setForm({ ...form, dice_system: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">None</option>
                <option value="d20">D20 System</option>
                <option value="d6">D6 Pool</option>
                <option value="fate">Fate Dice</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Minimum Post Length */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Minimum Post Length (words)
              </label>
              <input
                type="number"
                min="0"
                value={form.min_post_length}
                onChange={(e) => setForm({ ...form, min_post_length: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Optional minimum..."
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Leave blank for no minimum
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Create Roleplay
                </>
              )}
            </button>
            <a
              href="/roleplays"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
