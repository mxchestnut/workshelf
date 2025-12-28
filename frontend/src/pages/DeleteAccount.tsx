/**
 * Delete Account Page
 * Allows users to permanently delete their account with proper warnings and confirmations
 */

import { useState, useEffect } from 'react'
import { Navigation } from '../components/Navigation'
import { useAuth } from "../contexts/AuthContext"
import { AlertTriangle, X, Trash2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org'

interface DeletionInfo {
  username: string
  email: string
  username_freeze_period_months: number
  warnings: string[]
  confirmation_required: string
  confirmations_required: string[]
}

export default function DeleteAccount() {
  const { user, login, logout, getAccessToken } = useAuth()
  const [deletionInfo, setDeletionInfo] = useState<DeletionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Form state
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [understandPermanent, setUnderstandPermanent] = useState(false)
  const [understandUsernameFrozen, setUnderstandUsernameFrozen] = useState(false)
  const [understandContentDeleted, setUnderstandContentDeleted] = useState(false)

  const [deleted, setDeleted] = useState(false)
  const [deletionResult, setDeletionResult] = useState<any>(null)

  useEffect(() => {
    loadUser()
    fetchDeletionInfo()
  }, [])

  const loadUser = async () => {
    // User loading logic removed - placeholder function
    return Promise.resolve()
  }

  const fetchDeletionInfo = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/account/deletion-info`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth-callback'
          return
        }
        throw new Error('Failed to fetch deletion info')
      }

      const data = await response.json()
      setDeletionInfo(data)
    } catch (err) {
      console.error('Error fetching deletion info:', err)
      setError('Failed to load account deletion information')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletionInfo) return

    // Validate confirmation phrase
    if (confirmationPhrase !== deletionInfo.confirmation_required) {
      setError(`You must type "${deletionInfo.confirmation_required}" exactly to confirm deletion`)
      return
    }

    // Validate all checkboxes
    if (!understandPermanent || !understandUsernameFrozen || !understandContentDeleted) {
      setError('You must check all confirmation boxes to proceed')
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/account/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation_phrase: confirmationPhrase,
          understand_permanent: understandPermanent,
          understand_username_frozen: understandUsernameFrozen,
          understand_content_deleted: understandContentDeleted
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete account')
      }

      const result = await response.json()
      setDeletionResult(result)
      setDeleted(true)

      // Clear local storage and redirect after a delay
      setTimeout(() => {
        logout()
        window.location.href = '/'
      }, 5000)

    } catch (err: any) {
      console.error('Error deleting account:', err)
      setError(err.message || 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  if (deleted && deletionResult) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="delete-account" />
        <div className="ml-0 md:ml-80 transition-all duration-300">

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Account Deleted Successfully
            </h1>

            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your account has been permanently deleted.
            </p>

            {deletionResult.username && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  Username <strong>{deletionResult.username}</strong> is frozen until{' '}
                  {deletionResult.thaw_at ? new Date(deletionResult.thaw_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting you to the home page in 5 seconds...
            </p>
          </div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="delete-account" />
        <div className="ml-0 md:ml-80 transition-all duration-300">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading account information...</p>
          </div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  if (!deletionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="delete-account" />
        <div className="ml-0 md:ml-80 transition-all duration-300">

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-900 dark:text-red-200">Failed to load account information</p>
          </div>
        </div>
        </div> {/* Close ml-0 md:ml-80 wrapper */}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation user={user} onLogin={() => login()} onLogout={() => logout()} currentPage="delete-account" />
      <div className="ml-0 md:ml-80 transition-all duration-300">

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Warning Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-2">
                Delete Your Account
              </h1>
              <p className="text-red-800 dark:text-red-300 font-semibold">
                ⚠️ WARNING: This action is PERMANENT and IRREVERSIBLE
              </p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Information
          </h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Username:</span> {deletionInfo.username}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Email:</span> {deletionInfo.email}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <span className="font-medium">Username freeze period:</span> {deletionInfo.username_freeze_period_months} months
            </p>
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            What Will Happen When You Delete Your Account
          </h2>
          <ul className="space-y-3">
            {deletionInfo.warnings.map((warning, index) => (
              <li key={index} className="flex items-start">
                <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-700 dark:text-gray-200">{warning}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirmation Form */}
        {!showConfirmation ? (
          <div className="text-center">
            <button
              onClick={() => setShowConfirmation(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              I Understand, Proceed to Deletion
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Final Confirmation
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-900 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Checkboxes */}
            <div className="space-y-4 mb-6">
              {deletionInfo.confirmations_required.map((confirmation, index) => (
                <label key={index} className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      index === 0 ? understandPermanent :
                      index === 1 ? understandUsernameFrozen :
                      understandContentDeleted
                    }
                    onChange={(e) => {
                      if (index === 0) setUnderstandPermanent(e.target.checked)
                      else if (index === 1) setUnderstandUsernameFrozen(e.target.checked)
                      else setUnderstandContentDeleted(e.target.checked)
                    }}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-gray-700 dark:text-gray-200">
                    {confirmation}
                  </span>
                </label>
              ))}
            </div>

            {/* Confirmation Phrase */}
            <div className="mb-6">
              <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Type <strong>"{deletionInfo.confirmation_required}"</strong> to confirm:
              </label>
              <input
                id="confirmation"
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                placeholder={deletionInfo.confirmation_required}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={deleting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowConfirmation(false)
                  setConfirmationPhrase('')
                  setUnderstandPermanent(false)
                  setUnderstandUsernameFrozen(false)
                  setUnderstandContentDeleted(false)
                  setError(null)
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete My Account Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Back to Safety */}
        {!showConfirmation && (
          <div className="text-center mt-8">
            <a
              href="/profile"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Take me back to my profile (I changed my mind)
            </a>
          </div>
        )}
      </div>
      </div> {/* Close ml-0 md:ml-80 wrapper */}
    </div>
  )
}
