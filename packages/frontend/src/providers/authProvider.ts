import { AuthProvider } from 'react-admin';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    const request = new Request(`${apiUrl}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: username, password }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    });

    const response = await fetch(request);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.statusText);
    }

    const { accessToken } = await response.json() as { accessToken: string };
    localStorage.setItem('token', accessToken);
  },

  logout: async () => {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
    } catch (error) {
      // Ignore errors during logout
    }
    localStorage.removeItem('token');
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }
  },

  checkError: async (error) => {
    const status = error.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
  },

  getIdentity: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.statusText);
    }

    const user = await response.json() as { id: string; email: string; username: string };
    return {
      id: user.id,
      fullName: user.username,
      avatar: undefined,
    };
  },

  getPermissions: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.statusText);
    }

    const user = await response.json() as { roles: string[] };
    return user.roles;
  },
};
