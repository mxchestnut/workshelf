import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * BetaBanner - Bright red warning banner for beta status
 * Fixed to bottom of screen, dismissible, warns users about data safety
 */
export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem('betaBannerDismissed') === 'true'
    setDismissed(isDismissed)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('betaBannerDismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg border-t-4 border-red-800"
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm flex-1">
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
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-red-700 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss beta banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
