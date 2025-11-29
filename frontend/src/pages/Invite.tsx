/**
 * Invitation Page - Verify invitation token and redirect to signup or accept group invitation
 */
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react'
import { authService } from '../services/auth'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

interface GroupInvitation {
  id: number
  group_id: number
  group_name: string
  group_slug: string
  email: string
  role: string
  message?: string
  status: string
  expires_at: string
}

export function Invite() {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [invitationType, setInvitationType] = useState<'platform' | 'group' | null>(null)
  const [groupInvitation, setGroupInvitation] = useState<GroupInvitation | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (user !== null) {
      verifyInvitation()
    }
  }, [user])

  const verifyInvitation = async () => {
    // Get token from URL
    const path = window.location.pathname
    const token = path.split('/invite/')[1]

    if (!token) {
      setStatus('invalid')
      setMessage('Invalid invitation link')
      return
    }

    // First try group invitation endpoint
    try {
      const response = await fetch(`${API_URL}/api/v1/groups/invitations/verify/${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setInvitationType('group')
        setGroupInvitation(data)
        setEmail(data.email)
        setStatus('valid')
        return
      }
    } catch (error) {
      console.error('[Invite] Error checking group invitation:', error)
    }

    // Fall back to platform invitation endpoint
    try {
      const response = await fetch(`${API_URL}/api/v1/invitations/verify/${token}`)
      const data = await response.json()

      if (data.valid) {
        setInvitationType('platform')
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

  const acceptGroupInvitation = async () => {
    if (!groupInvitation) return

    const path = window.location.pathname
    const token = path.split('/invite/')[1]

    setIsAccepting(true)

    try {
      const response = await fetch(`${API_URL}/api/v1/groups/invitations/accept/${token}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authService.getAccessToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus('success')
        setMessage(`You've successfully joined ${groupInvitation.group_name}!`)
        // Redirect to group page after success
        setTimeout(() => {
          window.location.href = `/group/${data.slug || groupInvitation.group_slug}`
        }, 2000)
      } else {
        const errorData = await response.json()
        setStatus('invalid')
        setMessage(errorData.detail || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('[Invite] Error accepting invitation:', error)
      setStatus('invalid')
      setMessage('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
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

        {status === 'valid' && invitationType === 'platform' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10b981' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to WorkShelf!</h1>
            <p className="text-lg mb-4 text-white">{email}</p>
            <p style={{ color: '#B3B2B0' }} className="mb-4">{message}</p>
            <p style={{ color: '#B3B2B0' }}>Redirecting you to sign up...</p>
          </>
        )}

        {status === 'valid' && invitationType === 'group' && groupInvitation && (
          <>
            <Users className="w-16 h-16 mx-auto mb-4" style={{ color: '#B34B0C' }} />
            <h1 className="text-2xl font-bold text-white mb-4">You're Invited!</h1>
            
            <div className="text-left mb-6 p-4 rounded" style={{ backgroundColor: '#37322E' }}>
              <p className="text-sm" style={{ color: '#B3B2B0' }}>You've been invited to join</p>
              <p className="text-xl font-bold text-white mt-1">{groupInvitation.group_name}</p>
              <p className="text-sm mt-3" style={{ color: '#B3B2B0' }}>
                Role: <span className="font-semibold text-white">{groupInvitation.role}</span>
              </p>
              {groupInvitation.message && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#524944' }}>
                  <p className="text-sm italic" style={{ color: '#B3B2B0' }}>
                    "{groupInvitation.message}"
                  </p>
                </div>
              )}
            </div>

            {!user ? (
              <div>
                <p style={{ color: '#B3B2B0' }} className="mb-4">
                  Please sign in to accept this invitation
                </p>
                <button
                  onClick={() => authService.login()}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#B34B0C' }}
                >
                  Sign In to Accept
                </button>
              </div>
            ) : user.email !== groupInvitation.email ? (
              <div>
                <p style={{ color: '#ef4444' }} className="mb-4">
                  This invitation was sent to {groupInvitation.email}, but you're signed in as {user.email}.
                </p>
                <p style={{ color: '#B3B2B0' }} className="mb-4">
                  Please sign in with the correct account to accept this invitation.
                </p>
                <button
                  onClick={async () => {
                    await authService.logout()
                    authService.login()
                  }}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#B34B0C' }}
                >
                  Sign In with Different Account
                </button>
              </div>
            ) : (
              <button
                onClick={acceptGroupInvitation}
                disabled={isAccepting}
                className="w-full px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#B34B0C' }}
              >
                {isAccepting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Accepting...
                  </span>
                ) : (
                  'Accept Invitation'
                )}
              </button>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#10b981' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
            <p style={{ color: '#B3B2B0' }} className="mb-4">{message}</p>
            <p style={{ color: '#B3B2B0' }}>Redirecting you to the group...</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#ef4444' }} />
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p style={{ color: '#B3B2B0' }} className="mb-6">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-colors"
              style={{ backgroundColor: '#B34B0C' }}
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
