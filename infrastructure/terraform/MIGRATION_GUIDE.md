# AWS Migration Guide - WorkShelf

## Overview
This guide walks through migrating WorkShelf from Azure to AWS with a focus on **free tier optimization** and scalability.

## Architecture

### Current (Azure)
- **Frontend**: Azure Container Apps
- **Backend**: Azure Container Apps
- **Database**: Neon PostgreSQL (Azure region)
- **Container Registry**: Azure ACR
- **Auth**: Keycloak on Azure Container Apps
- **Email**: AWS SES ✅

### Target (AWS)
- **Frontend**: S3 + CloudFront (Free: 50GB transfer, 2M requests/month)
- **Backend**: ECS Fargate Spot (Free: 20GB storage, limited compute)
- **Database**: RDS PostgreSQL (Free: db.t3.micro, 20GB storage, 750 hours/month)
- **Container Registry**: ECR (Free: 500MB storage)
- **Auth**: Keycloak on ECS Fargate
- **Load Balancer**: Application Load Balancer (~$16/month)
- **NAT Gateway**: ~$32/month (or use public subnets for free tier)
- **Email**: AWS SES (Free: 62,000 emails/month from EC2/ECS)
- **Secrets**: AWS Secrets Manager (Free: 30-day rotation, $0.40/secret/month)

## Cost Estimate (Free Tier)

**Free (First 12 months):**
- RDS db.t3.micro: 750 hours/month
- S3 + CloudFront: 50GB transfer
- ECR: 500MB storage
- ECS Fargate: 20GB-months storage
- SES: 62,000 emails

**Ongoing Costs:**
- ALB: ~$16/month (unavoidable)
- NAT Gateway: ~$32/month (can avoid with public subnets)
- RDS backup storage: ~$0.50/month
- Secrets Manager: ~$2/month (5 secrets)
- Data transfer: ~$1-5/month

**Total: ~$20-55/month** (vs Azure ~$50-100/month)

## Prerequisites

1. **AWS Account** with billing enabled
2. **AWS CLI** configured with credentials
3. **Terraform** installed (v1.0+)
4. **Domain DNS access** (for SSL certificates)
5. **Existing secrets** from Azure

## Step-by-Step Migration

### Phase 1: Infrastructure Setup (Terraform)

1. **Create terraform.tfvars**:
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

2. **Edit terraform.tfvars**:
```hcl
aws_region  = "us-east-1"
environment = "production"
domain_name = "workshelf.dev"

db_name     = "workshelf"
db_username = "workshelf_admin"
db_password = "YOUR_SECURE_PASSWORD_HERE"  # Generate a strong password

keycloak_admin_password = "YOUR_KEYCLOAK_PASSWORD"  # From Azure
```

3. **Initialize Terraform**:
```bash
terraform init
```

4. **Plan deployment**:
```bash
terraform plan
```

5. **Deploy infrastructure** (takes ~15 minutes):
```bash
terraform apply
```

6. **Save outputs**:
```bash
terraform output -json > outputs.json
```

### Phase 2: SSL Certificate Validation

After `terraform apply`, you'll get DNS records for SSL certificate validation:

```bash
terraform output acm_validation_records
```

**Add these records to your DNS provider** (Namecheap, Cloudflare, etc.):

Example:
```
Type: CNAME
Name: _abc123def456.workshelf.dev
Value: _xyz789.acm-validations.aws.
```

Wait 5-15 minutes for validation to complete.

### Phase 3: Database Migration

1. **Export from Neon PostgreSQL**:
```bash
pg_dump "postgresql://neondb_owner:PASSWORD@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb" > workshelf_backup.sql
```

2. **Get RDS endpoint**:
```bash
terraform output rds_endpoint
```

3. **Import to RDS**:
```bash
psql "postgresql://workshelf_admin:PASSWORD@<RDS_ENDPOINT>/workshelf" < workshelf_backup.sql
```

4. **Verify migration**:
```bash
psql "postgresql://workshelf_admin:PASSWORD@<RDS_ENDPOINT>/workshelf" -c "SELECT COUNT(*) FROM users;"
```

### Phase 4: Container Images

1. **Login to ECR**:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
```

2. **Build and push backend**:
```bash
cd backend
docker build -t workshelf-backend .
docker tag workshelf-backend:latest <ECR_BACKEND_URL>:latest
docker push <ECR_BACKEND_URL>:latest
```

3. **Build and push frontend**:
```bash
cd frontend
docker build --build-arg VITE_API_URL=https://api.workshelf.dev \
             --build-arg VITE_KEYCLOAK_URL=https://auth.workshelf.dev \
             -t workshelf-frontend .
docker tag workshelf-frontend:latest <ECR_FRONTEND_URL>:latest
docker push <ECR_FRONTEND_URL>:latest
```

4. **Build and push Keycloak**:
```bash
# Use official Keycloak image or custom build
docker pull quay.io/keycloak/keycloak:latest
docker tag quay.io/keycloak/keycloak:latest <ECR_KEYCLOAK_URL>:latest
docker push <ECR_KEYCLOAK_URL>:latest
```

### Phase 5: Secrets Configuration

Set all secrets in AWS Secrets Manager:

```bash
# Backend secret key
aws secretsmanager put-secret-value \
  --secret-id workshelf/secret-key \
  --secret-string "YOUR_SECRET_KEY"

# Anthropic API key
aws secretsmanager put-secret-value \
  --secret-id workshelf/anthropic-api-key \
  --secret-string "YOUR_ANTHROPIC_KEY"

# Stripe keys
aws secretsmanager put-secret-value \
  --secret-id workshelf/stripe-secret-key \
  --secret-string "YOUR_STRIPE_SECRET"

aws secretsmanager put-secret-value \
  --secret-id workshelf/stripe-publishable-key \
  --secret-string "YOUR_STRIPE_PUBLISHABLE"

# Keycloak client secret
aws secretsmanager put-secret-value \
  --secret-id workshelf/keycloak-client-secret \
  --secret-string "YOUR_KEYCLOAK_SECRET"
```

### Phase 6: Deploy Services

1. **Update ECS services** (forces new deployment):
```bash
aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment
aws ecs update-service --cluster workshelf-cluster --service workshelf-keycloak --force-new-deployment
```

2. **Wait for services to be healthy**:
```bash
aws ecs wait services-stable --cluster workshelf-cluster --services workshelf-backend workshelf-keycloak
```

3. **Check logs**:
```bash
aws logs tail /ecs/workshelf/backend --follow
aws logs tail /ecs/workshelf/keycloak --follow
```

### Phase 7: Frontend Deployment

1. **Build frontend**:
```bash
cd frontend
npm install
npm run build
```

2. **Upload to S3**:
```bash
aws s3 sync dist/ s3://workshelf-frontend/ --delete
```

3. **Invalidate CloudFront cache**:
```bash
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Phase 8: DNS Configuration

Get DNS configuration:
```bash
terraform output dns_configuration
```

**Add these records to your DNS provider**:

```
Type: CNAME
Name: workshelf.dev (or @ for root)
Value: d111111abcdef8.cloudfront.net

Type: CNAME
Name: www
Value: d111111abcdef8.cloudfront.net

Type: CNAME
Name: api
Value: workshelf-alb-1234567890.us-east-1.elb.amazonaws.com

Type: CNAME
Name: auth
Value: workshelf-alb-1234567890.us-east-1.elb.amazonaws.com
```

### Phase 9: Testing

1. **Test API**:
```bash
curl https://api.workshelf.dev/health
```

2. **Test Keycloak**:
```bash
curl https://auth.workshelf.dev/health
```

3. **Test Frontend**:
```bash
curl https://workshelf.dev
```

4. **Full integration test**:
- Visit https://workshelf.dev
- Register new account
- Login
- Create document
- Send invitation email

### Phase 10: Update CI/CD

Update `.github/workflows/deploy.yml` to deploy to AWS instead of Azure (see separate guide).

## Free Tier Optimization Tips

### 1. **Avoid NAT Gateway ($32/month)**
Edit `vpc.tf` and comment out NAT Gateway. Use public subnets for ECS:

```hcl
# In ecs.tf, change:
subnets          = aws_subnet.private[*].id
assign_public_ip = false

# To:
subnets          = aws_subnet.public[*].id
assign_public_ip = true
```

### 2. **Use Fargate Spot (70% cheaper)**
```hcl
capacity_provider_strategy {
  capacity_provider = "FARGATE_SPOT"
  weight            = 1
}
```

### 3. **Reduce RDS Backup Retention**
```hcl
backup_retention_period = 1  # Minimum for free tier
```

### 4. **Use CloudWatch Logs Sparingly**
```hcl
retention_in_days = 1  # Or 3 days max
```

### 5. **Enable S3 Intelligent Tiering**
For user uploads, use S3 Intelligent-Tiering to save costs.

## Rollback Plan

If migration fails:

1. **Keep Azure infrastructure running** during migration
2. **DNS TTL**: Set to 300 seconds (5 minutes) before migration
3. **Rollback**: Point DNS back to Azure
4. **Cleanup**: Run `terraform destroy` if needed

## Post-Migration Cleanup

After successful migration (wait 1 week):

1. **Delete Azure resources**:
   - Container Apps
   - Container Registry
   - Resource Groups

2. **Cancel Neon subscription** (or keep as backup)

3. **Update documentation** with new AWS URLs

## Monitoring

Set up CloudWatch alarms:

```bash
# RDS CPU alarm
aws cloudwatch put-metric-alarm --alarm-name workshelf-rds-cpu \
  --alarm-description "RDS CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold

# ALB 5XX errors
aws cloudwatch put-metric-alarm --alarm-name workshelf-alb-5xx \
  --alarm-description "ALB 5XX errors" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Support

- **AWS Support**: Basic (free) or Developer ($29/month)
- **Documentation**: https://docs.aws.amazon.com/
- **Terraform**: https://registry.terraform.io/providers/hashicorp/aws/

## Estimated Timeline

- Infrastructure setup: 30 minutes
- SSL validation: 15 minutes
- Database migration: 1-2 hours
- Container builds: 30 minutes
- DNS propagation: 1-24 hours
- Testing: 1-2 hours

**Total: 4-6 hours** (excluding DNS propagation)
