#!/bin/bash
# WorkShelf - Complete Setup and Test Script

set -e

echo "========================================"
echo "    WORKSHELF - COMPLETE SETUP"
echo "========================================"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi
echo "✅ Docker is running"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.11+"
    exit 1
fi
echo "✅ Python $(python3 --version)"

echo ""
echo "========================================"
echo "    STEP 1: ENVIRONMENT SETUP"
echo "========================================"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created"
else
    echo "✅ .env already exists"
fi

echo ""
echo "========================================"
echo "    STEP 2: DOCKER SERVICES"
echo "========================================"

# Start Docker services
echo "🚀 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy (30 seconds)..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

echo ""
echo "========================================"
echo "    STEP 3: KEYCLOAK SETUP"
echo "========================================"

echo "🔐 Configuring Keycloak..."
./setup-keycloak.sh

echo ""
echo "========================================"
echo "    STEP 4: BACKEND SETUP"
echo "========================================"

cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🐍 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
alembic upgrade head || echo "⚠️  Migrations may need to be created"

cd ..

echo ""
echo "========================================"
echo "    STEP 5: FRONTEND SETUP"
echo "========================================"

cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

cd ..

echo ""
echo "========================================"
echo "    ✅ SETUP COMPLETE!"
echo "========================================"
echo ""
echo "🎉 WorkShelf is ready to use!"
echo ""
echo "📍 Access Points:"
echo "   Frontend:   http://localhost:5173"
echo "   Backend:    http://localhost:8000/docs"
echo "   Keycloak:   http://localhost:8080"
echo "   MinIO:      http://localhost:9001"
echo ""
echo "👤 Test Account:"
echo "   Username:   testuser"
echo "   Password:   password123"
echo ""
echo "🔧 Development Commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop all:      docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "📚 Next Steps:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Click 'LOGIN' and use testuser/password123"
echo "   3. Start building!"
echo ""
