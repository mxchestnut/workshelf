/**
 * Invitation Page - Verify invitation token and redirect to signup
 */
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { authService } from '../services/auth'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

export function Invite() {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    verifyInvitation()
  }, [])

  const verifyInvitation = async () => {
    // Get token from URL
    const path = window.location.pathname
    const token = path.split('/invite/')[1]

    if (!token) {
      setStatus('invalid')
      setMessage('Invalid invitation link')
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/invitations/verify/${token}`)
      const data = await response.json()

      if (data.valid) {
        setStatus('valid')
        setEmail(data.email)
        setMessage(data.message)
        // Store invitation token and email in localStorage for use after OAuth
        localStorage.setItem('invitation_token', token)
        localStorage.setItem('invitation_email', data.email)
        // Redirect to login/signup after a brief delay
        setTimeout(() => {
          authService.login()
        }, 2000)
      } else {
        setStatus('invalid')
        setMessage(data.message)
      }
    } catch (error) {
      console.error('[Invite] Error verifying invitation:', error)
      setStatus('invalid')
      setMessage('Failed to verify invitation')
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: '#37322E' }}
    >
      <div 
        className="max-w-md w-full p-8 rounded-lg text-center"
        style={{ backgroundColor: '#524944' }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: '#B34B0C' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying Invitation</h1>
            <p style={{ color: '#B3B2B0' }}>Please wait while we verify your invitation...</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10b981' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to WorkShelf!</h1>
            <p className="text-lg mb-4 text-white">{email}</p>
            <p style={{ color: '#B3B2B0' }} className="mb-4">{message}</p>
            <p style={{ color: '#B3B2B0' }}>Redirecting you to sign up...</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p style={{ color: '#B3B2B0' }} className="mb-6">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-[#B34B0C] text-white rounded-lg font-semibold hover:bg-[#8A3809] transition-colors"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Invite
