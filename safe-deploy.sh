#!/bin/bash
# Safe Deployment Script for NPC
# This script ensures database safety before deploying

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_DB_URL="postgresql://..."  # TODO: Set staging database URL
PROD_DB_URL="postgresql://..."     # TODO: Set production database URL
DEPLOYMENT_ENV="${1:-staging}"     # Default to staging

echo -e "${GREEN}=== NPC Safe Deployment ===${NC}"
echo "Environment: $DEPLOYMENT_ENV"
echo ""

# 1. Pre-flight Checks
echo -e "${YELLOW}[1/8] Pre-flight Checks...${NC}"

if [ "$DEPLOYMENT_ENV" == "production" ]; then
    echo -e "${RED}⚠️  PRODUCTION DEPLOYMENT${NC}"
    read -p "Have you tested in staging? (yes/no): " tested
    if [ "$tested" != "yes" ]; then
        echo -e "${RED}❌ Deploy to staging first!${NC}"
        exit 1
    fi
    
    read -p "Have you created a Neon database branch? (yes/no): " branched
    if [ "$branched" != "yes" ]; then
        echo -e "${RED}❌ Create a database branch first!${NC}"
        echo "Go to: https://console.neon.tech → Branches → Create Branch"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"

# 2. Test Database Connection
echo -e "${YELLOW}[2/8] Testing Database Connection...${NC}"

if [ "$DEPLOYMENT_ENV" == "production" ]; then
    DB_URL=$PROD_DB_URL
else
    DB_URL=$STAGING_DB_URL
fi

# Simple connection test (requires psql)
if command -v psql &> /dev/null; then
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Database connection failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not found, skipping connection test${NC}"
fi

# 3. Check for Pending Migrations
echo -e "${YELLOW}[3/8] Checking Migrations...${NC}"
cd backend

# Check if migrations are up to date
CURRENT_HEAD=$(alembic current 2>&1 | grep -oP '(?<=\(head\)$|\w{12}$)' || echo "none")
TARGET_HEAD=$(alembic heads 2>&1 | grep -oP '^\w{12}' || echo "unknown")

if [ "$CURRENT_HEAD" != "$TARGET_HEAD" ]; then
    echo -e "${YELLOW}⚠️  Database needs migration: $CURRENT_HEAD → $TARGET_HEAD${NC}"
    
    if [ "$DEPLOYMENT_ENV" == "production" ]; then
        read -p "Apply migrations to PRODUCTION? (yes/no): " apply
        if [ "$apply" != "yes" ]; then
            echo -e "${RED}❌ Deployment cancelled${NC}"
            exit 1
        fi
    fi
else
    echo -e "${GREEN}✓ Database is up to date${NC}"
fi

cd ..

# 4. Run Tests
echo -e "${YELLOW}[4/8] Running Tests...${NC}"

if [ -f "backend/pytest.ini" ]; then
    cd backend
    if pytest tests/ -v --tb=short; then
        echo -e "${GREEN}✓ All tests passed${NC}"
    else
        echo -e "${RED}❌ Tests failed!${NC}"
        exit 1
    fi
    cd ..
else
    echo -e "${YELLOW}⚠️  No tests configured, skipping...${NC}"
fi

# 5. Build Docker Images
echo -e "${YELLOW}[5/8] Building Docker Images...${NC}"
if docker compose -f docker-compose.prod.yml build --no-cache; then
    echo -e "${GREEN}✓ Images built successfully${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# 6. Backup Current State (if production)
if [ "$DEPLOYMENT_ENV" == "production" ]; then
    echo -e "${YELLOW}[6/8] Creating Backup Point...${NC}"
    echo "Backup timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo "Use this timestamp for point-in-time recovery if needed"
    
    read -p "Press Enter to continue..."
else
    echo -e "${YELLOW}[6/8] Skipping Backup (staging)${NC}"
fi

# 7. Deploy
echo -e "${YELLOW}[7/8] Deploying...${NC}"

# Trigger GitHub Actions deployment
if [ "$DEPLOYMENT_ENV" == "production" ]; then
    gh workflow run deploy.yml -f confirm=deploy -f environment=production
else
    gh workflow run deploy.yml -f confirm=deploy -f environment=staging
fi

echo -e "${GREEN}✓ Deployment triggered${NC}"

# 8. Monitor Deployment
echo -e "${YELLOW}[8/8] Monitoring Deployment...${NC}"
echo "Watching deployment logs..."

sleep 5
gh run list --workflow=deploy.yml --limit 1 --json status,conclusion,databaseId

echo ""
echo -e "${GREEN}=== Deployment Script Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor deployment: gh run watch"
echo "2. Check logs: ssh ubuntu@34.239.176.138 'docker compose logs -f backend'"
echo "3. Test endpoints: curl https://api.nerdchurchpartners.org/health"
echo ""

if [ "$DEPLOYMENT_ENV" == "production" ]; then
    echo -e "${RED}IMPORTANT:${NC}"
    echo "- Monitor Sentry for errors: https://sentry.io"
    echo "- If issues occur, rollback: alembic downgrade -1"
    echo "- Database branch name: ________________________"
    echo "  (write down your branch name for quick restore)"
fi
