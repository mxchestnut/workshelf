#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const frontend_stack_1 = require("../lib/frontend-stack");
const backend_stack_1 = require("../lib/backend-stack");
const synapse_stack_1 = require("../lib/synapse-stack");
const keycloak_stack_1 = require("../lib/keycloak-stack");
const admin_tools_stack_1 = require("../lib/admin-tools-stack");
const app = new cdk.App();
const env = {
    account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION || 'us-east-1',
};
const backend = new backend_stack_1.BackendStack(app, 'WorkShelfBackend', {
    env,
    description: 'WorkShelf Backend API with Lambda and API Gateway',
});
const frontend = new frontend_stack_1.FrontendStack(app, 'WorkShelfFrontend', {
    env,
    description: 'WorkShelf Frontend static hosting with CloudFront and S3',
    apiUrl: backend.apiUrl,
});
const synapse = new synapse_stack_1.SynapseStack(app, 'WorkShelfSynapse', {
    env,
    description: 'WorkShelf Matrix Synapse server on ECS Fargate',
    databaseUrl: process.env.DATABASE_URL || '',
    keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',
});
const keycloak = new keycloak_stack_1.KeycloakStack(app, 'WorkShelfKeycloak', {
    env,
    description: 'WorkShelf Keycloak authentication server on ECS Fargate',
    adminUser: process.env.KEYCLOAK_ADMIN_USER || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || '',
    dbPassword: process.env.DATABASE_PASSWORD || '',
});
const adminTools = new admin_tools_stack_1.AdminToolsStack(app, 'WorkShelfAdminTools', {
    env,
    description: 'WorkShelf Admin Tools - Vault, Grafana, Prometheus, PostHog, Unleash',
});
cdk.Tags.of(app).add('Project', 'WorkShelf');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
//# sourceMappingURL=app.js.map