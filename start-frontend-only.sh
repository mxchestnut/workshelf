#!/bin/bash
# Start ONLY the frontend, using production backend
# This is the simplest way to develop locally

echo "🎨 Starting Work Shelf Frontend (Studio) Only..."

# Create minimal frontend env file
if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  Creating frontend/.env.local..."
    cat > frontend/.env.local << 'EOF'
# Frontend-Only Local Development
# Uses production backend - no local services needed!
VITE_API_URL=https://api.workshelf.dev
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_MOCK_AUTH=false
VITE_SENTRY_DSN=
VITE_POSTHOG_KEY=
VITE_MATOMO_URL=
VITE_MATOMO_SITE_ID=
EOF
    echo "✅ Created frontend/.env.local"
else
    echo "📄 frontend/.env.local already exists"
    echo "⚠️  Make sure VITE_MOCK_AUTH is NOT set to 'true'"
fi

# Install dependencies if needed
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the dev server
echo ""
echo "🚀 Starting frontend dev server on http://localhost:5173"
echo "📡 Using production backend at https://api.workshelf.dev"
echo ""
npm run dev
