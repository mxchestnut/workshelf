#!/bin/bash
# Health check script - verify all services are running correctly
# Run this after deployment to ensure everything is working

set -e

echo "🏥 Service Health Check"
echo "======================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Configuration
if [ "$1" == "--local" ]; then
    ENVIRONMENT="local"
    BACKEND_URL="http://localhost:8000"
    FRONTEND_URL="http://localhost:5173"
    KEYCLOAK_URL="http://localhost:8080"
else
    ENVIRONMENT="production"
    BACKEND_URL="https://api.workshelf.dev"
    FRONTEND_URL="https://workshelf.dev"
    KEYCLOAK_URL="https://keycloak.workshelf.dev"
fi

echo "Environment: $ENVIRONMENT"
echo ""

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "🔍 Checking $name... "
    
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" == "$expected_status" ]; then
            echo -e "${GREEN}✅ OK ($HTTP_CODE)${NC}"
        elif [ "$HTTP_CODE" == "000" ]; then
            echo -e "${RED}❌ UNREACHABLE${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}⚠️  Unexpected status: $HTTP_CODE (expected $expected_status)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3
    
    echo -n "🔍 Checking $name... "
    
    if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s "$url" 2>/dev/null || echo "{}")
        
        if echo "$RESPONSE" | grep -q "\"$expected_key\""; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${RED}❌ Invalid response${NC}"
            echo "   Expected key: $expected_key"
            echo "   Got: ${RESPONSE:0:100}"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  curl not available, skipping${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
}

# Backend checks
echo "═══════════════════════════════"
echo "BACKEND SERVICES"
echo "═══════════════════════════════"
check_json_endpoint "Backend API Health" "$BACKEND_URL/health" "status"
check_endpoint "API Documentation" "$BACKEND_URL/docs" "200"
check_endpoint "OpenAPI Schema" "$BACKEND_URL/openapi.json" "200"
echo ""

# Frontend checks
echo "═══════════════════════════════"
echo "FRONTEND"
echo "═══════════════════════════════"
check_endpoint "Frontend" "$FRONTEND_URL" "200"
echo ""

# Keycloak checks
echo "═══════════════════════════════"
echo "AUTHENTICATION"
echo "═══════════════════════════════"
check_json_endpoint "Keycloak Realm" "$KEYCLOAK_URL/realms/workshelf/.well-known/openid-configuration" "issuer"
echo ""

# Docker checks (if running locally or can SSH to prod)
if [ "$ENVIRONMENT" == "local" ]; then
    echo "═══════════════════════════════"
    echo "DOCKER CONTAINERS"
    echo "═══════════════════════════════"
    
    if command -v docker &> /dev/null; then
        CONTAINERS=$(docker ps --filter "name=workshelf" --format "{{.Names}}" 2>/dev/null)
        
        if [ -z "$CONTAINERS" ]; then
            echo -e "${RED}❌ No WorkShelf containers running${NC}"
            ERRORS=$((ERRORS + 1))
        else
            for container in $CONTAINERS; do
                STATUS=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
                if [ "$STATUS" == "running" ]; then
                    echo -e "${GREEN}✅ $container${NC}"
                else
                    echo -e "${RED}❌ $container (status: $STATUS)${NC}"
                    ERRORS=$((ERRORS + 1))
                fi
            done
        fi
    else
        echo -e "${YELLOW}⚠️  Docker not available${NC}"
    fi
    echo ""
fi

# Summary
echo "═══════════════════════════════"
echo "HEALTH CHECK SUMMARY"
echo "═══════════════════════════════"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Health check failed${NC}"
    echo "Some services are not responding correctly"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Health check passed with warnings${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All services healthy${NC}"
    exit 0
fi
