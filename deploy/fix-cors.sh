#!/bin/bash
# Fix CORS configuration - Let FastAPI handle CORS completely
# Run this on the EC2 server

set -e

echo "🔧 Fixing CORS configuration..."

# Backup nginx configs
sudo cp /etc/nginx/sites-available/api.workshelf.dev /etc/nginx/sites-available/api.workshelf.dev.backup 2>/dev/null || true
sudo cp /etc/nginx/sites-available/workshelf.dev /etc/nginx/sites-available/workshelf.dev.backup 2>/dev/null || true

# Function to fix CORS in a config file
fix_cors_in_file() {
    local config_file=$1
    echo "Processing $config_file..."
    
    # Remove any existing CORS headers
    sudo sed -i '/add_header Access-Control-Allow-Origin/d' "$config_file"
    sudo sed -i '/add_header Access-Control-Allow-Methods/d' "$config_file"
    sudo sed -i '/add_header Access-Control-Allow-Headers/d' "$config_file"
    sudo sed -i '/add_header Access-Control-Allow-Credentials/d' "$config_file"
    
    # Ensure proxy headers are set (if proxy_pass exists)
    if grep -q "proxy_pass" "$config_file"; then
        # Check if proxy headers section exists
        if ! grep -q "proxy_set_header Host" "$config_file"; then
            # Add proxy headers before first proxy_pass
            sudo sed -i '0,/proxy_pass/s/proxy_pass/proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        \n        proxy_pass/' "$config_file"
        fi
    fi
    
    echo "✅ Fixed $config_file"
}

# Fix api.workshelf.dev if it exists
if [ -f /etc/nginx/sites-available/api.workshelf.dev ]; then
    fix_cors_in_file /etc/nginx/sites-available/api.workshelf.dev
fi

# Fix workshelf.dev if it proxies to backend
if [ -f /etc/nginx/sites-available/workshelf.dev ]; then
    if grep -q "proxy_pass.*:8000" /etc/nginx/sites-available/workshelf.dev; then
        fix_cors_in_file /etc/nginx/sites-available/workshelf.dev
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
