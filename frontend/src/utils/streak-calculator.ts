/**
 * Writing streak calculation utilities
 */

export interface ActivityEvent {
  created_at: string
  activity_type: string
  metadata?: any
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  isActiveToday: boolean
}

/**
 * Calculate writing streak from activity events
 * @param activities Array of activity events sorted by date (newest first)
 * @returns Streak information
 */
export function calculateStreak(activities: ActivityEvent[]): StreakData {
  if (!activities || activities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false
    }
  }

  // Filter to only writing activities (document edits, saves, etc)
  const writingActivities = activities.filter(a => 
    a.activity_type === 'document_created' ||
    a.activity_type === 'document_updated' ||
    a.activity_type === 'document_published'
  )

  if (writingActivities.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      isActiveToday: false
    }
  }

  // Get unique dates of activity (YYYY-MM-DD format)
  const activityDates = new Set<string>()
  writingActivities.forEach(activity => {
    const date = new Date(activity.created_at)
    const dateStr = date.toISOString().split('T')[0]
    activityDates.add(dateStr)
  })

  // Sort dates (newest first)
  const sortedDates = Array.from(activityDates).sort().reverse()
  
  // Check if active today
  const today = new Date().toISOString().split('T')[0]
  const isActiveToday = sortedDates.includes(today)

  // Calculate current streak
  let currentStreak = 0
  const startDate = isActiveToday ? today : getYesterday()
  let checkDate = new Date(startDate)
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
    if (sortedDates.includes(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate longest streak
  let longestStreak = 0
  let tempStreak = 1
  
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i])
    const next = new Date(sortedDates[i + 1])
    const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: sortedDates[0] || null,
    isActiveToday
  }
}

function getYesterday(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().split('T')[0]
}

/**
 * Get streak emoji based on length
 */
export function getStreakEmoji(days: number): string {
  if (days === 0) return '📝'
  if (days < 3) return '🔥'
  if (days < 7) return '🔥🔥'
  if (days < 14) return '🔥🔥🔥'
  if (days < 30) return '⚡'
  if (days < 100) return '💪'
  return '🏆'
}

/**
 * Get motivational message based on streak
 */
export function getStreakMessage(days: number, isActiveToday: boolean): string {
  if (days === 0) {
    return "Start your writing streak today!"
  }
  
  if (!isActiveToday) {
    return `Your ${days}-day streak is at risk! Write today to keep it alive.`
  }

  if (days === 1) return "Great start! Keep it going tomorrow!"
  if (days < 7) return `${days} days strong! You're building a habit.`
  if (days < 14) return `${days} days! You're on fire!`
  if (days < 30) return `${days} days! This is becoming a lifestyle.`
  if (days < 100) return `${days} days! You're unstoppable!`
  return `${days} days! You're a writing legend! 🏆`
}
