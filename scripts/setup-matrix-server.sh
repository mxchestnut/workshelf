#!/bin/bash
# Quick setup script for Matrix Synapse server

set -e

echo "🚀 Matrix Synapse Server Setup for Work Shelf"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please don't run as root. Run as your regular user."
   exit 1
fi

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Navigate to matrix-synapse directory
cd "$(dirname "$0")/../docker/matrix-synapse"

echo "📁 Current directory: $(pwd)"
echo ""

# Check if already set up
if [ -d "data" ] && [ -f "data/homeserver.yaml" ]; then
    echo "⚠️  Matrix server appears to be already configured."
    read -p "Do you want to reconfigure? This will backup existing config. (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Backing up existing configuration..."
        backup_dir="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$backup_dir"
        cp -r data "$backup_dir/"
        [ -f .env ] && cp .env "$backup_dir/"
        echo "✅ Backup saved to $backup_dir"
    else
        echo "Exiting without changes."
        exit 0
    fi
fi

# Generate postgres password
echo "🔐 Generating secure postgres password..."
POSTGRES_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Generate registration shared secret
echo "🔐 Generating registration shared secret..."
REGISTRATION_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

# Create .env file
echo "📝 Creating .env file..."
cat > .env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
EOF

echo "✅ .env file created"

# Generate Synapse config
echo "🔧 Generating Synapse configuration..."
docker run -it --rm \
  -v "$(pwd)/data:/data" \
  -e SYNAPSE_SERVER_NAME=matrix.workshelf.dev \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate

echo "✅ Base configuration generated"

# Update homeserver.yaml with database config
echo "📝 Configuring database connection..."
cat >> data/homeserver.yaml << EOF

# Database configuration
database:
  name: psycopg2
  args:
    user: synapse_user
    password: $POSTGRES_PASSWORD
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10

# Enable registration for Work Shelf app
enable_registration: true
enable_registration_without_verification: true
registration_shared_secret: "$REGISTRATION_SECRET"

# Redis configuration
redis:
  enabled: true
  host: redis
  port: 6379

# Security settings
allow_guest_access: false
allow_public_rooms_without_auth: false
allow_public_rooms_over_federation: false

# Upload settings
max_upload_size: 50M

# URL previews
url_preview_enabled: true
url_preview_ip_range_blacklist:
  - '127.0.0.0/8'
  - '10.0.0.0/8'
  - '172.16.0.0/12'
  - '192.168.0.0/16'
EOF

echo "✅ Configuration updated"

# Save secrets to file
echo "📝 Saving secrets..."
cat > SECRETS.txt << EOF
Matrix Synapse Server Secrets
==============================
Generated: $(date)

Postgres Password:
$POSTGRES_PASSWORD

Registration Shared Secret:
$REGISTRATION_SECRET

IMPORTANT:
1. Add these to your backend/.env:
   MATRIX_HOMESERVER=https://matrix.workshelf.dev
   MATRIX_REGISTRATION_SHARED_SECRET=$REGISTRATION_SECRET

2. Keep this file secure and backed up!
3. Do NOT commit this file to git!

EOF

echo "✅ Secrets saved to SECRETS.txt"

# Create .gitignore
cat > .gitignore << EOF
data/
postgres-data/
redis-data/
.env
SECRETS.txt
backup-*/
*.log
EOF

# Start services
echo ""
echo "🚀 Starting Matrix services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
else
    echo "❌ Services may not have started correctly. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi

# Test server
echo ""
echo "🧪 Testing Matrix server..."
if curl -s https://matrix.workshelf.dev/_matrix/client/versions > /dev/null 2>&1; then
    echo "✅ Matrix server is responding!"
elif curl -s http://localhost:8008/_matrix/client/versions > /dev/null 2>&1; then
    echo "⚠️  Matrix server is running locally but not accessible via HTTPS"
    echo "   You still need to configure Nginx reverse proxy and SSL"
else
    echo "⚠️  Matrix server may not be fully ready yet"
    echo "   Wait a few more seconds and test manually:"
    echo "   curl http://localhost:8008/_matrix/client/versions"
fi

echo ""
echo "=============================================="
echo "✅ Matrix Synapse Setup Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure DNS:"
echo "   Add A record: matrix.workshelf.dev → Your Server IP"
echo ""
echo "2. Get SSL Certificate:"
echo "   sudo certbot certonly --standalone -d matrix.workshelf.dev"
echo ""
echo "3. Configure Nginx (see docs/MATRIX_SERVER_SETUP.md)"
echo ""
echo "4. Update Backend .env:"
echo "   MATRIX_HOMESERVER=https://matrix.workshelf.dev"
echo "   MATRIX_REGISTRATION_SHARED_SECRET=$REGISTRATION_SECRET"
echo ""
echo "5. Create Admin User:"
echo "   docker exec -it workshelf-matrix register_new_matrix_user \\"
echo "     -c /data/homeserver.yaml --admin http://localhost:8008"
echo ""
echo "📄 Full documentation: docs/MATRIX_SERVER_SETUP.md"
echo "🔐 Secrets saved in: docker/matrix-synapse/SECRETS.txt"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop server: docker-compose down"
echo ""
