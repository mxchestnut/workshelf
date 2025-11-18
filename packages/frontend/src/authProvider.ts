import { AuthProvider } from 'react-admin';

import keycloak from './keycloak';

const authProvider: AuthProvider = {
  login: async () => {
    await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });
    return Promise.resolve();
  },

  logout: async () => {
    await keycloak.logout();
    return Promise.resolve();
  },

  checkAuth: async () => {
    if (keycloak.authenticated) {
      return Promise.resolve();
    }
    await keycloak.login();
    return Promise.reject();
  },

  checkError: (error: any) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      return Promise.reject();
    }
    return Promise.resolve();
  },

  getIdentity: async () => {
    if (keycloak.tokenParsed) {
      return Promise.resolve({
        id: keycloak.tokenParsed.sub || '',
        fullName: keycloak.tokenParsed.name || keycloak.tokenParsed.preferred_username || '',
        avatar: undefined,
      });
    }
    return Promise.reject();
  },

  getPermissions: async () => {
    if (keycloak.tokenParsed?.realm_access?.roles) {
      return Promise.resolve(keycloak.tokenParsed.realm_access.roles);
    }
    return Promise.resolve([]);
  },
};

export default authProvider;
