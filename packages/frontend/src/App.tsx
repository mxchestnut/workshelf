import { Admin, Resource, ListGuesser, EditGuesser, ShowGuesser } from 'react-admin';
import { QueryClient } from '@tanstack/react-query';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import dataProvider from './dataProvider';
import authProvider from './authProvider';
import keycloak from './keycloak';
import { Dashboard } from './pages/Dashboard';
import { AdminTools } from './pages/AdminTools';
import { Layout } from './components/Layout';
import { Users, Shield, Wrench } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App(): JSX.Element {
  return (
    <ReactKeycloakProvider authClient={keycloak}>
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        dashboard={Dashboard}
        layout={Layout}
        queryClient={queryClient}
        requireAuth
        title="WorkShelf Admin"
      >
        <Resource
          name="users"
          list={ListGuesser}
          edit={EditGuesser}
          show={ShowGuesser}
          icon={Users}
        />
        <Resource name="roles" list={ListGuesser} icon={Shield} />
        <Resource name="admin-tools" list={AdminTools} icon={Wrench} options={{ label: 'Admin Tools' }} />
      </Admin>
    </ReactKeycloakProvider>
  );
}

export default App;
