#!/bin/bash
# Quick script to deploy/restart Keycloak in production

set -e

echo "🔐 Deploying Keycloak to Production"
echo "===================================="
echo ""

# Check if we're on the production server
if [ ! -d "/home/ubuntu/npc" ]; then
    echo "❌ Error: This script should be run on the production server"
    echo "   Run from: /home/ubuntu/npc"
    exit 1
fi

cd /home/ubuntu/npc

echo "📦 Building Keycloak service..."
sudo docker-compose -f deploy/docker-compose.prod.yml build keycloak || \
sudo docker-compose -f docker-compose.prod.yml build keycloak

echo ""
echo "🚀 Starting Keycloak..."
sudo docker-compose -f deploy/docker-compose.prod.yml up -d keycloak || \
sudo docker-compose -f docker-compose.prod.yml up -d keycloak

echo ""
echo "⏳ Waiting for Keycloak to be ready..."
sleep 15

# Check if Keycloak is running
if sudo docker ps | grep -q keycloak; then
    echo "✅ Keycloak container is running"
    
    # Wait for Keycloak to respond
    for i in {1..30}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo "✅ Keycloak is responding!"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    
    echo ""
    echo "📋 Keycloak Status:"
    sudo docker ps | grep keycloak
    echo ""
    echo "📝 Next steps:"
    echo "1. Ensure DNS points keycloak.workshelf.dev to this server"
    echo "2. Configure nginx reverse proxy for HTTPS"
    echo "3. Access Keycloak admin console at http://localhost:8080"
    echo "4. Configure the 'workshelf' realm and 'workshelf-frontend' client"
    echo ""
    echo "👤 Admin credentials:"
    echo "   Username: admin"
    echo "   Password: (check your .env or docker-compose.prod.yml)"
else
    echo "❌ Keycloak container failed to start"
    echo ""
    echo "🔍 Checking logs..."
    sudo docker-compose -f docker-compose.prod.yml logs keycloak --tail=50
    exit 1
fi
