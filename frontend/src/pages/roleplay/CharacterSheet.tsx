import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  Save, 
  ArrowLeft, 
  Loader2,
  AlertCircle,
  X,
  Plus
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface Character {
  id?: number
  name: string
  avatar_url?: string | null
  species?: string | null
  age?: string | null
  gender?: string | null
  personality?: string | null
  backstory?: string | null
  appearance?: string | null
  stats?: Record<string, any> | null
  is_main_character: boolean
}

export function CharacterSheet() {
  const { projectId, characterId } = useParams<{ projectId: string; characterId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [character, setCharacter] = useState<Character>({
    name: '',
    avatar_url: null,
    species: null,
    age: null,
    gender: null,
    personality: null,
    backstory: null,
    appearance: null,
    stats: null,
    is_main_character: false
  })
  const [customStat, setCustomStat] = useState({ key: '', value: '' })

  useEffect(() => {
    if (characterId && characterId !== 'new') {
      loadCharacter()
    }
  }, [characterId])

  const loadCharacter = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(
        `${API_URL}/api/v1/roleplay/characters/${characterId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load character')
      }

      const data = await response.json()
      setCharacter(data)
    } catch (err) {
      console.error('Error loading character:', err)
      setError('Failed to load character')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      const isNew = !characterId || characterId === 'new'
      
      const payload = {
        ...character,
        project_id: parseInt(projectId!)
      }

      const response = await fetch(
        isNew
          ? `${API_URL}/api/v1/roleplay/characters`
          : `${API_URL}/api/v1/roleplay/characters/${characterId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save character')
      }

      await response.json()
      navigate(`/roleplay/${projectId}`)
    } catch (err: any) {
      console.error('Error saving character:', err)
      setError(err.message || 'Failed to save character')
    } finally {
      setSaving(false)
    }
  }

  const addCustomStat = () => {
    if (customStat.key && customStat.value) {
      setCharacter({
        ...character,
        stats: {
          ...(character.stats || {}),
          [customStat.key]: customStat.value
        }
      })
      setCustomStat({ key: '', value: '' })
    }
  }

  const removeStat = (key: string) => {
    if (character.stats) {
      const newStats = { ...character.stats }
      delete newStats[key]
      setCharacter({ ...character, stats: newStats })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to={`/roleplay/${projectId}`}
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roleplay
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {characterId === 'new' ? 'Create Character' : 'Edit Character'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 dark:text-red-100">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Character Name *
                </label>
                <input
                  type="text"
                  required
                  value={character.name}
                  onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter character name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Species
                  </label>
                  <input
                    type="text"
                    value={character.species || ''}
                    onChange={(e) => setCharacter({ ...character, species: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="Human, Elf, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Age
                  </label>
                  <input
                    type="text"
                    value={character.age || ''}
                    onChange={(e) => setCharacter({ ...character, age: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="25, Adult, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gender
                  </label>
                  <input
                    type="text"
                    value={character.gender || ''}
                    onChange={(e) => setCharacter({ ...character, gender: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    placeholder="Male, Female, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={character.avatar_url || ''}
                  onChange={(e) => setCharacter({ ...character, avatar_url: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={character.is_main_character}
                    onChange={(e) => setCharacter({ ...character, is_main_character: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Main Character (PC)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Check if this is a player character (vs. NPC)
                </p>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Appearance
            </h2>
            <textarea
              value={character.appearance || ''}
              onChange={(e) => setCharacter({ ...character, appearance: e.target.value || null })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your character's physical appearance..."
            />
          </div>

          {/* Personality */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Personality
            </h2>
            <textarea
              value={character.personality || ''}
              onChange={(e) => setCharacter({ ...character, personality: e.target.value || null })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your character's personality, traits, quirks..."
            />
          </div>

          {/* Backstory */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Backstory
            </h2>
            <textarea
              value={character.backstory || ''}
              onChange={(e) => setCharacter({ ...character, backstory: e.target.value || null })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Write your character's history, background, origins..."
            />
          </div>

          {/* Custom Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Custom Stats & Attributes
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add any custom stats, skills, or attributes for your character
            </p>

            {/* Existing Stats */}
            {character.stats && Object.keys(character.stats).length > 0 && (
              <div className="space-y-2 mb-4">
                {Object.entries(character.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100 flex-1">
                      {key}:
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {JSON.stringify(value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStat(key)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Stat */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customStat.key}
                onChange={(e) => setCustomStat({ ...customStat, key: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Stat name (e.g., Strength)"
              />
              <input
                type="text"
                value={customStat.value}
                onChange={(e) => setCustomStat({ ...customStat, value: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                placeholder="Value (e.g., 18 or High)"
              />
              <button
                type="button"
                onClick={addCustomStat}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              to={`/roleplay/${projectId}`}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Character
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
