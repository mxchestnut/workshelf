#!/bin/bash
# Deployment Configuration
# Single source of truth for environment variables in deployments

export BACKEND_SECRETS=(
  "DATABASE_URL=secretref:database-url"
  "ANTHROPIC_API_KEY=secretref:anthropic-api-key"
  "STRIPE_SECRET_KEY=secretref:stripe-secret-key"
  "STRIPE_PUBLISHABLE_KEY=secretref:stripe-publishable-key"
  "STRIPE_WEBHOOK_SECRET=secretref:stripe-webhook-secret"
  "GPTZERO_API_KEY=secretref:gptzero-api-key"
  "COPYSCAPE_API_KEY=secretref:copyscape-api-key"
  "SECRET_KEY=secretref:secret-key"
)

export BACKEND_ENV_VARS=(
  "COPYSCAPE_USERNAME"
  "CLAUDE_MODEL=claude-4-sonnet-20250514"
  "KEYCLOAK_SERVER_URL"
  "KEYCLOAK_REALM"
  "KEYCLOAK_CLIENT_ID"
  "KEYCLOAK_CLIENT_SECRET"
)

export BACKEND_RESOURCES=(
  "--cpu 0.25"
  "--memory 0.5Gi"
  "--min-replicas 1"
  "--max-replicas 2"
)

export FRONTEND_ENV_VARS=(
  "VITE_API_URL"
  "VITE_KEYCLOAK_URL"
)

export FRONTEND_RESOURCES=(
  "--cpu 0.25"
  "--memory 0.5Gi"
  "--min-replicas 1"
  "--max-replicas 3"
)
