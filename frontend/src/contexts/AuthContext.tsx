import React, { createContext, useContext, useEffect, useState } from 'react';

// User type for the application (Keycloak-based)
export interface User {
  // Backend properties
  id?: number;
  display_name?: string;
  username?: string;
  email?: string;
  is_staff?: boolean;
  groups?: any[];
  // Compatibility properties
  homeAccountId?: string;
  localAccountId?: string;
  name?: string;
  tenantId?: string;
  environment?: string;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      // Try to get user info from localStorage
      const storedUser = localStorage.getItem('user_info');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          console.error('Failed to parse stored user info');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async () => {
    // Redirect to Keycloak login
    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'workshelf';
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'workshelf-frontend';
    const redirectUri = encodeURIComponent(window.location.origin + '/callback');
    
    window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid`;
  };

  const logout = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    setIsAuthenticated(false);
    setUser(null);
    
    // Redirect to Keycloak logout
    const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'workshelf';
    const redirectUri = encodeURIComponent(window.location.origin);
    
    window.location.href = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout?redirect_uri=${redirectUri}`;
  };

  const getAccessToken = async (): Promise<string> => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found');
    }
    return token;
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
