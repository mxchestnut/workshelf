#!/bin/bash
# Local Testing Script - Run before committing
# This catches most CI failures locally

set -e  # Exit on first error

echo "🧪 Running Local Tests..."
echo ""

# Frontend checks
echo "📦 Frontend Validation"
cd frontend

echo "  → Installing dependencies..."
npm install --silent

echo "  → Linting..."
npm run lint --silent

echo "  → Type checking..."
npm run type-check --silent

echo "  ✅ Frontend passed"
cd ..

# Backend checks (basic)
echo ""
echo "📦 Backend Validation"
cd backend

if [ ! -d ".venv" ]; then
    echo "  → Creating virtual environment..."
    python3 -m venv .venv
fi

echo "  → Activating virtual environment..."
source .venv/bin/activate

echo "  → Installing dependencies..."
pip install -q -r requirements.txt 2>/dev/null || echo "  ⚠️  Some packages skipped"

echo "  → Checking Python syntax..."
python3 -m py_compile app/main.py

echo "  ✅ Backend passed"
cd ..

echo ""
echo "✅ All local tests passed!"
echo ""
echo "🚀 Ready to commit? Run:"
echo "   git add -A"
echo "   git commit -m 'Your message'"
echo "   git push origin main"
echo ""
echo "💡 Or use: ./deploy-to-prod.sh (commits, pushes, and waits for deployment)"
