/**
 * Authentication Service
 * Handles Keycloak authentication, token management, and user info
 */

import { toast } from './toast'
import { setUserId, resetUserId } from '../matomo'

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  is_staff: boolean
  is_approved: boolean
  keycloak_id: string
  matrix_onboarding_seen?: boolean
  groups?: {
    id: string
    name: string
    slug: string
    is_owner: boolean
  }[]
}

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://auth.workshelf.dev'
const KEYCLOAK_REALM = 'workshelf'
const KEYCLOAK_CLIENT_ID = 'workshelf-frontend'
// Use production API domain as safer fallback (avoid main site domain)
const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev'

class AuthService {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private user: User | null = null

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
  }

  /**
   * Generate a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return this.base64UrlEncode(array)
  }

  /**
   * Generate code challenge from verifier using SHA-256
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(verifier)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return this.base64UrlEncode(new Uint8Array(hash))
  }

  /**
   * Base64 URL encode (without padding)
   */
  private base64UrlEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Redirect to Keycloak login page with PKCE
   */
  async login() {
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.generateCodeChallenge(codeVerifier)
    
    // Store verifier in sessionStorage for callback
    sessionStorage.setItem('pkce_verifier', codeVerifier)
    
    const redirectUri = window.location.origin + '/callback'
    const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
      `client_id=${KEYCLOAK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`
    
    window.location.href = authUrl
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleCallback(code: string): Promise<User> {
    const redirectUri = window.location.origin + '/callback'
    
    // Retrieve PKCE verifier from sessionStorage
    const codeVerifier = sessionStorage.getItem('pkce_verifier')
    if (!codeVerifier) {
      throw new Error('PKCE verifier not found - login flow may have been interrupted')
    }
    
    // Clear verifier from storage
    sessionStorage.removeItem('pkce_verifier')
    
    console.log('[AuthService] Exchanging authorization code for tokens...')
    
    const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KEYCLOAK_CLIENT_ID,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[AuthService] Token exchange failed:', response.status, errorData)
      const errorMsg = errorData.error_description || 'Failed to exchange authorization code for token'
      toast.error(`Login failed: ${errorMsg}`)
      throw new Error(errorMsg)
    }

    const data = await response.json()
    console.log('[AuthService] Token exchange successful')
    
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token

    // Store tokens in localStorage
    localStorage.setItem('access_token', this.accessToken!)
    if (this.refreshToken) {
      localStorage.setItem('refresh_token', this.refreshToken)
    }

    // Notify app that auth is now ready (same-tab listeners)
    try {
      window.dispatchEvent(new CustomEvent('auth:logged-in'))
    } catch {
      // Ignore errors dispatching auth event
    }

    // Fetch user info from our backend
    const user = await this.fetchUserInfo()
    
    // Track user in Matomo analytics
    if (user?.id) {
      setUserId(user.id)
    }
    
    toast.success('Successfully logged in')
    return user
  }

  /**
   * Fetch user information from backend API
   */
  async fetchUserInfo(): Promise<User> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    console.log('[AuthService] Fetching user info from:', `${API_URL}/api/v1/auth/me`)
    console.log('[AuthService] Using token:', this.accessToken.substring(0, 20) + '...')

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      console.log('[AuthService] Response status:', response.status)
      console.log('[AuthService] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      })

      if (response.status === 401) {
        // Token is invalid, clear it immediately
        console.warn('[AuthService] 401 Unauthorized - clearing tokens')
        this.accessToken = null
        this.refreshToken = null
        this.user = null
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        throw new Error('Authentication failed - token is invalid')
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[AuthService] Error response:', errorText)
        throw new Error(`Failed to fetch user info: ${response.status} - ${errorText}`)
      }

      this.user = await response.json()
      console.log('[AuthService] User info fetched successfully:', this.user?.email)
      return this.user!
    } catch (error) {
      console.error('[AuthService] Fetch failed:', error)
      throw error
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: KEYCLOAK_CLIENT_ID,
        refresh_token: this.refreshToken,
      }),
    })

    if (!response.ok) {
      // Refresh token expired, need to login again
      this.logout()
      throw new Error('Refresh token expired')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token

    localStorage.setItem('access_token', this.accessToken!)
    if (this.refreshToken) {
      localStorage.setItem('refresh_token', this.refreshToken)
    }
  }

  /**
   * Logout user and clear tokens
   */
  logout() {
    this.accessToken = null
    this.refreshToken = null
    this.user = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    
    // Reset Matomo user tracking
    resetUserId()
    
    toast.success('Successfully logged out')
    
    // Redirect to Keycloak logout, then back to home page
    const redirectUri = window.location.origin + '/'
    const logoutUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?` +
      `post_logout_redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `client_id=${KEYCLOAK_CLIENT_ID}`
    window.location.href = logoutUrl
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null
    }

    if (!this.user) {
      try {
        await this.fetchUserInfo()
      } catch (error) {
        // Try to refresh token if fetching user info fails
        try {
          await this.refreshAccessToken()
          await this.fetchUserInfo()
        } catch {
          this.logout()
          return null
        }
      }
    }

    return this.user
  }

  /**
   * Get access token for API requests
   */
  getAccessToken(): string | null {
    return this.accessToken
  }

  /**
   * Alias for getAccessToken (for consistency)
   */
  getToken(): string | null {
    return this.getAccessToken()
  }

  /**
   * Check if user is staff
   */
  isStaff(): boolean {
    return this.user?.is_staff === true
  }

  /**
   * Check if user owns a specific group
   */
  isGroupOwner(groupSlug: string): boolean {
    return this.user?.groups?.some(g => g.slug === groupSlug && g.is_owner) || false
  }

  /**
   * Get groups user is owner of
   */
  getOwnedGroups() {
    return this.user?.groups?.filter(g => g.is_owner) || []
  }
}

export const authService = new AuthService()
