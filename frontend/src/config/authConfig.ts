/**
 * Keycloak Authentication Configuration
 * 
 * This app uses Keycloak for authentication.
 * Azure AD B2C has been removed.
 */

// Keycloak configuration
export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || '',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'workshelf',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'workshelf-frontend',
};

// Validate configuration
if (!keycloakConfig.url) {
  console.warn('[Auth Config] VITE_KEYCLOAK_URL is not set. Authentication will not work.');
}

// API endpoint
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.nerdchurchpartners.org';

// Legacy exports for compatibility (can be removed when all usages are updated)
export const msalConfig = null;
export const loginRequest = null;
export const apiRequest = null;
