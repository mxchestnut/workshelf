import { DataProvider, fetchUtils } from 'react-admin';
import simpleRestProvider from 'ra-data-simple-rest';
import keycloak from './keycloak';

const httpClient = async (url: string, options: any = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: 'application/json' });
  }

  // Add Keycloak JWT token to all requests
  if (keycloak.token) {
    options.headers.set('Authorization', `Bearer ${keycloak.token}`);
  }

  return fetchUtils.fetchJson(url, options);
};

const dataProvider: DataProvider = simpleRestProvider(
  import.meta.env.VITE_API_URL || 'https://x33g7wgu12.execute-api.us-east-1.amazonaws.com/prod',
  httpClient
);

export default dataProvider;
