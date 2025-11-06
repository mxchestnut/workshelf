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
      console.log('[AuthCallback] Already handled in this component instance, skipping')
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

      // CRITICAL: Check if this exact code has already been processed
      // This prevents duplicate attempts even across page reloads
      const processedCodeKey = `oauth_code_${code}`
      if (sessionStorage.getItem(processedCodeKey)) {
        console.error('[AuthCallback] This authorization code has already been used!')
        setError('This login link has already been used. Please try logging in again.')
        return
      }

      // Mark this code as being processed
      sessionStorage.setItem(processedCodeKey, 'true')
      console.log('[AuthCallback] Processing authorization code:', code.substring(0, 10) + '...')

      try {
        const user = await authService.handleCallback(code)
        
        console.log('[AuthCallback] Successfully authenticated user:', user.email)
        
        // Clean up the processed code marker (optional, but keeps sessionStorage clean)
        sessionStorage.removeItem(processedCodeKey)
        
        // Check if user has completed onboarding (has username and phone)
        if (!user.username) {
          // Redirect to onboarding
          console.log('[AuthCallback] Redirecting to onboarding (no username)')
          window.location.href = '/onboarding'
        } else {
          // Redirect to feed
          console.log('[AuthCallback] Redirecting to feed (user complete)')
          window.location.href = '/feed'
        }
      } catch (err) {
        console.error('[AuthCallback] Authentication failed:', err)
        // Don't remove the marker on error - prevent retrying same code
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
