#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FrontendStack } from '../lib/frontend-stack';
import { BackendStack } from '../lib/backend-stack';
import { SynapseStack } from '../lib/synapse-stack';
import { KeycloakStack } from '../lib/keycloak-stack';
import { AdminToolsStack } from '../lib/admin-tools-stack';
// import { ElementStack } from '../lib/element-stack';

const app = new cdk.App();

const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || 'us-east-1',
};

// Backend Lambda + API Gateway
const backend = new BackendStack(app, 'WorkShelfBackend', {
  env,
  description: 'WorkShelf Backend API with Lambda and API Gateway',
});

// Frontend CloudFront + S3
const frontend = new FrontendStack(app, 'WorkShelfFrontend', {
  env,
  description: 'WorkShelf Frontend static hosting with CloudFront and S3',
  apiUrl: backend.apiUrl,
});

// Synapse Matrix Server on ECS Fargate
const synapse = new SynapseStack(app, 'WorkShelfSynapse', {
  env,
  description: 'WorkShelf Matrix Synapse server on ECS Fargate',
  databaseUrl: process.env.DATABASE_URL || '',
  keycloakClientSecret: 'fBZn2GXPZoRgMRm6FIIgLuEp88WGw8om',
});

// Keycloak Authentication Server on ECS Fargate
const keycloak = new KeycloakStack(app, 'WorkShelfKeycloak', {
  env,
  description: 'WorkShelf Keycloak authentication server on ECS Fargate',
  adminUser: 'warpxth',
  adminPassword: 'PXGSmFqwT3w68hA',
  dbPassword: 'npg_D9Jiv7WeQChu',
});

// Element Web Client
// const element = new ElementStack(app, 'WorkShelfElement', {
//   env,
//   description: 'WorkShelf Element Web Matrix client',
// });

// Admin Tools (Vault, Grafana, Prometheus, PostHog, Unleash)
const adminTools = new AdminToolsStack(app, 'WorkShelfAdminTools', {
  env,
  description: 'WorkShelf Admin Tools - Vault, Grafana, Prometheus, PostHog, Unleash',
});

// Tags
cdk.Tags.of(app).add('Project', 'WorkShelf');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
