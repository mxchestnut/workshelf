/**
 * Authentication Service
 * Handles Keycloak authentication, token management, and user info
 */

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  is_staff: boolean
  keycloak_id: string
  groups?: {
    id: string
    name: string
    slug: string
    is_owner: boolean
  }[]
}

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io'
const KEYCLOAK_REALM = 'workshelf'
const KEYCLOAK_CLIENT_ID = 'workshelf-frontend'
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
   * Redirect to Keycloak login page
   */
  login() {
    const redirectUri = window.location.origin + '/auth/callback'
    const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?` +
      `client_id=${KEYCLOAK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=openid profile email`
    
    window.location.href = authUrl
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleCallback(code: string): Promise<User> {
    const redirectUri = window.location.origin + '/auth/callback'
    
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
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code for token')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token

    // Store tokens in localStorage
    localStorage.setItem('access_token', this.accessToken!)
    if (this.refreshToken) {
      localStorage.setItem('refresh_token', this.refreshToken)
    }

    // Fetch user info from our backend
    return await this.fetchUserInfo()
  }

  /**
   * Fetch user information from backend API
   */
  async fetchUserInfo(): Promise<User> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    this.user = await response.json()
    return this.user!
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
    
    // Redirect to Keycloak logout
    const logoutUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}`
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
