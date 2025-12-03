/**
 * Live Region Component - WCAG 2.1 Compliance
 * Announces dynamic content changes to screen readers
 */

import { useEffect, useRef } from 'react'

interface LiveRegionProps {
  message: string
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
  clearAfter?: number // Clear message after X milliseconds
}

export function LiveRegion({ 
  message, 
  politeness = 'polite', 
  atomic = true,
  clearAfter 
}: LiveRegionProps) {
  const timeoutRef = useRef<number | null>(null)
  const messageRef = useRef<string>('')

  useEffect(() => {
    messageRef.current = message

    if (clearAfter && message) {
      timeoutRef.current = window.setTimeout(() => {
        messageRef.current = ''
      }, clearAfter)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearAfter])

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {message}
    </div>
  )
}

/**
 * Alert Live Region - For important announcements
 */
export function AlertLiveRegion({ message }: { message: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}
