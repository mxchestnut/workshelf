#!/bin/bash
# AWS EC2 Deployment Script for WorkShelf
# This script sets up a complete WorkShelf instance on EC2

set -e

echo "🚀 WorkShelf AWS EC2 Deployment"
echo "================================"
echo ""

# Configuration
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.small}"  # 2 vCPU, 2GB RAM - ~$15/month
REGION="${AWS_REGION:-us-east-1}"
KEY_NAME="${KEY_NAME:-workshelf-key}"
SECURITY_GROUP_NAME="workshelf-sg"
INSTANCE_NAME="workshelf-prod"

# Domain configuration (optional)
DOMAIN="${DOMAIN:-}"  # Set to your domain if you have one

echo "📋 Configuration:"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   Region: $REGION"
echo "   Key Name: $KEY_NAME"
echo "   Domain: ${DOMAIN:-None (will use EC2 public IP)}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   brew install awscli"
    exit 1
fi

# Check if credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI configured"
echo ""

# Create or verify key pair
echo "🔑 Setting up SSH key pair..."
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &> /dev/null; then
    echo "✅ Key pair '$KEY_NAME' already exists"
else
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --region "$REGION" \
        --query 'KeyMaterial' \
        --output text > ~/.ssh/"$KEY_NAME".pem
    chmod 400 ~/.ssh/"$KEY_NAME".pem
    echo "✅ Created new key pair: ~/.ssh/$KEY_NAME.pem"
fi
echo ""

# Create security group
echo "🔒 Setting up security group..."
VPC_ID=$(aws ec2 describe-vpcs --region "$REGION" --filters "Name=isDefault,Values=true" --query 'Vpcs[0].VpcId' --output text)

if aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$REGION" &> /dev/null 2>&1; then
    SG_ID=$(aws ec2 describe-security-groups --group-names "$SECURITY_GROUP_NAME" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)
    echo "✅ Security group '$SECURITY_GROUP_NAME' already exists: $SG_ID"
else
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "WorkShelf application security group" \
        --vpc-id "$VPC_ID" \
        --region "$REGION" \
        --query 'GroupId' \
        --output text)
    
    # Add rules
    aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$SG_ID" --protocol tcp --port 8080 --cidr 0.0.0.0/0  # Keycloak
    
    echo "✅ Created security group: $SG_ID"
fi
echo ""

# Get latest Ubuntu 22.04 LTS ARM64 AMI
echo "🔍 Finding latest Ubuntu 22.04 LTS AMI..."
AMI_ID=$(aws ec2 describe-images \
    --region "$REGION" \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*" \
              "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)
echo "✅ Using AMI: $AMI_ID"
echo ""

# Create user data script
echo "📝 Generating user data script..."
cat > /tmp/workshelf-userdata.sh << 'USERDATA'
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install other tools
apt-get install -y git jq nginx certbot python3-certbot-nginx

# Clone repository
cd /opt
git clone https://github.com/mxchestnut/workshelf.git
cd workshelf/work-shelf

# Generate secure secrets
export SECRET_KEY=$(openssl rand -hex 32)
export KEYCLOAK_CLIENT_SECRET=$(openssl rand -hex 32)
export MATRIX_ADMIN_TOKEN=$(openssl rand -hex 32)
export MINIO_ACCESS_KEY=$(openssl rand -hex 16)
export MINIO_SECRET_KEY=$(openssl rand -hex 32)

# Get instance metadata
export PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
export DOMAIN="${DOMAIN:-$PUBLIC_IP}"

# Create production .env file
cat > .env << EOF
# WorkShelf Production Environment
DATABASE_URL=postgresql+asyncpg://workshelf:${SECRET_KEY:0:20}@postgres:5432/workshelf
SECRET_KEY=$SECRET_KEY

# Keycloak
KEYCLOAK_SERVER_URL=http://$DOMAIN:8080
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-api
KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET

# Matrix
MATRIX_HOMESERVER=http://synapse:8008
MATRIX_ADMIN_TOKEN=$MATRIX_ADMIN_TOKEN

# Redis
REDIS_URL=redis://redis:6379

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_BUCKET=workshelf
MINIO_SECURE=false

# Frontend
VITE_API_URL=http://$DOMAIN:8000
VITE_KEYCLOAK_URL=http://$DOMAIN:8080
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_MATRIX_HOMESERVER=http://$DOMAIN:8008
EOF

# Update PostgreSQL password in docker-compose
sed -i "s/workshelf_password/${SECRET_KEY:0:20}/g" docker-compose.yml

# Start services
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Configure Keycloak
docker-compose exec -T keycloak /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://localhost:8080 --realm master --user admin --password admin

docker-compose exec -T keycloak /opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE

# Setup Keycloak realm and clients
cd /opt/workshelf/work-shelf
chmod +x setup-keycloak-local.sh
./setup-keycloak-local.sh || true

# Setup Nginx reverse proxy
cat > /etc/nginx/sites-available/workshelf << 'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Keycloak
    location /auth/ {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/workshelf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "✅ WorkShelf deployment complete!"
echo "Access your instance at: http://$PUBLIC_IP"
USERDATA

echo "✅ User data script generated"
echo ""

# Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --region "$REGION" \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data file:///tmp/workshelf-userdata.sh \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --block-device-mappings "DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo ""

# Wait for instance to be running
echo "⏳ Waiting for instance to start..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
echo "✅ Instance is running"
echo ""

# Get instance details
PUBLIC_IP=$(aws ec2 describe-instances \
    --region "$REGION" \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "✨ Deployment initiated successfully!"
echo "================================"
echo ""
echo "📋 Instance Details:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   SSH: ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo "⏳ The instance is now installing Docker and deploying WorkShelf."
echo "   This will take approximately 5-10 minutes."
echo ""
echo "🔍 Monitor progress:"
echo "   ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP 'tail -f /var/log/cloud-init-output.log'"
echo ""
echo "🌐 Once complete, access your app at:"
echo "   http://$PUBLIC_IP"
echo ""
echo "🔐 Default credentials:"
echo "   Username: testuser"
echo "   Password: test123"
echo ""

# Save instance info
cat > instance-info.txt << EOF
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Region: $REGION
Key Name: $KEY_NAME
SSH Command: ssh -i ~/.ssh/$KEY_NAME.pem ubuntu@$PUBLIC_IP

URLs:
  Frontend: http://$PUBLIC_IP
  Backend API: http://$PUBLIC_IP/api
  Keycloak: http://$PUBLIC_IP/auth

Credentials:
  Test User: testuser / test123
  Keycloak Admin: admin / admin

To stop instance: aws ec2 stop-instances --region $REGION --instance-ids $INSTANCE_ID
To start instance: aws ec2 start-instances --region $REGION --instance-ids $INSTANCE_ID
To terminate: aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_ID
EOF

echo "💾 Instance info saved to: instance-info.txt"
