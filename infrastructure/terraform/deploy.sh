#!/bin/bash
# AWS Migration Deployment Script
# This script deploys the infrastructure and will take ~15-20 minutes

cd "/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/terraform"

echo "🚀 Starting AWS infrastructure deployment..."
echo "📝 Logging to terraform-deploy.log"
echo "⏱️  This will take approximately 15-20 minutes..."
echo ""
echo "Main resource creation times:"
echo "  - RDS PostgreSQL: ~10-15 minutes"
echo "  - CloudFront CDN: ~5-10 minutes"
echo "  - ALB + ECS: ~3-5 minutes"
echo ""

terraform apply -auto-approve 2>&1 | tee terraform-deploy.log

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "📊 Outputs:"
    terraform output
else
    echo ""
    echo "❌ DEPLOYMENT FAILED - Check terraform-deploy.log for details"
    exit 1
fi
