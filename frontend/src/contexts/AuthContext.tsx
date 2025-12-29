import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { keycloakConfig, API_BASE_URL } from '../config/authConfig';

// PKCE helper functions
const generateCodeVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

// User type for the application (Keycloak-based)
export interface User {
  // Backend properties
  id?: number;
  display_name?: string;
  username?: string;
  email?: string;
  is_staff?: boolean;
  groups?: any[];
  // Keycloak properties
  sub?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  // Compatibility properties
  homeAccountId?: string;
  localAccountId?: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh helper
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiresAt - 60000; // Refresh 1 minute before expiry
  } catch {
    return true;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Fetch user info from backend
  const fetchUserInfo = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user_info', JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch user info:', error);
    }
    return null;
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', keycloakConfig.clientId);
      params.append('refresh_token', refreshToken);

      const response = await fetch(
        `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        console.log('[Auth] Token refreshed successfully');
        return data.access_token;
      } else {
        console.error('[Auth] Token refresh failed');
        return null;
      }
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      return null;
    }
  }, []);

  // Get access token with automatic refresh
  const getAccessToken = useCallback(async (): Promise<string> => {
    let token = localStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token found');
    }

    // Check if token needs refresh
    if (isTokenExpired(token)) {
      console.log('[Auth] Token expired, refreshing...');
      const newToken = await refreshAccessToken();
      if (newToken) {
        token = newToken;
      } else {
        // Refresh failed, clear auth state
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        setIsAuthenticated(false);
        setUser(null);
        throw new Error('Token refresh failed');
      }
    }

    return token;
  }, [refreshAccessToken]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        try {
          // Validate and possibly refresh token
          const validToken = await getAccessToken();
          
          // Get user info from localStorage or fetch from backend
          const storedUser = localStorage.getItem('user_info');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
              setIsAuthenticated(true);
            } catch {
              console.error('[Auth] Failed to parse stored user info');
            }
          }
          
          // Fetch fresh user info in background
          await fetchUserInfo(validToken);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('[Auth] Failed to initialize auth:', error);
          // Clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, [getAccessToken, fetchUserInfo]);

  const login = async () => {
    try {
      // Store current location for redirect after login
      sessionStorage.setItem('redirect_after_login', globalThis.location.pathname);
      
      // Generate state and nonce for security
      const state = crypto.randomUUID();
      const nonce = crypto.randomUUID();
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_nonce', nonce);
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      
      console.log('[Auth] Starting login with PKCE...');
      
      const redirectUri = globalThis.location.origin + '/callback';
      const authUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/auth`;
      const params = new URLSearchParams({
        client_id: keycloakConfig.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      
      globalThis.location.href = `${authUrl}?${params.toString()}`;
    } catch (error) {
      console.error('[Auth] Login initiation failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    const idToken = localStorage.getItem('id_token');
    
    console.log('[Auth] Logging out...');
    
    // Clear local state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('user_info');
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect to Keycloak logout
    const redirectUri = globalThis.location.origin;
    const logoutUrl = `${keycloakConfig.url}/realms/${keycloakConfig.realm}/protocol/openid-connect/logout`;
    
    // Use id_token_hint if available for proper SSO logout
    if (idToken) {
      globalThis.location.href = `${logoutUrl}?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
    } else {
      globalThis.location.href = `${logoutUrl}?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
