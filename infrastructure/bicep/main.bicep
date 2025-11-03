// Work Shelf - Main Azure Infrastructure
// Deploys minimal-cost setup for Phase 0

targetScope = 'subscription'

@description('Name of the resource group')
param resourceGroupName string = 'workshelf-rg'

@description('Azure region for resources')
param location string = 'centralus'

@description('Environment (dev, staging, prod)')
param environment string = 'dev'

@description('PostgreSQL admin username')
param postgresAdminUser string = 'workshelfadmin'

@description('PostgreSQL admin password')
@secure()
param postgresAdminPassword string = ''

@description('Use external database (Neon/Supabase) instead of Azure PostgreSQL')
param useExternalDatabase bool = false

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
  tags: {
    environment: environment
    project: 'workshelf'
    managedBy: 'bicep'
  }
}

// Container Apps Environment
module containerEnv './modules/container-env.bicep' = {
  scope: rg
  name: 'workshelf-container-env'
  params: {
    location: location
    environment: environment
  }
}

// PostgreSQL Flexible Server (only if not using external DB)
module database './modules/database.bicep' = if (!useExternalDatabase) {
  scope: rg
  name: 'workshelf-database'
  params: {
    location: location
    environment: environment
    adminUsername: postgresAdminUser
    adminPassword: postgresAdminPassword
  }
}

// Storage Account for documents
module storage './modules/storage.bicep' = {
  scope: rg
  name: 'workshelf-storage'
  params: {
    location: location
    environment: environment
  }
}

// Container Registry
module registry './modules/registry.bicep' = {
  scope: rg
  name: 'workshelf-registry'
  params: {
    location: location
    environment: environment
  }
}

// Outputs
output resourceGroupName string = rg.name
output containerEnvId string = containerEnv.outputs.environmentId
output databaseHost string = useExternalDatabase ? 'external-neon' : 'azure-postgres'
output storageAccountName string = storage.outputs.storageAccountName
output registryLoginServer string = registry.outputs.loginServer
