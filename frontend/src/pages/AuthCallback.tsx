/**
 * Auth Callback Page
 * Handles OAuth callback - MSAL handles this automatically via redirect
 * This page just shows a loading state and redirects
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    // MSAL handles the callback automatically
    // Just redirect to the appropriate page once authenticated
    if (isAuthenticated) {
      console.log('[AuthCallback] User authenticated, redirecting...')

      // Check if there's a stored redirect URL
      const redirectUrl = sessionStorage.getItem('redirect_after_login') || '/feed'
      sessionStorage.removeItem('redirect_after_login')

      navigate(redirectUrl, { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-2">Completing sign in...</h1>
        <p className="text-gray-400">Please wait while we complete your authentication.</p>
      </div>
    </div>
  )
}
