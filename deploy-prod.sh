#!/bin/bash
# Simple production deployment script

set -e

echo "🚀 Deploying to production..."

# Production server details
PROD_USER="ubuntu"
PROD_HOST="workshelf.dev"
PROD_PATH="/home/ubuntu/workshelf"

echo "📡 Connecting to production server..."

ssh "${PROD_USER}@${PROD_HOST}" << 'EOF'
    set -e
    cd /home/ubuntu/workshelf
    
    echo "📥 Pulling latest changes..."
    git pull origin main
    
    echo "🏗️  Building and restarting services..."
    sudo docker-compose up -d --build backend frontend
    
    echo "✅ Deployment complete!"
    
    echo "📊 Service status:"
    sudo docker-compose ps
EOF

echo ""
echo "✅ Deployment finished successfully!"
echo "🌐 Your site should be updated at https://workshelf.dev"
