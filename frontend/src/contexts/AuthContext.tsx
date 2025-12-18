import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus, AccountInfo } from '@azure/msal-browser';
import { apiRequest } from '../config/authConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Loading state should be false when MSAL is not in progress
    setIsLoading(inProgress !== InteractionStatus.None);
  }, [inProgress]);

  const login = async () => {
    try {
      await instance.loginPopup(apiRequest);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup({
        mainWindowRedirectUri: '/',
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string> => {
    if (!accounts[0]) {
      throw new Error('No account found');
    }

    try {
      // Try to acquire token silently
      const response = await instance.acquireTokenSilent({
        ...apiRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      console.error('Silent token acquisition failed, trying popup:', error);
      // If silent acquisition fails, try popup
      const response = await instance.acquireTokenPopup(apiRequest);
      return response.accessToken;
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user: accounts[0] || null,
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
