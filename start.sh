#!/bin/bash
set -e

echo "🚀 Starting NPC..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit if needed."
fi

# Pull images (ARM64 compatible)
echo "📦 Pulling Docker images..."
docker-compose pull

# Start services
echo "🏗️  Starting services..."
docker-compose up -d

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo "🔍 Checking service health..."
docker-compose ps

echo ""
echo "✅ NPC is running!"
echo ""
echo "📍 Access points:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000/docs"
echo "   Keycloak:  http://localhost:8080 (admin/admin)"
echo "   MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "🔧 First time setup:"
echo "   1. Configure Keycloak: http://localhost:8080"
echo "   2. Create realm 'workshelf'"
echo "   3. Create clients 'workshelf-api' and 'workshelf-frontend'"
echo "   4. Create a test user"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop:      docker-compose down"
echo ""
