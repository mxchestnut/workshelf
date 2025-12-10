#!/bin/bash
# Validate docker-compose files for syntax and configuration errors
# Run this before committing docker-compose changes

set -e

echo "🐳 Docker Compose Validation"
echo "============================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Find all docker-compose files
COMPOSE_FILES=$(find . -name "docker-compose*.yml" -not -path "./.git/*")

if [ -z "$COMPOSE_FILES" ]; then
    echo -e "${YELLOW}⚠️  No docker-compose files found${NC}"
    exit 0
fi

for file in $COMPOSE_FILES; do
    echo "🔍 Validating: $file"
    echo "─────────────────────────────"
    
    # 1. Check YAML syntax
    if ! docker-compose -f "$file" config > /dev/null 2>&1; then
        echo -e "${RED}❌ YAML syntax error${NC}"
        docker-compose -f "$file" config 2>&1 | head -10
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ YAML syntax valid${NC}"
    fi
    
    # 2. Check for required environment variables
    echo "🔍 Checking environment variable references..."
    MISSING_VARS=$(docker-compose -f "$file" config 2>&1 | grep "variable is not set" | wc -l | tr -d ' ')
    
    if [ "$MISSING_VARS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $MISSING_VARS environment variables not set (expected for prod)${NC}"
        docker-compose -f "$file" config 2>&1 | grep "variable is not set" | head -5
        # This is expected for prod files, just a warning
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ All environment variables set${NC}"
    fi
    
    # 3. Check for common issues
    echo "🔍 Checking for common issues..."
    
    # Check for hardcoded localhost in production files
    if [[ "$file" == *"prod"* ]] && grep -q "localhost\|127.0.0.1" "$file"; then
        echo -e "${YELLOW}⚠️  Found localhost/127.0.0.1 in production file${NC}"
        grep -n "localhost\|127.0.0.1" "$file"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for missing restart policies
    if ! grep -q "restart:" "$file"; then
        echo -e "${YELLOW}⚠️  No restart policies defined${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ Restart policies defined${NC}"
    fi
    
    # Check for missing networks
    if ! grep -q "networks:" "$file"; then
        echo -e "${YELLOW}⚠️  No networks defined (services will use default)${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ Networks defined${NC}"
    fi
    
    # Check for exposed ports without host binding (potential security issue)
    if grep -q "expose:" "$file"; then
        echo -e "${GREEN}✅ Using 'expose' for internal ports${NC}"
    fi
    
    echo ""
done

# Summary
echo "═══════════════════════════════"
echo "VALIDATION SUMMARY"
echo "═══════════════════════════════"
echo -e "Files checked: $(echo "$COMPOSE_FILES" | wc -l | tr -d ' ')"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation failed - fix errors before committing${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All docker-compose files valid${NC}"
    exit 0
fi
