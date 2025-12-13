import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  BookOpen, 
  Users, 
  Plus, 
  Settings, 
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  Filter,
  List
} from 'lucide-react'
import { PassageCard } from '../../components/roleplay/PassageCard'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface RoleplayProject {
  id: number
  title: string
  description?: string
  genre: string
  rating: string
  posting_order?: string
  dice_system?: string
  owner_id: number
  group_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Character {
  id: number
  name: string
  avatar_url?: string | null
  species?: string | null
  age?: string | null
  is_main_character: boolean
}

interface Scene {
  id: number
  title: string
  description?: string | null
  sequence_order: number
  is_active: boolean
}

interface Passage {
  id: number
  character_id: number
  character?: Character
  content: any
  word_count?: number
  scene_id?: number | null
  sequence_order: number
  is_ooc: boolean
  dice_rolls?: any[]
  reactions?: any[]
  created_at: string
  updated_at: string
}

export function RoleplayProject() {
  const { projectId } = useParams<{ projectId: string }>()
  
  const [project, setProject] = useState<RoleplayProject | null>(null)
  const [passages, setPassages] = useState<Passage[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<number | null>(null)
  const [showOOC, setShowOOC] = useState(true)

  useEffect(() => {
    loadProjectData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadProjectData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('Please log in to view this roleplay')
        setLoading(false)
        return
      }

      // Parse token to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]))
      setCurrentUserId(payload.sub)

      // Load project details
      const projectResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!projectResponse.ok) {
        throw new Error('Failed to load project')
      }

      const projectData = await projectResponse.json()
      setProject(projectData)

      // Load passages
      const passagesResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}/passages`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (passagesResponse.ok) {
        const passagesData = await passagesResponse.json()
        setPassages(passagesData)
      }

      // Load characters
      const charactersResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}/characters`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (charactersResponse.ok) {
        const charactersData = await charactersResponse.json()
        setCharacters(charactersData)
      }

      // Load scenes
      const scenesResponse = await fetch(
        `${API_URL}/api/v1/roleplay/projects/${projectId}/scenes`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (scenesResponse.ok) {
        const scenesData = await scenesResponse.json()
        setScenes(scenesData)
        // Set active scene to the first active one
        const activeScene = scenesData.find((s: Scene) => s.is_active)
        if (activeScene) {
          setActiveSceneId(activeScene.id)
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading project:', err)
      setError('Failed to load roleplay project')
      setLoading(false)
    }
  }

  const handleReaction = (passageId: number, reactionType: string) => {
    // Optimistically update UI
    console.log('Reacted to passage', passageId, 'with', reactionType)
  }

  const filteredPassages = passages
    .filter(p => showOOC || !p.is_ooc)
    .filter(p => !activeSceneId || p.scene_id === activeSceneId)
    .sort((a, b) => a.sequence_order - b.sequence_order)

  const activeScene = scenes.find(s => s.id === activeSceneId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {error || 'Project not found'}
          </h2>
          <Link
            to="/roleplays"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Back to Roleplays
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {project.title}
                  </h1>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Link
                  to={`/roleplay/${projectId}/characters`}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Characters</span>
                </Link>
                <Link
                  to={`/roleplay/${projectId}/lore`}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Lore</span>
                </Link>
                <Link
                  to={`/roleplay/${projectId}/settings`}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                {project.genre}
              </span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                {project.rating}
              </span>
              {project.posting_order && (
                <span>Posting: {project.posting_order}</span>
              )}
              {project.dice_system && (
                <span>Dice: {project.dice_system}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Scenes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-3">
                <List className="w-4 h-4" />
                Scenes
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveSceneId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSceneId === null
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All Passages
                </button>
                {scenes.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setActiveSceneId(scene.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSceneId === scene.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {scene.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-3">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showOOC}
                  onChange={(e) => setShowOOC(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show OOC posts
              </label>
            </div>

            {/* Characters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 mb-3">
                <Users className="w-4 h-4" />
                Characters
              </h2>
              <div className="space-y-2">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      character.is_main_character ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {character.name}
                    </span>
                  </div>
                ))}
                <Link
                  to={`/roleplay/${projectId}/characters/new`}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Character
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Active Scene Header */}
            {activeScene && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-2">{activeScene.title}</h2>
                {activeScene.description && (
                  <p className="text-blue-100">{activeScene.description}</p>
                )}
              </div>
            )}

            {/* New Passage Button */}
            <Link
              to={`/roleplay/${projectId}/passages/new`}
              className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Write a New Passage</span>
            </Link>

            {/* Passages Feed */}
            {filteredPassages.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No passages yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Be the first to write in this roleplay!
                </p>
                <Link
                  to={`/roleplay/${projectId}/passages/new`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Write First Passage
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPassages.map((passage) => (
                  <PassageCard
                    key={passage.id}
                    passage={passage}
                    onReact={handleReaction}
                    currentUserId={currentUserId || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
