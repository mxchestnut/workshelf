#!/bin/bash

# Secure Admin Platform - Quick Start Script

set -e

echo "🚀 Setting up Secure Admin Platform..."
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.x or higher."
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed. Installing pnpm..."
    npm install -g pnpm@8.15.0
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need Docker for local services."
    echo "   Visit https://docs.docker.com/get-docker/"
fi

echo ""
echo "✓ Prerequisites check complete!"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual credentials!"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install
echo ""

# Build shared package first
echo "🔨 Building shared package..."
pnpm --filter @secure-platform/shared build
echo ""

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Edit .env file with your credentials:"
echo "   code .env"
echo ""
echo "2. Start local services (Keycloak, Vault, Postgres, etc.):"
echo "   pnpm docker:up"
echo ""
echo "3. Start development servers:"
echo "   pnpm dev"
echo ""
echo "   Or start individually:"
echo "   - Frontend: cd packages/frontend && pnpm dev"
echo "   - Backend:  cd packages/backend && pnpm dev"
echo ""
echo "4. Access the application:"
echo "   - Frontend:    http://localhost:3000"
echo "   - Backend API: http://localhost:4000/api"
echo "   - API Docs:    http://localhost:4000/api/docs"
echo "   - Keycloak:    http://localhost:8080"
echo "   - Grafana:     http://localhost:3001"
echo ""
echo "📖 For more information, see README.md"
echo ""
