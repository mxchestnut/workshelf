#!/bin/bash
# Setup SSL and DNS for WorkShelf

set -e

PUBLIC_IP="100.27.250.133"
DOMAIN="workshelf.dev"
INSTANCE_ID="i-00d113ad6dd246b7a"

echo "🌐 Setting up DNS and SSL for $DOMAIN"
echo "========================================"
echo ""

# Get hosted zone ID
echo "🔍 Finding Route53 hosted zone..."
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
    --output text | cut -d'/' -f3)

if [ -z "$ZONE_ID" ]; then
    echo "❌ Could not find hosted zone for $DOMAIN"
    exit 1
fi

echo "✅ Found hosted zone: $ZONE_ID"
echo ""

# Create DNS records
echo "📝 Creating DNS records..."

# Create A record for root domain
cat > /tmp/change-batch-root.json << EOF
{
  "Comment": "Create A record for WorkShelf",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "${DOMAIN}",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "${PUBLIC_IP}"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch file:///tmp/change-batch-root.json > /dev/null

echo "✅ Created A record: $DOMAIN -> $PUBLIC_IP"

# Create A record for www subdomain
cat > /tmp/change-batch-www.json << EOF
{
  "Comment": "Create A record for www subdomain",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "www.${DOMAIN}",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "${PUBLIC_IP}"}]
    }
  }]
}
EOF

aws route53 change-resource-record-sets \
    --hosted-zone-id "$ZONE_ID" \
    --change-batch file:///tmp/change-batch-www.json > /dev/null

echo "✅ Created A record: www.$DOMAIN -> $PUBLIC_IP"
echo ""

# Wait for DNS propagation
echo "⏳ Waiting 30 seconds for DNS propagation..."
sleep 30

# SSH into instance and setup SSL
echo "🔒 Setting up SSL certificate with Let's Encrypt..."
ssh -i ~/.ssh/workshelf-key.pem -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'ENDSSH'
# Update environment variables with domain
sudo su - << 'ENDROOT'
cd /opt/workshelf-repo

# Update .env with domain
sed -i "s|http://.*:8000|https://workshelf.dev|g" .env
sed -i "s|http://.*:8080|https://workshelf.dev/auth|g" .env
sed -i "s|http://.*:5173|https://workshelf.dev|g" .env
sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://workshelf.dev/api|g" .env
sed -i "s|VITE_KEYCLOAK_URL=.*|VITE_KEYCLOAK_URL=https://workshelf.dev/auth|g" .env

# Create Nginx config with SSL
cat > /etc/nginx/sites-available/workshelf << 'NGINX'
server {
    listen 80;
    server_name workshelf.dev www.workshelf.dev;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workshelf.dev www.workshelf.dev;

    # SSL certificates (will be filled by certbot)
    ssl_certificate /etc/letsencrypt/live/workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workshelf.dev/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Keycloak
    location /auth {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/workshelf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Get SSL certificate
certbot --nginx -d workshelf.dev -d www.workshelf.dev --non-interactive --agree-tos --email admin@workshelf.dev --redirect

# Reload nginx
systemctl reload nginx

# Update Keycloak redirect URIs
docker-compose -f /opt/workshelf-repo/docker-compose.yml exec -T keycloak /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://localhost:8080 --realm master --user admin --password admin

# Update frontend client redirect URIs
FRONTEND_CLIENT_ID=$(docker-compose -f /opt/workshelf-repo/docker-compose.yml exec -T keycloak /opt/keycloak/bin/kcadm.sh get clients -r workshelf --fields id,clientId | grep -B1 '"clientId" : "workshelf-frontend"' | grep '"id"' | cut -d'"' -f4)

docker-compose -f /opt/workshelf-repo/docker-compose.yml exec -T keycloak /opt/keycloak/bin/kcadm.sh update clients/$FRONTEND_CLIENT_ID -r workshelf \
    -s 'redirectUris=["https://workshelf.dev/*","https://www.workshelf.dev/*","https://workshelf.dev/auth/callback","https://www.workshelf.dev/auth/callback"]' \
    -s 'webOrigins=["https://workshelf.dev","https://www.workshelf.dev"]'

# Restart containers with new environment
docker-compose -f /opt/workshelf-repo/docker-compose.yml restart frontend backend

echo "✅ SSL configured successfully!"
ENDROOT
ENDSSH

echo ""
echo "✨ HTTPS setup complete!"
echo "======================="
echo ""
echo "🌐 Your site is now accessible at:"
echo "   https://workshelf.dev"
echo "   https://www.workshelf.dev"
echo ""
echo "🔒 SSL certificate installed and auto-renewal configured"
echo "🔐 Keycloak configured for HTTPS"
echo ""
echo "🎉 WorkShelf is now secure and production-ready!"
