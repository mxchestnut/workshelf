/**
 * Type definitions for authentication
 */

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

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}
