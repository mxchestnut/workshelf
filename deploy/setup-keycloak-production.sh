#!/bin/bash
set -e

# WorkShelf Production Keycloak Setup
# This script deploys Keycloak to your production VM with SSL

echo "=========================================="
echo "WorkShelf Keycloak Production Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Configuration
KEYCLOAK_VERSION="23.0"
KEYCLOAK_ADMIN="admin"
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 32)
DOMAIN="keycloak.workshelf.dev"
EMAIL="kit@workshelf.dev"  # Change this to your email

echo -e "${GREEN}Step 1: Installing Docker (if not installed)${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${YELLOW}✓ Docker already installed${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Creating Keycloak directories${NC}"
mkdir -p /opt/keycloak/{data,postgres}
chmod -R 755 /opt/keycloak

echo ""
echo -e "${GREEN}Step 3: Creating Keycloak PostgreSQL database${NC}"

# Stop existing Keycloak containers if any
docker stop keycloak-db keycloak 2>/dev/null || true
docker rm keycloak-db keycloak 2>/dev/null || true

# Start PostgreSQL for Keycloak
docker run -d \
  --name keycloak-db \
  --restart unless-stopped \
  -e POSTGRES_DB=keycloak \
  -e POSTGRES_USER=keycloak \
  -e POSTGRES_PASSWORD="$KEYCLOAK_DB_PASSWORD" \
  -v /opt/keycloak/postgres:/var/lib/postgresql/data \
  postgres:15-alpine

echo -e "${GREEN}✓ PostgreSQL started${NC}"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

echo ""
echo -e "${GREEN}Step 4: Starting Keycloak${NC}"

docker run -d \
  --name keycloak \
  --restart unless-stopped \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN="$KEYCLOAK_ADMIN" \
  -e KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  -e KC_DB=postgres \
  -e KC_DB_URL="jdbc:postgresql://keycloak-db:5432/keycloak" \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD="$KEYCLOAK_DB_PASSWORD" \
  -e KC_HOSTNAME="$DOMAIN" \
  -e KC_PROXY=edge \
  -e KC_HTTP_ENABLED=true \
  --link keycloak-db:keycloak-db \
  quay.io/keycloak/keycloak:$KEYCLOAK_VERSION \
  start --optimized

echo -e "${GREEN}✓ Keycloak started${NC}"

# Wait for Keycloak to be ready
echo "Waiting for Keycloak to start (this may take 30-60 seconds)..."
for i in {1..60}; do
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Keycloak is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

echo ""
echo -e "${GREEN}Step 5: Configuring Nginx${NC}"

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create nginx config for Keycloak
cat > /etc/nginx/sites-available/keycloak << 'NGINX_EOF'
server {
    listen 80;
    server_name keycloak.workshelf.dev;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name keycloak.workshelf.dev;
    
    # SSL will be configured by certbot
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
NGINX_EOF

# Enable the site
ln -sf /etc/nginx/sites-available/keycloak /etc/nginx/sites-enabled/keycloak

# Test nginx config
nginx -t

# Reload nginx
systemctl reload nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

echo ""
echo -e "${GREEN}Step 6: Obtaining SSL certificate${NC}"

# Get SSL certificate
certbot --nginx -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect

echo -e "${GREEN}✓ SSL certificate obtained${NC}"

echo ""
echo -e "${GREEN}Step 7: Saving credentials${NC}"

# Save credentials to a secure file
cat > /opt/keycloak/credentials.txt << EOF
==============================================
Keycloak Production Credentials
==============================================

Admin Console: https://$DOMAIN

Admin Username: $KEYCLOAK_ADMIN
Admin Password: $KEYCLOAK_ADMIN_PASSWORD

Database Password: $KEYCLOAK_DB_PASSWORD

==============================================
IMPORTANT: Save these credentials securely!
This file will be deleted in 60 seconds.
==============================================
EOF

chmod 600 /opt/keycloak/credentials.txt

echo -e "${GREEN}✓ Credentials saved to /opt/keycloak/credentials.txt${NC}"
echo ""
cat /opt/keycloak/credentials.txt
echo ""

echo -e "${YELLOW}Reading credentials for 60 seconds...${NC}"
sleep 60

# Delete the credentials file
rm -f /opt/keycloak/credentials.txt
echo -e "${GREEN}✓ Credentials file deleted for security${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Keycloak Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Access Keycloak at: https://$DOMAIN"
echo "2. Login with the admin credentials shown above"
echo "3. Create the 'workshelf' realm"
echo "4. Create clients: workshelf-frontend and workshelf-api"
echo "5. Update your application .env files with the client secrets"
echo ""
echo "See docs/KEYCLOAK_SETUP.md for detailed configuration steps."
echo ""
