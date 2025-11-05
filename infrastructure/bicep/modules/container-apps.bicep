// Container Apps Module - Frontend and Backend

@description('Azure region')
param location string

@description('Environment name')
param environment string

@description('Container Apps Environment ID')
param containerEnvId string

@description('Container Registry Login Server')
param registryLoginServer string

@description('Container Registry Name')
param registryName string

@description('Backend API base URL')
param backendApiUrl string = ''

@description('Database connection string')
@secure()
param databaseConnectionString string

@description('Keycloak URL')
param keycloakUrl string

@description('Claude API Key for AI templates')
@secure()
param claudeApiKey string = ''

var frontendAppName = 'workshelf-frontend-${environment}'
var backendAppName = 'workshelf-backend-${environment}'
var keycloakAppName = 'workshelf-keycloak-${environment}'

// Keycloak Container App
resource keycloakApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: keycloakAppName
  location: location
  properties: {
    managedEnvironmentId: containerEnvId
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: registryPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'keycloak'
          image: 'quay.io/keycloak/keycloak:23.0'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'KEYCLOAK_ADMIN'
              value: 'admin'
            }
            {
              name: 'KEYCLOAK_ADMIN_PASSWORD'
              value: 'e00NiIf26fJzdkdBt1kw'
            }
            {
              name: 'KC_PROXY'
              value: 'edge'
            }
            {
              name: 'KC_HOSTNAME_STRICT'
              value: 'false'
            }
          ]
          command: [
            '/bin/bash'
            '-c'
            'cd /opt/keycloak && bin/kc.sh start-dev'
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// Backend API Container App
resource backendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: backendAppName
  location: location
  properties: {
    managedEnvironmentId: containerEnvId
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: registryPassword
        }
        {
          name: 'database-url'
          value: databaseConnectionString
        }
        {
          name: 'claude-api-key'
          value: claudeApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: '${registryLoginServer}/workshelf-backend:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'KEYCLOAK_URL'
              value: keycloakUrl
            }
            {
              name: 'KEYCLOAK_REALM'
              value: 'workshelf'
            }
            {
              name: 'KEYCLOAK_CLIENT_ID'
              value: 'workshelf-backend'
            }
            {
              name: 'KEYCLOAK_CLIENT_SECRET'
              value: 'WTWM9Ahl5e95eIqnIf6PcnfFrr3oM9Bp'
            }
            {
              name: 'CLAUDE_API_KEY'
              secretRef: 'claude-api-key'
            }
            {
              name: 'ENVIRONMENT'
              value: environment
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
      }
    }
  }
}

// Frontend Container App
resource frontendApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: frontendAppName
  location: location
  properties: {
    managedEnvironmentId: containerEnvId
    configuration: {
      ingress: {
        external: true
        targetPort: 80
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      registries: [
        {
          server: registryLoginServer
          username: registryUsername
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: registryPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${registryLoginServer}/workshelf-frontend:latest'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'VITE_API_URL'
              value: backendApiUrl != '' ? backendApiUrl : 'https://${backendApp.properties.configuration.ingress.fqdn}'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output keycloakUrl string = 'https://${keycloakApp.properties.configuration.ingress.fqdn}'
output frontendAppName string = frontendApp.name
output backendAppName string = backendApp.name
output keycloakAppName string = keycloakApp.name
