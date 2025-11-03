// Azure Container Registry Module

@description('Azure region')
param location string

@description('Environment name')
param environment string

var registryName = 'workshelf${environment}${uniqueString(resourceGroup().id)}'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Basic' // Cheapest option: ~$5/month
  }
  properties: {
    adminUserEnabled: true
  }
}

output loginServer string = containerRegistry.properties.loginServer
output registryName string = containerRegistry.name
