#!/bin/bash
# Production Deployment Script
# Deploys WorkShelf to production using docker-compose

set -e

echo "🚀 WorkShelf Production Deployment"
echo "=================================="

# Production server details
PROD_USER="ubuntu"
PROD_HOST="34.239.176.138"
PROD_PATH="/home/ubuntu/npc"
KEY_PATH="$HOME/.ssh/npc-key.pem"

echo "📡 Connecting to production server..."

# Get current git SHA
GIT_SHA=$(git rev-parse --short HEAD)
echo "📦 Deploying commit: $GIT_SHA"

# Deploy to production
ssh -i "$KEY_PATH" "${PROD_USER}@${PROD_HOST}" << EOF
    set -e
    cd ${PROD_PATH}

    echo "📥 Pulling latest code..."
    git pull origin main

    echo "🔨 Building Docker images..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod build

    echo "▶️  Deploying containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

    echo "⏳ Waiting for backend to start..."
    sleep 10

    echo "📊 Service status:"
    docker-compose -f docker-compose.prod.yml ps

    echo ""
    echo "✅ Deployment complete!"
EOF

echo ""
echo "✅ Deployment finished successfully!"
echo ""
echo "🔗 Services:"
echo "   - Frontend: https://workshelf.dev"
echo "   - API: https://api.workshelf.dev"
echo "   - Keycloak: https://keycloak.workshelf.dev"
echo ""
