/**
 * Focus Trap Hook - WCAG 2.1 Compliance
 * Traps focus within a modal or dialog for keyboard navigation
 */

import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  enabled?: boolean
  initialFocus?: HTMLElement | null
  returnFocus?: boolean
}

export function useFocusTrap(options: UseFocusTrapOptions = {}) {
  const { enabled = true, initialFocus = null, returnFocus = true } = options
  const containerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    // Get all focusable elements
    const getFocusableElements = () => {
      if (!container) return []
      
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ')

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(el => {
        // Exclude hidden elements
        return el.offsetParent !== null
      })
    }

    // Focus first element or provided initial focus
    const focusableElements = getFocusableElements()
    if (initialFocus) {
      initialFocus.focus()
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: Move focus backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: Move focus forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    // Cleanup: Return focus to previous element
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [enabled, initialFocus, returnFocus])

  return containerRef
}
