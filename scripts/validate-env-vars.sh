#!/bin/bash
# Validate environment variable consistency across files
# Ensures .env.prod.template has all variables used in docker-compose files

set -e

echo "🔧 Environment Variable Validation"
echo "==================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Extract variables from docker-compose files
echo "🔍 Scanning docker-compose files for environment variables..."
COMPOSE_VARS=$(grep -hroE '\$\{[A-Z_][A-Z0-9_]*\}' docker-compose*.yml 2>/dev/null | \
              sed 's/\${//g' | sed 's/}//g' | sort -u)

if [ -z "$COMPOSE_VARS" ]; then
    echo -e "${GREEN}✅ No environment variables found in compose files${NC}"
    exit 0
fi

echo "Found $(echo "$COMPOSE_VARS" | wc -l | tr -d ' ') unique variables"
echo ""

# Check if .env.prod.template exists
if [ ! -f ".env.prod.template" ]; then
    echo -e "${RED}❌ .env.prod.template not found${NC}"
    echo "Create it with all required environment variables"
    exit 1
fi

# Extract variables from template
TEMPLATE_VARS=$(grep -oE '^[A-Z_][A-Z0-9_]*=' .env.prod.template | sed 's/=//g' | sort -u)

echo "🔍 Checking coverage in .env.prod.template..."
echo ""

MISSING=()
for var in $COMPOSE_VARS; do
    if ! echo "$TEMPLATE_VARS" | grep -q "^${var}$"; then
        echo -e "${RED}❌ Missing: $var${NC}"
        MISSING+=("$var")
        ERRORS=$((ERRORS + 1))
    fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All compose variables documented in template${NC}"
else
    echo ""
    echo -e "${RED}Missing variables in .env.prod.template:${NC}"
    for var in "${MISSING[@]}"; do
        echo "  $var=<value>"
    done
fi

echo ""

# Check for unused variables in template
echo "🔍 Checking for unused variables in template..."
UNUSED=()
for var in $TEMPLATE_VARS; do
    if ! echo "$COMPOSE_VARS" | grep -q "^${var}$"; then
        UNUSED+=("$var")
        WARNINGS=$((WARNINGS + 1))
    fi
done

if [ ${#UNUSED[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All template variables are used${NC}"
else
    echo -e "${YELLOW}⚠️  Variables in template but not used in compose files:${NC}"
    for var in "${UNUSED[@]}"; do
        echo "  $var"
    done
    echo "  (May be used in code directly - not necessarily a problem)"
fi

echo ""
echo "═══════════════════════════════"
echo "SUMMARY"
echo "═══════════════════════════════"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation failed${NC}"
    echo "Update .env.prod.template with missing variables"
    exit 1
else
    echo -e "${GREEN}✅ Environment variables validated${NC}"
    exit 0
fi
