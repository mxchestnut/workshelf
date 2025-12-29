/**
 * Auth Callback Page
 * Handles OAuth2 authorization code exchange for Keycloak
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, AlertCircle } from 'lucide-react'
import { keycloakConfig, API_BASE_URL } from '../config/authConfig'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const params = new URLSearchParams(globalThis.location.search)
        const code = params.get('code')
        const state = params.get('state')
        const returnedError = params.get('error')

        // Check for errors from Keycloak
        if (returnedError) {
          const errorDescription = params.get('error_description') || 'Authentication failed'
          console.error('[AuthCallback] Keycloak error:', returnedError, errorDescription)
          setError(errorDescription)
          return
        }

        // Validate state
        const storedState = sessionStorage.getItem('oauth_state')
        if (!state || state !== storedState) {
          console.error('[AuthCallback] Invalid state parameter')
          setError('Invalid authentication state. Please try again.')
          return
        }

        if (!code) {
          console.error('[AuthCallback] No authorization code received')
          setError('No authorization code received from Keycloak')
          return
        }

        console.log('[AuthCallback] Exchanging authorization code for tokens...')

        // Get PKCE code verifier
        const codeVerifier = sessionStorage.getItem('pkce_code_verifier')
        if (!codeVerifier) {
          console.error('[AuthCallback] Missing PKCE code verifier')
          setError('Authentication session expired. Please try again.')
          return
        }

        // Exchange authorization code for tokens
        const tokenParams = new URLSearchParams()
        tokenParams.append('grant_type', 'authorization_code')
        tokenParams.append('client_id', keycloakConfig.clientId)
        tokenParams.append('code', code)
        tokenParams.append('redirect_uri', globalThis.location.origin + '/callback')
        tokenParams.append('code_verifier', codeVerifier)

        const tokenResponse = await fetch(
          `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenParams,
          }
        )

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({}))
          console.error('[AuthCallback] Token exchange failed:', errorData)
          setError('Failed to exchange authorization code for tokens')
          return
        }

        const tokens = await tokenResponse.json()
        console.log('[AuthCallback] Tokens received successfully')

        // Store tokens (including id_token for logout)
        localStorage.setItem('access_token', tokens.access_token)
        if (tokens.refresh_token) {
          localStorage.setItem('refresh_token', tokens.refresh_token)
        }
        if (tokens.id_token) {
          localStorage.setItem('id_token', tokens.id_token)
        }

        // Fetch user info from backend
        try {
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
            },
          })

          if (userResponse.ok) {
            const userData = await userResponse.json()
            localStorage.setItem('user_info', JSON.stringify(userData))
            console.log('[AuthCallback] User info fetched:', userData)
          }
        } catch (error) {
          console.warn('[AuthCallback] Failed to fetch user info, continuing anyway:', error)
        }

        // Clean up session storage
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_nonce')
        sessionStorage.removeItem('pkce_code_verifier')

        // Redirect to stored URL or default
        const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/feed'
        sessionStorage.removeItem('redirect_after_login')

        console.log('[AuthCallback] Authentication complete, redirecting to:', redirectUrl)
        navigate(redirectUrl, { replace: true })
      } catch (error) {
        console.error('[AuthCallback] Error during callback:', error)
        setError('An unexpected error occurred during authentication')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => (globalThis.location.href = '/')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Completing sign in...</h1>
        <p className="text-muted-foreground">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
