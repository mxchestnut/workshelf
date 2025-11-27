/**
 * Reading time utilities
 */

/**
 * Calculate reading time based on word count
 * @param wordCount Number of words in the content
 * @param wpm Words per minute reading speed (default: 200)
 * @returns Formatted reading time string
 */
export function calculateReadingTime(wordCount: number, wpm: number = 200): string {
  if (wordCount === 0) return '< 1 min read'
  
  const minutes = Math.ceil(wordCount / wpm)
  
  if (minutes < 1) return '< 1 min read'
  if (minutes === 1) return '1 min read'
  if (minutes < 60) return `${minutes} min read`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour read' : `${hours} hours read`
  }
  
  return `${hours}h ${remainingMinutes}m read`
}

/**
 * Calculate estimated reading time for a book based on page count
 * @param pageCount Number of pages
 * @param pagesPerHour Reading speed in pages per hour (default: 50)
 * @returns Formatted reading time string
 */
export function calculateBookReadingTime(pageCount: number, pagesPerHour: number = 50): string {
  if (!pageCount || pageCount === 0) return 'Unknown'
  
  const hours = pageCount / pagesPerHour
  
  if (hours < 1) return '< 1 hour'
  if (hours < 24) {
    const roundedHours = Math.round(hours)
    return roundedHours === 1 ? '1 hour' : `${roundedHours} hours`
  }
  
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}

/**
 * Get words per minute based on content difficulty
 */
export const ReadingSpeed = {
  TECHNICAL: 150,    // Technical documentation, academic papers
  NORMAL: 200,       // Average reading speed
  FICTION: 250,      // Light fiction, easier content
  SKIMMING: 400      // Quick skimming
} as const
