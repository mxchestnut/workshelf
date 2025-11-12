/**
 * Writing Streak Widget - Shows current streak, goals, and motivational messages
 */

import { useEffect, useState } from 'react'
import { Flame, Target, TrendingUp, Calendar, Award } from 'lucide-react'
import { calculateStreak, getStreakEmoji, getStreakMessage, type StreakData } from '../utils/streak-calculator'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface WritingGoal {
  dailyWordCount: number
  weeklyWordCount: number
}

interface TodayProgress {
  wordsWritten: number
  minutesWritten: number
  documentsEdited: number
}

export function WritingStreakWidget() {
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    isActiveToday: false
  })
  const [goal, setGoal] = useState<WritingGoal>({
    dailyWordCount: 500,
    weeklyWordCount: 3500
  })
  const [progress, setProgress] = useState<TodayProgress>({
    wordsWritten: 0,
    minutesWritten: 0,
    documentsEdited: 0
  })

  useEffect(() => {
    loadStreakData()
    loadGoals()
    loadTodayProgress()
  }, [])

  const loadStreakData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(`${API_URL}/api/v1/activity/me?limit=365`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const streakData = calculateStreak(data.events || [])
        setStreak(streakData)
      }
    } catch (error) {
      console.error('Failed to load streak data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGoals = () => {
    // Load from localStorage (in future, could be from backend)
    const savedGoals = localStorage.getItem('writing_goals')
    if (savedGoals) {
      setGoal(JSON.parse(savedGoals))
    }
  }

  const loadTodayProgress = async () => {
    // For now, mock data - in future, calculate from today's document edits
    // Could use activity events to sum up word counts from document_updated events
    setProgress({
      wordsWritten: 0,
      minutesWritten: 0,
      documentsEdited: 0
    })
  }

  const goalProgress = Math.min(100, (progress.wordsWritten / goal.dailyWordCount) * 100)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow-sm border border-orange-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Writing Streak
        </h3>
        <span className="text-3xl">{getStreakEmoji(streak.currentStreak)}</span>
      </div>

      {/* Current Streak */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-orange-600">
            {streak.currentStreak}
          </span>
          <span className="text-lg text-gray-600">
            {streak.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          {getStreakMessage(streak.currentStreak, streak.isActiveToday)}
        </p>
        {!streak.isActiveToday && streak.currentStreak > 0 && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-3">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span>Don't break your streak! Write something today.</span>
            </p>
          </div>
        )}
        {streak.isActiveToday && (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-3">
            <p className="text-sm text-green-800 flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span>You've written today! Streak intact.</span>
            </p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Award className="w-4 h-4 text-purple-500" />
            <span className="text-2xl font-bold text-gray-900">
              {streak.longestStreak}
            </span>
          </div>
          <p className="text-xs text-gray-600">Best Streak</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">
              {progress.documentsEdited}
            </span>
          </div>
          <p className="text-xs text-gray-600">Docs Today</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">
              {progress.wordsWritten}
            </span>
          </div>
          <p className="text-xs text-gray-600">Words Today</p>
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-gray-900">Daily Goal</span>
          </div>
          <span className="text-sm text-gray-600">
            {progress.wordsWritten} / {goal.dailyWordCount} words
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-orange-400 to-red-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        
        {goalProgress >= 100 && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <span className="text-base">🎉</span>
            Goal completed! Amazing work!
          </p>
        )}
        
        {goalProgress > 0 && goalProgress < 100 && (
          <p className="text-xs text-gray-600 mt-2">
            {Math.ceil((goal.dailyWordCount - progress.wordsWritten) / 100) * 100} words to go!
          </p>
        )}
      </div>

      {/* Quick Action Button */}
      <button
        onClick={() => window.location.href = '/documents'}
        className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all font-semibold flex items-center justify-center gap-2"
      >
        {streak.isActiveToday ? 'Keep Writing' : 'Start Writing'}
        <span>→</span>
      </button>
    </div>
  )
}
