#!/bin/bash
# Deploy Matrix Synapse server to AWS
# Cost-optimized setup using existing infrastructure

set -e

echo "🚀 Deploying Matrix Server to AWS"
echo "=================================="
echo ""

# Navigate to terraform directory
cd "$(dirname "$0")/../infrastructure/terraform"

echo "📋 Matrix Server Configuration:"
echo "  • Fargate CPU: 0.5 vCPU (~$7/month)"
echo "  • Fargate Memory: 1GB (~included)"
echo "  • RDS PostgreSQL: db.t4g.micro (~$15/month)"
echo "  • EFS Storage: ~$3/month for 10GB"
echo "  • ALB: Shared with existing services"
echo ""
echo "💰 Total Additional Cost: ~$25/month"
echo ""

# Check if terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "⚠️  Terraform not initialized. Running init..."
    terraform init
fi

# Validate configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Plan the changes
echo ""
echo "📊 Planning Matrix infrastructure changes..."
terraform plan -target=aws_db_instance.matrix \
               -target=aws_ecs_task_definition.matrix \
               -target=aws_ecs_service.matrix \
               -target=aws_efs_file_system.matrix \
               -out=matrix-plan.tfplan

echo ""
echo "⚠️  Review the plan above. This will create:"
echo "  • RDS PostgreSQL database (db.t4g.micro)"
echo "  • ECS Fargate service for Matrix Synapse"
echo "  • EFS file system for persistent data"
echo "  • Security groups and networking"
echo "  • Secrets in AWS Secrets Manager"
echo ""

read -p "Continue with deployment? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Deployment cancelled."
    rm -f matrix-plan.tfplan
    exit 0
fi

# Apply the changes
echo ""
echo "🚀 Deploying Matrix infrastructure..."
terraform apply matrix-plan.tfplan

rm -f matrix-plan.tfplan

echo ""
echo "✅ Matrix server deployed successfully!"
echo ""

# Get outputs
MATRIX_URL=$(terraform output -raw matrix_homeserver_url)
MATRIX_DB=$(terraform output -raw matrix_db_endpoint)
MATRIX_SECRET_ARN=$(terraform output -raw matrix_shared_secret_arn)

echo "📋 Matrix Server Details:"
echo "  • Homeserver URL: $MATRIX_URL"
echo "  • Database: $MATRIX_DB"
echo "  • Shared Secret ARN: $MATRIX_SECRET_ARN"
echo ""

# Get the shared secret value
echo "🔐 Retrieving Matrix shared secret..."
SHARED_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "$MATRIX_SECRET_ARN" \
    --query SecretString \
    --output text)

echo ""
echo "=============================================="
echo "✅ Matrix Deployment Complete!"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add DNS Record:"
echo "   Type: CNAME"
echo "   Name: matrix"
echo "   Value: [Your ALB DNS name]"
echo "   (Get from: terraform output alb_dns_name)"
echo ""
echo "2. Update Backend .env:"
echo "   MATRIX_HOMESERVER=$MATRIX_URL"
echo "   MATRIX_REGISTRATION_SHARED_SECRET=$SHARED_SECRET"
echo ""
echo "3. Run Database Migration:"
echo "   cd backend"
echo "   alembic upgrade head"
echo ""
echo "4. Test Matrix Server:"
echo "   curl $MATRIX_URL/_matrix/client/versions"
echo ""
echo "💰 Monthly Cost: ~$25"
echo "   • RDS db.t4g.micro: ~$15"
echo "   • Fargate (0.5 vCPU, 1GB): ~$7"
echo "   • EFS (~10GB): ~$3"
echo ""
echo "🔐 Secrets stored in AWS Secrets Manager"
echo "📊 Monitor: AWS CloudWatch > /ecs/work-shelf-matrix"
echo ""
