/**
 * Auth Callback Page
 * Handles OAuth callback from Keycloak
 */

import { useEffect, useState } from 'react'
import { authService } from '../services/auth'
import { BookOpen } from 'lucide-react'

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      if (error) {
        setError(`Authentication error: ${error}`)
        return
      }

      if (!code) {
        setError('No authorization code received')
        return
      }

      try {
        await authService.handleCallback(code)
        // Redirect to feed
        window.location.href = '/feed'
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <BookOpen className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-darkest mb-2">Authentication Error</h1>
          <p className="text-neutral mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-neutral-darkest mb-2">Logging you in...</h1>
        <p className="text-neutral">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
