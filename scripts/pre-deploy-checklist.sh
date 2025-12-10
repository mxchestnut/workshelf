#!/bin/bash
# Pre-deployment checklist and validation
# Run this before every production deployment

set -e

echo "📋 Pre-Deployment Checklist"
echo "============================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WARNINGS=0
ERRORS=0
MANUAL_CHECKS_NEEDED=0

# Function to ask yes/no questions
ask_yn() {
    while true; do
        read -p "$1 (y/n): " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to prompt for manual check
manual_check() {
    MANUAL_CHECKS_NEEDED=$((MANUAL_CHECKS_NEEDED + 1))
    echo -e "${BLUE}⏸  $1${NC}"
    if ask_yn "$2"; then
        echo -e "${GREEN}   ✅ Confirmed${NC}"
        return 0
    else
        echo -e "${RED}   ❌ Not completed${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo "═══════════════════════════════════════"
echo "SECTION 1: Code Quality & Testing"
echo "═══════════════════════════════════════"
echo ""

# 1. Git status
echo "🔍 Checking git status..."
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
    echo -e "${RED}❌ You have uncommitted changes!${NC}"
    git status --short
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Local testing
manual_check \
    "Have you tested these changes locally with docker-compose.local.yml?" \
    "Confirm tested locally"
echo ""

# 3. Tests passing
manual_check \
    "Did all backend tests pass (pytest tests/)?" \
    "Confirm tests passed"
echo ""

# 4. No errors in logs
manual_check \
    "Are there no errors in local logs?" \
    "Confirm no local errors"
echo ""

echo "═══════════════════════════════════════"
echo "SECTION 2: Security"
echo "═══════════════════════════════════════"
echo ""

# 5. Security audit
echo "🔒 Running security audit on current code..."
if git diff --name-only HEAD~1 HEAD | xargs grep -iE '(password.*=|secret.*=|api_key|token.*=|DATABASE_URL.*postgres)' > /dev/null 2>&1; then
    echo -e "${RED}❌ Found potential secrets in recent commits!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No obvious secrets in recent commits${NC}"
fi
echo ""

# 6. .env files
echo "🔍 Checking for .env files in git..."
if git ls-files | grep -E '\.env$|\.env\.prod$|\.env\.local$|\.pem$' > /dev/null 2>&1; then
    echo -e "${RED}❌ CRITICAL: .env or .pem files are tracked in git!${NC}"
    git ls-files | grep -E '\.env$|\.env\.prod$|\.env\.local$|\.pem$'
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No .env files tracked in git${NC}"
fi
echo ""

# 7. Hardcoded credentials
manual_check \
    "Have you verified no hardcoded credentials in the changes?" \
    "Confirm no hardcoded credentials"
echo ""

echo "═══════════════════════════════════════"
echo "SECTION 3: Backup & Safety"
echo "═══════════════════════════════════════"
echo ""

# 8. Keycloak changes
if git diff --name-only HEAD~1 HEAD | grep -iE '(keycloak|auth|user)' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Changes involve authentication/Keycloak${NC}"
    WARNINGS=$((WARNINGS + 1))
    
    if [ -d "./backups/keycloak" ] && [ "$(ls -A ./backups/keycloak 2>/dev/null | wc -l)" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t ./backups/keycloak/*.sql 2>/dev/null | head -1)
        BACKUP_AGE=$(( ($(date +%s) - $(stat -f %m "$LATEST_BACKUP" 2>/dev/null || echo 0)) / 60 ))
        
        if [ $BACKUP_AGE -lt 60 ]; then
            echo -e "${GREEN}✅ Recent Keycloak backup found (${BACKUP_AGE}m old)${NC}"
            echo "   Latest: $LATEST_BACKUP"
        else
            echo -e "${YELLOW}⚠️  Keycloak backup is old (${BACKUP_AGE}m old)${NC}"
            manual_check \
                "Should create a fresh backup with scripts/backup-keycloak.sh" \
                "Create backup now? (Will wait)"
            
            if [ $? -eq 0 ]; then
                echo "Run: ./scripts/backup-keycloak.sh"
                ./scripts/backup-keycloak.sh || ERRORS=$((ERRORS + 1))
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  No Keycloak backup found${NC}"
        manual_check \
            "Should create a backup with scripts/backup-keycloak.sh first" \
            "Create backup now?"
        
        if [ $? -eq 0 ]; then
            ./scripts/backup-keycloak.sh || ERRORS=$((ERRORS + 1))
        fi
    fi
else
    echo -e "${GREEN}✅ No authentication changes detected${NC}"
fi
echo ""

# 9. Database migrations
if git diff --name-only HEAD~1 HEAD | grep -E '(alembic/versions|migrations/)' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Database migrations detected${NC}"
    WARNINGS=$((WARNINGS + 1))
    manual_check \
        "Have you tested the migration can be applied and rolled back?" \
        "Confirm migration tested"
else
    echo -e "${GREEN}✅ No database migrations${NC}"
fi
echo ""

# 10. Breaking changes
manual_check \
    "Are these changes backward compatible OR do you have a migration plan?" \
    "Confirm backward compatible or migration planned"
echo ""

echo "═══════════════════════════════════════"
echo "SECTION 4: Environment & Configuration"
echo "═══════════════════════════════════════"
echo ""

# 11. New environment variables
if git diff --name-only HEAD~1 HEAD | xargs git diff HEAD~1 HEAD | grep -E '^\+.*os\.getenv|^\+.*process\.env' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  New environment variables detected${NC}"
    WARNINGS=$((WARNINGS + 1))
    manual_check \
        "Have you updated .env.prod.template with new variables?" \
        "Confirm .env.prod.template updated"
    
    manual_check \
        "Have you added the new variables to .env.prod on production server?" \
        "Confirm production .env.prod updated"
else
    echo -e "${GREEN}✅ No new environment variables${NC}"
fi
echo ""

# 12. docker-compose changes
if git diff --name-only HEAD~1 HEAD | grep -E 'docker-compose.*\.yml' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  docker-compose configuration changed${NC}"
    WARNINGS=$((WARNINGS + 1))
    manual_check \
        "Have you updated both docker-compose.local.yml AND docker-compose.prod.yml?" \
        "Confirm both compose files updated"
else
    echo -e "${GREEN}✅ No docker-compose changes${NC}"
fi
echo ""

echo "═══════════════════════════════════════"
echo "SECTION 5: Rollback Plan"
echo "═══════════════════════════════════════"
echo ""

# 13. Rollback verification
echo "Current commit: $(git rev-parse --short HEAD)"
echo "Previous commit: $(git rev-parse --short HEAD~1)"
echo ""

manual_check \
    "If this deployment breaks production, can you rollback with 'git reset --hard HEAD~1'?" \
    "Confirm rollback plan"
echo ""

manual_check \
    "Have you documented any special rollback steps (if needed)?" \
    "Confirm rollback documented (or N/A)"
echo ""

echo "═══════════════════════════════════════"
echo "FINAL SUMMARY"
echo "═══════════════════════════════════════"
echo ""

echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${BLUE}Manual checks completed: $MANUAL_CHECKS_NEEDED${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ❌ DEPLOYMENT BLOCKED - FIX ERRORS   ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Fix the above errors before deploying."
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║      ⚠️  PROCEED WITH CAUTION         ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "You have $WARNINGS warning(s). Review carefully before deploying."
    echo ""
    
    if ask_yn "Proceed with deployment?"; then
        echo -e "${GREEN}✅ Deployment approved${NC}"
        echo ""
        echo "Run: ./deploy-prod.sh"
        exit 0
    else
        echo -e "${RED}❌ Deployment cancelled${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║    ✅ ALL CHECKS PASSED - SAFE TO     ║${NC}"
    echo -e "${GREEN}║           DEPLOY TO PRODUCTION        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Run: ./deploy-prod.sh"
    echo ""
    exit 0
fi
