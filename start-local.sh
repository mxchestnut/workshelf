#!/bin/bash
# Local Development Environment Setup and Startup
# Run this to start the full local stack

echo "🚀 Starting Work Shelf Local Development Environment..."

# Check if .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  Creating frontend/.env.local..."
    cat > frontend/.env.local << 'EOF'
# Local Development Environment
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_MATOMO_URL=
VITE_MATOMO_SITE_ID=
EOF
    echo "✅ Created frontend/.env.local"
fi

if [ ! -f "backend/.env.local" ]; then
    echo "⚠️  Creating backend/.env.local..."
    cat > backend/.env.local << 'EOF'
# Local Development Environment
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-cold-rice-ad0d3rzt-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb?sslmode=require
KEYCLOAK_SERVER_URL=https://keycloak.workshelf.dev
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-backend
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
EOF
    echo "✅ Created backend/.env.local"
fi

# Start backend
echo ""
echo "📦 Starting Backend (port 8000)..."
cd backend
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "Installing backend dependencies..."
    pip install -q uvicorn fastapi sqlalchemy python-jose cryptography
    pip install -q -r requirements.txt 2>/dev/null || echo "⚠️  Some packages may not install (this is OK for local dev)"
else
    source .venv/bin/activate
fi
echo "Starting backend server..."
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Start frontend
echo ""
echo "🎨 Starting Frontend (port 5173)..."
cd frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Local environment started!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "🔧 Backend PID: $BACKEND_PID"
echo "🔧 Frontend PID: $FRONTEND_PID"
echo ""
echo "📝 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "💡 Tip: Run './local-test.sh' to validate before committing"
echo ""

# Save PIDs to file for easy cleanup
echo "$BACKEND_PID" > .local-dev.pid
echo "$FRONTEND_PID" >> .local-dev.pid

# Wait and show logs
wait
