import { useState } from 'react'
import { Dices, Plus, Trash2, Play, History } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://workshelf.dev'

interface DiceRoll {
  id: number
  expression: string
  result: number
  details: string
  created_at: string
}

interface DiceRollerProps {
  readonly projectId: number
  readonly passageId?: number
  readonly onRollComplete?: (roll: DiceRoll) => void
}

const presetDice = [
  { label: 'd4', value: '1d4' },
  { label: 'd6', value: '1d6' },
  { label: 'd8', value: '1d8' },
  { label: 'd10', value: '1d10' },
  { label: 'd12', value: '1d12' },
  { label: 'd20', value: '1d20' },
  { label: 'd100', value: '1d100' },
]

const commonRolls = [
  { label: 'Advantage', value: '2d20kh1', description: 'Roll 2d20, keep highest' },
  { label: 'Disadvantage', value: '2d20kl1', description: 'Roll 2d20, keep lowest' },
  { label: 'Stats (3d6)', value: '3d6', description: 'Standard ability score' },
  { label: 'Stats (4d6kh3)', value: '4d6kh3', description: 'Roll 4d6, keep highest 3' },
]

export function DiceRoller({ projectId, passageId, onRollComplete }: DiceRollerProps) {
  const [expression, setExpression] = useState('')
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<DiceRoll | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<DiceRoll[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const rollDice = async () => {
    if (!expression.trim()) return

    setRolling(true)
    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/roleplay/dice/roll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          passage_id: passageId,
          expression: expression.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Invalid dice expression')
      }

      const rollData = await response.json()
      setResult(rollData)
      setHistory([rollData, ...history])
      
      if (onRollComplete) {
        onRollComplete(rollData)
      }
    } catch (err: any) {
      console.error('Error rolling dice:', err)
      setError(err.message || 'Failed to roll dice')
    } finally {
      setRolling(false)
    }
  }

  const addToExpression = (value: string) => {
    setExpression(expression + value)
  }

  const clearExpression = () => {
    setExpression('')
    setResult(null)
    setError(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      rollDice()
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Dices className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Dice Roller</h3>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Dice Expression Input */}
        <div className="space-y-2">
          <label htmlFor="dice-expression" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dice Expression
          </label>
          <div className="flex gap-2">
            <input
              id="dice-expression"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 2d6+3 or 4d6kh3"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 font-mono"
            />
            <button
              onClick={clearExpression}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Clear"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Examples: 1d20, 2d6+3, 4d6kh3 (keep highest 3), 2d20kl1 (keep lowest 1)
          </p>
        </div>

        {/* Quick Dice Buttons */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Add
          </label>
          <div className="flex flex-wrap gap-2">
            {presetDice.map((dice) => (
              <button
                key={dice.value}
                onClick={() => addToExpression(dice.value)}
                className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors text-sm font-medium"
              >
                {dice.label}
              </button>
            ))}
            <button
              onClick={() => addToExpression('+')}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              +
            </button>
            <button
              onClick={() => addToExpression('-')}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              −
            </button>
          </div>
        </div>

        {/* Common Roll Presets */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Common Rolls
          </label>
          <div className="grid grid-cols-2 gap-2">
            {commonRolls.map((roll) => (
              <button
                key={roll.value}
                onClick={() => setExpression(roll.value)}
                className="px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200 rounded-lg hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors text-sm text-left"
                title={roll.description}
              >
                <div className="font-medium">{roll.label}</div>
                <div className="text-xs text-purple-600 dark:text-purple-400">{roll.value}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Roll Button */}
        <button
          onClick={rollDice}
          disabled={rolling || !expression.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className={`w-5 h-5 ${rolling ? 'animate-spin' : ''}`} />
          {rolling ? 'Rolling...' : 'Roll Dice'}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {result.expression}
              </span>
            </div>
            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {result.result}
            </div>
            {result.details && (
              <div className="text-sm text-purple-600 dark:text-purple-400">
                {result.details}
              </div>
            )}
          </div>
        )}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Roll History
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((roll) => (
                <div
                  key={roll.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-gray-900 dark:text-gray-100 truncate">
                      {roll.expression}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">=</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {roll.result}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpression(roll.expression)}
                    className="ml-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                    title="Reuse expression"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
