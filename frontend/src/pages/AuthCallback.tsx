/**
 * Auth Callback Page
 * Handles OAuth callback from Keycloak
 */

import { useEffect, useState, useRef } from 'react'
import { authService } from '../services/auth'
import { BookOpen } from 'lucide-react'

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)
  const hasHandledCallback = useRef(false)

  useEffect(() => {
    // Prevent duplicate calls (React Strict Mode calls useEffect twice)
    if (hasHandledCallback.current) {
      return
    }
    hasHandledCallback.current = true

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
        const user = await authService.handleCallback(code)
        
        // Check if user has completed onboarding (has username and phone)
        if (!user.username) {
          // Redirect to onboarding
          window.location.href = '/onboarding'
        } else {
          // Redirect to feed
          window.location.href = '/feed'
        }
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
