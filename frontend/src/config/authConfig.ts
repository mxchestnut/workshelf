import { Configuration, PopupRequest } from '@azure/msal-browser';

/**
 * Microsoft Entra ID (Azure AD) Configuration
 * 
 * Your Azure AD App Registration:
 * - Client ID: 44e80fc4-db05-4e6b-8732-7779311cb2c3
 * - Tenant ID: 05b0173d-5c39-4799-889a-d522d3cbf86d
 * - Name: WorkShelf
 */

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '44e80fc4-db05-4e6b-8732-7779311cb2c3',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT || '05b0173d-5c39-4799-889a-d522d3cbf86d'}`,
    redirectUri: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage', // Use sessionStorage for better security
    storeAuthStateInCookie: false, // Set to true if you have issues on IE11 or Edge
  },
  system: {
    allowNativeBroker: false, // Disables WAM Broker
  },
};

// Scopes for the access token
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'], // Microsoft Graph API scope
};

// Scopes for the API
export const apiRequest: PopupRequest = {
  scopes: [
    'User.Read',
    'openid',
    'profile',
    'email',
  ],
};

// API endpoint - will be used to validate tokens
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev';
