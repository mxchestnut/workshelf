import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

/**
 * BetaBanner - Bright red warning banner for beta status
 * Fixed to bottom of screen, dismissible, warns users about data safety
 */
export default function BetaBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has dismissed the banner in this session
    return sessionStorage.getItem('beta-banner-dismissed') === 'true'
  })

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('beta-banner-dismissed', 'true')
  }

  if (isDismissed) return null

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg border-t-4 border-red-800"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
            <span className="font-bold">⚠️ BETA MODE:</span>
            <span>
              Do NOT reuse passwords! Back up your data elsewhere.
            </span>
            <a 
              href="/updates" 
              className="underline hover:text-red-200 transition-colors font-medium"
              onClick={(e) => {
                e.preventDefault()
                window.location.href = '/updates'
              }}
            >
              View site updates →
            </a>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-red-700 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss beta warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
