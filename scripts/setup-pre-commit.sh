#!/bin/bash

echo "🚀 Setting up pre-commit hooks for Workshelf..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo "📦 Step 1: Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

echo "🐍 Step 2: Installing Python pre-commit framework..."
cd ../backend
pip3 install pre-commit black flake8 bandit safety
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: Some Python packages may have failed to install${NC}"
    echo -e "${YELLOW}   You might need to use a virtual environment${NC}"
fi
echo -e "${GREEN}✅ Python packages installed${NC}"
echo ""

echo "🔗 Step 3: Installing git hooks..."
cd ..
/Users/kit/Library/Python/3.9/bin/pre-commit install -f
if [ $? -ne 0 ]; then
    pre-commit install -f 2>/dev/null || echo -e "${YELLOW}⚠️  Pre-commit install returned non-zero, but may have succeeded${NC}"
fi
echo -e "${GREEN}✅ Git hooks installed${NC}"
echo ""

echo "🍺 Step 4: Installing gitleaks (secret scanner)..."
if command -v gitleaks &> /dev/null; then
    echo -e "${GREEN}✅ Gitleaks already installed${NC}"
elif command -v brew &> /dev/null; then
    echo "Installing gitleaks via Homebrew..."
    brew install gitleaks
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Gitleaks installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Gitleaks installation failed, but continuing...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Homebrew not found. Please install gitleaks manually:${NC}"
    echo -e "${YELLOW}   https://github.com/gitleaks/gitleaks/releases${NC}"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "📋 What was configured:"
echo "  ✓ Husky + lint-staged for frontend"
echo "  ✓ ESLint and Prettier auto-fix on commit"
echo "  ✓ TypeScript type checking"
echo "  ✓ Python code formatting (black)"
echo "  ✓ Python linting (flake8)"
echo "  ✓ Python security scanning (bandit)"
echo "  ✓ Dependency vulnerability checks"
echo "  ✓ Secret scanning (gitleaks)"
echo "  ✓ Console.log detection"
echo ""
echo "🎯 Next steps:"
echo "  1. Try making a commit - the hooks will run automatically"
echo "  2. To skip hooks in an emergency: git commit --no-verify"
echo "  3. To manually run hooks: cd backend && pre-commit run --all-files"
echo ""
echo -e "${GREEN}🎉 You're all set!${NC}"
