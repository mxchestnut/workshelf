#!/bin/bash
# Start frontend + backend locally with mock authentication
# Perfect for UI/Studio development without Keycloak complexity

echo "🎨 Starting Work Shelf Studio (Frontend + Backend with Mock Auth)..."
echo ""

# Setup backend env
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set. Please set it in your environment."
  echo "Example: export DATABASE_URL='postgresql://user:pass@host/db'"
  exit 1
fi

cat > backend/.env.local << EOF
DATABASE_URL=$DATABASE_URL
KEYCLOAK_SERVER_URL=https://keycloak.workshelf.dev
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-api
SECRET_KEY=local-development-secret-key
EOF

# Setup frontend env
cat > frontend/.env.local << 'EOF'
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_MATOMO_URL=
VITE_MATOMO_SITE_ID=
EOF

# Check if backend venv exists
if [ ! -d "backend/.venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv .venv
    .venv/bin/pip install -q --upgrade pip
    .venv/bin/pip install -q -r requirements.txt
    cd ..
fi

# Check if frontend node_modules exist
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "Starting services..."
echo "  📡 Backend API: http://localhost:8000"
echo "  🎨 Frontend:    http://localhost:5173"
echo ""
echo "🎯 Available Features:"
echo "  • Studio (Writing workspace)"
echo "  • Groups (Community & collaboration)"
echo "  • All other WorkShelf features"
echo ""
echo "🔐 Authentication: Real Keycloak (login with your credentials)"
echo "📊 Database: Production (changes are real)"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Start backend in background
cd backend
export PYTHONPATH=/Users/kit/Code/workshelf/backend
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend (this will run in foreground)
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Wait for both processes
wait
