# Azure Fresh Setup - WorkShelf Production

**Date:** December 18, 2025
**Goal:** Deploy WorkShelf to Azure from scratch with $1000 credits
**Approach:** Clean slate - only deploy what works

---

## 🎯 What We're Building

- **VM:** Standard_B2ms (2 vCPU, 16GB RAM) - ~$60/month (FREE with credits!)
- **Storage:** Azure Blob Storage for uploads
- **Security:** Azure Defender for Storage (malware scanning)
- **Database:** Neon PostgreSQL (already configured, no change)
- **Domain:** workshelf.dev (update DNS to point to Azure)

**Estimated free period:** 12-16 months on $1000 credits

---

## 📋 Prerequisites

- [ ] Azure account with $1000 credits activated
- [ ] Azure CLI installed: `brew install azure-cli`
- [ ] SSH key generated: `~/.ssh/workshelf-azure-key.pem`
- [ ] Domain DNS access (Namecheap/Cloudflare/etc)
- [ ] Access to Neon database credentials
- [ ] Access to Keycloak secrets

---

## Phase 1: Create Azure Resources (30 minutes)

### Step 1.1: Login to Azure

```bash
# Login
az login

# Verify credits
az account show

# Set subscription (if you have multiple)
az account list --output table
az account set --subscription "Your Subscription Name"

# Create resource group
az group create \
  --name workshelf-production \
  --location eastus
```

### Step 1.2: Create Virtual Machine

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/workshelf-azure-key -C "workshelf@azure"

# Create VM with 16GB RAM
az vm create \
  --resource-group workshelf-production \
  --name workshelf-vm \
  --image Ubuntu2204 \
  --size Standard_B2ms \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/workshelf-azure-key.pub \
  --public-ip-sku Standard \
  --public-ip-address-allocation static \
  --tags project=workshelf environment=production

# Get public IP address
az vm show \
  --resource-group workshelf-production \
  --name workshelf-vm \
  --show-details \
  --query publicIps \
  --output tsv
```

**Save this IP address!** You'll need it for DNS.

### Step 1.3: Configure Network Security

```bash
# Open HTTP (80)
az vm open-port \
  --resource-group workshelf-production \
  --name workshelf-vm \
  --port 80 \
  --priority 1001

# Open HTTPS (443)
az vm open-port \
  --resource-group workshelf-production \
  --name workshelf-vm \
  --port 443 \
  --priority 1002

# SSH is already open by default (port 22)
```

---

## Phase 2: Set Up VM (1 hour)

### Step 2.1: Connect and Update

```bash
# SSH to VM (replace with your IP)
ssh -i ~/.ssh/workshelf-azure-key azureuser@<YOUR_AZURE_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y \
  git \
  curl \
  wget \
  vim \
  htop \
  ufw \
  certbot \
  python3-certbot-nginx
```

### Step 2.2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker azureuser

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version

# IMPORTANT: Log out and back in for docker group to take effect
exit
ssh -i ~/.ssh/workshelf-azure-key azureuser@<YOUR_AZURE_IP>
```

### Step 2.3: Install Nginx

```bash
sudo apt install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Test
curl http://localhost
```

### Step 2.4: Configure Firewall

```bash
# Allow OpenSSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

---

## Phase 3: Deploy Application (1 hour)

### Step 3.1: Clone Repository

```bash
# Create app directory
sudo mkdir -p /home/azureuser/workshelf
sudo chown azureuser:azureuser /home/azureuser/workshelf
cd /home/azureuser/workshelf

# Clone from GitHub (you'll push the code first from local)
# For now, we'll upload via SCP from your local machine
```

### Step 3.2: Prepare Code Locally

On your **local machine**:

```bash
cd /Users/kit/Code/workshelf

# Create clean deployment package
tar -czf workshelf-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='__pycache__' \
  --exclude='.env' \
  --exclude='*.pyc' \
  backend/ frontend/ docker-compose.prod.yml

# Copy to Azure VM (replace with your IP)
scp -i ~/.ssh/workshelf-azure-key \
  workshelf-deploy.tar.gz \
  azureuser@<YOUR_AZURE_IP>:/home/azureuser/workshelf/

# SSH back to VM
ssh -i ~/.ssh/workshelf-azure-key azureuser@<YOUR_AZURE_IP>
```

### Step 3.3: Extract and Set Up

```bash
cd /home/azureuser/workshelf

# Extract
tar -xzf workshelf-deploy.tar.gz

# Create deploy directory if needed
mkdir -p deploy
cd deploy

# We'll move docker-compose here
mv ../docker-compose.prod.yml ./
```

### Step 3.4: Create Environment File

```bash
cd /home/azureuser/workshelf/deploy

# Create .env file
nano .env
```

**Copy this template and fill in your values:**

```bash
# Database (Neon - get from your current AWS .env)
DATABASE_URL=postgresql+asyncpg://neondb_owner:YOUR_PASSWORD@ep-shy-pond-ahpr8r8a-pooler.c-3.us-east-1.aws.neon.tech/workshelf-main?sslmode=require
DATABASE_USER=neondb_owner
DATABASE_PASSWORD=YOUR_PASSWORD

# Keycloak
KEYCLOAK_URL=https://keycloak.workshelf.dev
KEYCLOAK_DB_URL=jdbc:postgresql://ep-shy-pond-ahpr8r8a-pooler.c-3.us-east-1.aws.neon.tech/workshelf-keycloak?sslmode=require
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-backend
KEYCLOAK_CLIENT_SECRET=YOUR_SECRET
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD

# Frontend Keycloak
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend

# Azure Blob Storage (we'll set this up next)
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=workshelf-uploads

# Redis
REDIS_URL=redis://redis:6379

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=workshelf-production-token

# Sentry (if you use it)
SENTRY_DSN=YOUR_SENTRY_DSN

# API
API_URL=https://api.workshelf.dev
FRONTEND_URL=https://workshelf.dev

# Security
SECRET_KEY=YOUR_LONG_RANDOM_SECRET_KEY
CORS_ORIGINS=["https://workshelf.dev","https://api.workshelf.dev","https://keycloak.workshelf.dev"]

# Java Options for Keycloak (reduce memory)
JAVA_OPTS_APPEND=-XX:MaxRAMPercentage=50
```

**Generate SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Phase 4: Azure Blob Storage Setup (20 minutes)

### Step 4.1: Create Storage Account

```bash
# From your local machine (with Azure CLI)
az storage account create \
  --name workshelfstorage \
  --resource-group workshelf-production \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2

# Create container for uploads
az storage container create \
  --name workshelf-uploads \
  --account-name workshelfstorage \
  --public-access off

# Get connection string
az storage account show-connection-string \
  --name workshelfstorage \
  --resource-group workshelf-production \
  --output tsv
```

**Copy the connection string** and add it to your `.env` file:
```bash
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."
```

### Step 4.2: Enable Defender for Storage

```bash
# Enable Microsoft Defender for Storage (malware scanning)
az security pricing create \
  --name StorageAccounts \
  --tier Standard

# Enable malware scanning for the storage account
az storage account update \
  --name workshelfstorage \
  --resource-group workshelf-production \
  --enable-files-aadds false

# Configure Defender settings
az security setting create \
  --name MCAS \
  --kind DataExportSettings \
  --enabled true
```

---

## Phase 5: Update Backend for Azure Blob Storage (15 minutes)

### Step 5.1: Update Backend Dependencies

On Azure VM:

```bash
cd /home/azureuser/workshelf/backend

# Add Azure SDK to requirements.txt if not present
echo "azure-storage-blob==12.19.0" >> requirements.txt
```

### Step 5.2: Create Azure Storage Service

Create `backend/app/services/azure_storage_service.py`:

```python
import os
import logging
from typing import Optional
from azure.storage.blob import BlobServiceClient, ContentSettings
from app.core.config import settings

logger = logging.getLogger(__name__)

class AzureStorageService:
    def __init__(self):
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        if not connection_string:
            logger.warning("Azure Storage connection string not configured")
            self.client = None
            return
        
        self.client = BlobServiceClient.from_connection_string(connection_string)
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "workshelf-uploads")
        logger.info(f"Azure Storage initialized: {self.container_name}")
    
    async def upload_file(
        self,
        file_data: bytes,
        blob_name: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """Upload file to Azure Blob Storage"""
        if not self.client:
            raise Exception("Azure Storage not configured")
        
        blob_client = self.client.get_blob_client(
            container=self.container_name,
            blob=blob_name
        )
        
        content_settings = ContentSettings(content_type=content_type)
        
        blob_client.upload_blob(
            file_data,
            overwrite=True,
            content_settings=content_settings
        )
        
        return blob_client.url
    
    async def get_file_url(self, blob_name: str) -> str:
        """Get URL for accessing a blob"""
        if not self.client:
            raise Exception("Azure Storage not configured")
        
        blob_client = self.client.get_blob_client(
            container=self.container_name,
            blob=blob_name
        )
        
        return blob_client.url
    
    async def delete_file(self, blob_name: str) -> bool:
        """Delete file from Azure Blob Storage"""
        if not self.client:
            raise Exception("Azure Storage not configured")
        
        try:
            blob_client = self.client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            blob_client.delete_blob()
            return True
        except Exception as e:
            logger.error(f"Failed to delete blob {blob_name}: {e}")
            return False

# Global instance
azure_storage = AzureStorageService()
```

**We'll update the actual backend code after deployment to use this.**

---

## Phase 6: Deploy Docker Containers (30 minutes)

### Step 6.1: Build and Start Containers

```bash
cd /home/azureuser/workshelf/deploy

# Build images
docker-compose -f docker-compose.prod.yml build

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=50
```

### Step 6.2: Verify Services

```bash
# Test backend
curl http://localhost:8000/health

# Test frontend
curl http://localhost:5173/

# Test Keycloak
curl http://localhost:8080/

# Check all containers
docker ps
```

---

## Phase 7: Configure Nginx and SSL (30 minutes)

### Step 7.1: Update DNS FIRST

Before getting SSL certificates, update your DNS:

**In your domain registrar (Namecheap/Cloudflare/etc):**
- Update A record for `workshelf.dev` → `<YOUR_AZURE_IP>`
- Update A record for `api.workshelf.dev` → `<YOUR_AZURE_IP>`
- Update A record for `keycloak.workshelf.dev` → `<YOUR_AZURE_IP>`

**Wait 5-10 minutes for DNS propagation**, then verify:
```bash
nslookup workshelf.dev
nslookup api.workshelf.dev
nslookup keycloak.workshelf.dev
```

### Step 7.2: Get SSL Certificates

```bash
# Stop nginx temporarily
sudo systemctl stop nginx

# Get certificates for all domains
sudo certbot certonly --standalone \
  -d workshelf.dev \
  -d api.workshelf.dev \
  -d keycloak.workshelf.dev \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --non-interactive

# Start nginx
sudo systemctl start nginx
```

### Step 7.3: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/workshelf
```

**Paste this configuration:**

```nginx
# Frontend - workshelf.dev
server {
    listen 80;
    server_name workshelf.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workshelf.dev;
    
    ssl_certificate /etc/letsencrypt/live/workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workshelf.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API - api.workshelf.dev
server {
    listen 80;
    server_name api.workshelf.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.workshelf.dev;
    
    ssl_certificate /etc/letsencrypt/live/api.workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.workshelf.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# Keycloak - keycloak.workshelf.dev
server {
    listen 80;
    server_name keycloak.workshelf.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name keycloak.workshelf.dev;
    
    ssl_certificate /etc/letsencrypt/live/keycloak.workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/keycloak.workshelf.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffer_size 128k;
        proxy_buffers 8 256k;
        proxy_busy_buffers_size 512k;
    }
}
```

### Step 7.4: Enable and Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/workshelf /etc/nginx/sites-enabled/

# Remove default
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Phase 8: Testing (30 minutes)

### Step 8.1: Basic Health Checks

```bash
# Test HTTPS endpoints
curl -I https://workshelf.dev
curl -I https://api.workshelf.dev
curl -I https://keycloak.workshelf.dev

# Should all return 200 or 302
```

### Step 8.2: Test Login Flow

1. Open browser: https://workshelf.dev
2. Click "Login"
3. Should redirect to Keycloak
4. Login with existing account
5. Should redirect back to app

### Step 8.3: Test File Upload

1. Try uploading a test document
2. Check Azure Blob Storage:

```bash
az storage blob list \
  --account-name workshelfstorage \
  --container-name workshelf-uploads \
  --output table
```

---

## Phase 9: Monitoring Setup (15 minutes)

### Step 9.1: Set Up Azure Monitor Alerts

```bash
# Create action group for email alerts
az monitor action-group create \
  --name workshelf-alerts \
  --resource-group workshelf-production \
  --short-name wsalerts \
  --email-receiver name="Admin" address="YOUR_EMAIL@example.com"

# Alert for high CPU (>80%)
az monitor metrics alert create \
  --name workshelf-high-cpu \
  --resource-group workshelf-production \
  --scopes /subscriptions/YOUR_SUB_ID/resourceGroups/workshelf-production/providers/Microsoft.Compute/virtualMachines/workshelf-vm \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action workshelf-alerts

# Alert for high memory (>90%)
az monitor metrics alert create \
  --name workshelf-high-memory \
  --resource-group workshelf-production \
  --scopes /subscriptions/YOUR_SUB_ID/resourceGroups/workshelf-production/providers/Microsoft.Compute/virtualMachines/workshelf-vm \
  --condition "avg Available Memory Bytes < 1610612736" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action workshelf-alerts
```

---

## Phase 10: Cleanup AWS (After confirming Azure works)

**Wait 1 week to ensure Azure is stable**, then:

```bash
# Stop AWS EC2 instance
aws ec2 stop-instances --instance-ids i-00d113ad6dd246b7a

# Wait another week, then terminate
aws ec2 terminate-instances --instance-ids i-00d113ad6dd246b7a
```

---

## 🎉 Success Checklist

- [ ] Azure VM running with 16GB RAM
- [ ] All Docker containers running
- [ ] HTTPS working for all domains
- [ ] Login flow working
- [ ] File uploads working to Azure Blob Storage
- [ ] Defender scanning uploads for malware
- [ ] Database connected (Neon)
- [ ] Email alerts configured
- [ ] AWS instance stopped (after 1 week of stability)

---

## 📊 Monthly Costs (After Credits Run Out)

| Service | Cost | Notes |
|---------|------|-------|
| Standard_B2ms VM | $60 | 16GB RAM |
| Blob Storage | $2-5 | Pay per GB stored |
| Defender for Storage | $10-15 | Malware scanning |
| Bandwidth | $0-10 | First 100GB free |
| **Total** | **$72-90/month** | vs. $30-60 on AWS |

**But you have $1000 credits = 12-14 months FREE!**

---

## 🆘 Troubleshooting

### Containers won't start
```bash
docker-compose -f docker-compose.prod.yml logs
docker-compose -f docker-compose.prod.yml restart
```

### SSL certificate issues
```bash
sudo certbot renew --dry-run
sudo systemctl reload nginx
```

### Out of memory
```bash
free -h
docker stats
# If needed, restart hungry containers
```

### Can't connect to database
```bash
# Test from VM
docker-compose -f docker-compose.prod.yml exec backend python -c "
from app.core.database import engine
import asyncio
asyncio.run(engine.connect())
print('Connected!')
"
```

---

## 🎓 Next Steps After Deployment

1. Set up automated backups
2. Configure CDN (Azure CDN) for faster global access
3. Set up staging environment (smaller VM)
4. Implement CI/CD with GitHub Actions → Azure
5. Add application monitoring (Application Insights)

