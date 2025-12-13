import { useState } from 'react'
import { MessageSquare, Eye, Calendar, Dices } from 'lucide-react'
import { CharacterAvatar } from './CharacterAvatar'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface Character {
  id: number
  name: string
  avatar_url?: string | null
  species?: string | null
}

interface DiceRoll {
  id: number
  expression: string
  result: number
  details: string
  created_at: string
}

interface PassageReaction {
  id: number
  reaction_type: string
  user_id: number
  username?: string
}

interface Passage {
  id: number
  character_id: number
  character?: Character
  content: any // TipTap JSON
  word_count?: number
  scene_id?: number | null
  sequence_order: number
  is_ooc: boolean
  dice_rolls?: DiceRoll[]
  reactions?: PassageReaction[]
  created_at: string
  updated_at: string
}

interface PassageCardProps {
  passage: Passage
  onReact?: (passageId: number, reactionType: string) => void
  onComment?: (passageId: number) => void
  showSceneHeader?: boolean
  currentUserId?: number
}

function renderTipTapContent(content: any): string {
  // Simple TipTap JSON to text conversion
  // You can enhance this with proper TipTap rendering later
  if (!content) return ''
  
  const extractText = (node: any): string => {
    if (node.type === 'text') {
      return node.text || ''
    }
    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('')
    }
    return ''
  }
  
  return extractText(content)
}

export function PassageCard({ 
  passage, 
  onReact,
  onComment,
  currentUserId
}: PassageCardProps) {
  const [localReactions, setLocalReactions] = useState<PassageReaction[]>(
    passage.reactions || []
  )
  const [isReacting, setIsReacting] = useState(false)

  const reactionCounts = localReactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userReaction = localReactions.find(r => r.user_id === currentUserId)

  const handleReaction = async (reactionType: string) => {
    if (isReacting) return
    
    setIsReacting(true)
    try {
      const token = localStorage.getItem('access_token')
      
      // If user already reacted with this type, remove it
      if (userReaction?.reaction_type === reactionType) {
        await fetch(`${API_URL}/api/v1/roleplay/passages/${passage.id}/reactions/${userReaction.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        setLocalReactions(localReactions.filter(r => r.id !== userReaction.id))
      } else {
        // Add new reaction
        const response = await fetch(`${API_URL}/api/v1/roleplay/passages/${passage.id}/reactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reaction_type: reactionType })
        })
        
        if (response.ok) {
          const newReaction = await response.json()
          // Remove old reaction if exists
          const filtered = localReactions.filter(r => r.user_id !== currentUserId)
          setLocalReactions([...filtered, newReaction])
        }
      }
      
      if (onReact) {
        onReact(passage.id, reactionType)
      }
    } catch (error) {
      console.error('Failed to react:', error)
    } finally {
      setIsReacting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return minutes === 0 ? 'Just now' : `${minutes}m ago`
      }
      return `${hours}h ago`
    }
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const contentText = renderTipTapContent(passage.content)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 ${
      passage.is_ooc ? 'border-yellow-500' : 'border-blue-500'
    } overflow-hidden`}>
      {/* Header */}
      <div className="p-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {passage.character && (
              <CharacterAvatar
                name={passage.character.name}
                avatarUrl={passage.character.avatar_url}
                species={passage.character.species}
                size="lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {passage.character?.name || 'Unknown Character'}
                </h3>
                {passage.is_ooc && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                    OOC
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(passage.created_at)}
                </span>
                {passage.word_count && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {passage.word_count} words
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 prose dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          {contentText}
        </p>
      </div>

      {/* Dice Rolls */}
      {passage.dice_rolls && passage.dice_rolls.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {passage.dice_rolls.map((roll) => (
            <div
              key={roll.id}
              className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm"
            >
              <Dices className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {roll.expression}
              </span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                = {roll.result}
              </span>
              {roll.details && (
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  {roll.details}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reactions Bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {['❤️', '👍', '😂', '😮', '🎉'].map((emoji) => {
              const count = reactionCounts[emoji] || 0
              const isActive = userReaction?.reaction_type === emoji
              
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  disabled={isReacting}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500'
                  } disabled:opacity-50`}
                >
                  <span>{emoji}</span>
                  {count > 0 && (
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          
          {onComment && (
            <button
              onClick={() => onComment(passage.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Comment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
