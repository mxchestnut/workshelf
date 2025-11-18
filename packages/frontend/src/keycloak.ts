import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://keycloak.workshelf.dev',
  realm: 'workshelf',
  clientId: 'workshelf-admin',
});

export default keycloak;
