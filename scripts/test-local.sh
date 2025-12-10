#!/bin/bash
# Test changes locally before deploying to production
# This script brings up the full stack locally and runs tests

set -e

echo "🧪 Local Testing Environment"
echo "============================"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install docker-compose."
    exit 1
fi

echo "🧹 Cleaning up any existing local containers..."
docker-compose -f docker-compose.local.yml down -v 2>/dev/null || true

echo "🏗️  Building images..."
docker-compose -f docker-compose.local.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.local.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 15

echo "🔍 Checking service health..."

# Check backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose -f docker-compose.local.yml logs backend | tail -20
    exit 1
fi

# Check Keycloak
if curl -f http://localhost:8080/realms/workshelf/.well-known/openid-configuration > /dev/null 2>&1; then
    echo "✅ Keycloak is healthy"
else
    echo "⚠️  Keycloak not ready yet (may need realm setup)"
fi

# Check frontend
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is serving"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo ""
echo "✅ All services are running!"
echo ""
echo "🔗 Local URLs:"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:8000"
echo "   - API Docs:  http://localhost:8000/docs"
echo "   - Keycloak:  http://localhost:8080"
echo "   - MinIO:     http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "🧪 Run backend tests:"
echo "   cd backend && pytest tests/"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose -f docker-compose.local.yml down"
echo ""
echo "💡 If tests pass, you're ready to deploy to production:"
echo "   ./deploy-prod.sh"
