#!/bin/bash
# Fix CORS - Ensure OPTIONS requests reach FastAPI
# Run this on the EC2 server

set -e

echo "🔧 Fixing CORS configuration..."

# Backup nginx configs
sudo cp /etc/nginx/sites-available/api.workshelf.dev /etc/nginx/sites-available/api.workshelf.dev.backup.$(date +%s) 2>/dev/null || true

# Function to ensure OPTIONS passes through to backend
fix_api_cors() {
    local config_file="/etc/nginx/sites-available/api.workshelf.dev"
    
    if [ ! -f "$config_file" ]; then
        echo "❌ Config file not found: $config_file"
        return 1
    fi
    
    echo "📝 Removing any CORS headers from nginx..."
    # Remove any existing CORS add_header directives
    sudo sed -i '/add_header Access-Control-/d' "$config_file"
    
    echo "✅ CORS headers removed from nginx"
    echo "✅ FastAPI will now handle all CORS"
}

# Fix the API config
fix_api_cors

echo ""
echo "🧪 Testing nginx configuration..."
if sudo nginx -t 2>&1; then
    echo "✅ Nginx config is valid"
    
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Nginx config test failed! Restoring backup..."
    sudo cp /etc/nginx/sites-available/api.workshelf.dev.backup.* /etc/nginx/sites-available/api.workshelf.dev 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ CORS fix complete!"
echo ""
echo "Testing with curl:"
curl -X OPTIONS https://api.workshelf.dev/api/v1/store/browse \
  -H "Origin: https://workshelf.dev" \
  -H "Access-Control-Request-Method: GET" \
  -i 2>&1 | grep -i "access-control" || echo "⚠️  Still no CORS headers - may need container restart"

echo ""
echo "If CORS headers still missing, restart backend:"
echo "  cd /opt/workshelf/deploy"
echo "  sudo docker-compose -f docker-compose.prod.yml restart backend"

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ CORS fix complete!"
echo ""
echo "FastAPI's CORSMiddleware will now handle all CORS headers properly."
echo "Test the API: curl -I https://api.workshelf.dev/health"
