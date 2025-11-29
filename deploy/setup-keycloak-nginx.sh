#!/bin/bash
# Setup or update nginx configuration for Keycloak subdomain with proper timeouts
# Run this on your production server as root or with sudo

set -e

DOMAIN="keycloak.workshelf.dev"
CONFIG_FILE="/etc/nginx/sites-available/${DOMAIN}"
KEYCLOAK_PORT="${KEYCLOAK_PORT:-8080}"

echo "🔧 Configuring nginx for ${DOMAIN}..."

# Backup existing config if present
if [ -f "$CONFIG_FILE" ]; then
    echo "📦 Backing up existing config to ${CONFIG_FILE}.bak"
    cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
fi

# Create upstream definition and server config
cat > "$CONFIG_FILE" << 'NGINX_CONFIG'
# Keycloak upstream with connection pooling
upstream keycloak_backend {
    server localhost:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name keycloak.workshelf.dev;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name keycloak.workshelf.dev;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/keycloak.workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/keycloak.workshelf.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/keycloak-access.log;
    error_log /var/log/nginx/keycloak-error.log warn;

    # Critical: Increase timeouts for slow admin operations
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Buffer configuration for large tokens and SAML responses
    proxy_buffer_size 128k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    client_max_body_size 20M;
    client_body_buffer_size 256k;

    # Proxy to Keycloak
    location / {
        proxy_pass http://keycloak_backend;
        proxy_http_version 1.1;
        
        # Connection handling
        proxy_set_header Connection "";
        proxy_set_header Upgrade $http_upgrade;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_set_header X-Forwarded-Ssl on;
        
        # Disable buffering for real-time endpoints
        proxy_buffering off;
        proxy_redirect off;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://keycloak_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
NGINX_CONFIG

# Enable the site
echo "🔗 Enabling site configuration..."
ln -sf "$CONFIG_FILE" "/etc/nginx/sites-enabled/${DOMAIN}"

# Test nginx configuration
echo "✅ Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx config is valid"
else
    echo "❌ Nginx config test failed!"
    if [ -f "${CONFIG_FILE}.bak" ]; then
        echo "♻️  Restoring backup..."
        mv "${CONFIG_FILE}.bak" "$CONFIG_FILE"
    fi
    exit 1
fi

# Get SSL certificate if not present
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔐 Obtaining SSL certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@workshelf.dev --redirect
else
    echo "✅ SSL certificate already exists"
fi

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✨ Setup complete!"
echo "   Test with: curl -I https://${DOMAIN}/health"
echo ""
echo "📝 Timeout settings applied:"
echo "   - Connect timeout: 300s"
echo "   - Send/Read timeout: 300s"
echo "   - Buffer size: 512k"
echo ""
echo "🔍 Monitor logs:"
echo "   - Access: tail -f /var/log/nginx/keycloak-access.log"
echo "   - Errors: tail -f /var/log/nginx/keycloak-error.log"
