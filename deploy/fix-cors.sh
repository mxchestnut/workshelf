#!/bin/bash
# Fix CORS duplicate headers issue
# Run this on the EC2 server

set -e

echo "🔧 Fixing CORS configuration..."

# Backup nginx configs
sudo cp /etc/nginx/sites-available/api.workshelf.dev /etc/nginx/sites-available/api.workshelf.dev.backup 2>/dev/null || true
sudo cp /etc/nginx/sites-available/workshelf.dev /etc/nginx/sites-available/workshelf.dev.backup 2>/dev/null || true

# Check which config file exists and contains CORS headers
if [ -f /etc/nginx/sites-available/api.workshelf.dev ]; then
    echo "Found api.workshelf.dev config"
    
    # Remove CORS headers from api config
    sudo sed -i '/add_header Access-Control-Allow-Origin/d' /etc/nginx/sites-available/api.workshelf.dev
    sudo sed -i '/add_header Access-Control-Allow-Methods/d' /etc/nginx/sites-available/api.workshelf.dev
    sudo sed -i '/add_header Access-Control-Allow-Headers/d' /etc/nginx/sites-available/api.workshelf.dev
    sudo sed -i '/add_header Access-Control-Allow-Credentials/d' /etc/nginx/sites-available/api.workshelf.dev
    
    echo "✅ Removed CORS headers from api.workshelf.dev"
fi

if [ -f /etc/nginx/sites-available/workshelf.dev ]; then
    echo "Found workshelf.dev config"
    
    # Check if it proxies to backend
    if grep -q "proxy_pass.*:8000" /etc/nginx/sites-available/workshelf.dev; then
        # Remove CORS headers from main config
        sudo sed -i '/add_header Access-Control-Allow-Origin/d' /etc/nginx/sites-available/workshelf.dev
        sudo sed -i '/add_header Access-Control-Allow-Methods/d' /etc/nginx/sites-available/workshelf.dev
        sudo sed -i '/add_header Access-Control-Allow-Headers/d' /etc/nginx/sites-available/workshelf.dev
        sudo sed -i '/add_header Access-Control-Allow-Credentials/d' /etc/nginx/sites-available/workshelf.dev
        
        echo "✅ Removed CORS headers from workshelf.dev"
    fi
fi

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
