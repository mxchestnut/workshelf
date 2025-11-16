# AWS Migration Progress - WorkShelf
**Date:** November 13, 2025
**Status:** Infrastructure deployment in progress

---

## ✅ COMPLETED STEPS

### 1. Infrastructure as Code Created
✅ **Complete Terraform configuration** for free-tier optimized AWS infrastructure:
- `main.tf` - Provider configuration
- `variables.tf` - All variables with defaults
- `vpc.tf` - VPC, subnets, routing (NAT Gateway disabled for free tier)
- `rds.tf` - PostgreSQL database (db.t3.micro free tier)
- `ecr.tf` - Container registries for backend, frontend, Keycloak
- `ecs.tf` - ECS cluster, task definitions, services
- `alb.tf` - Application Load Balancer
- `s3-cloudfront.tf` - S3 bucket + CloudFront CDN
- `acm.tf` - SSL certificates
- `secrets.tf` - AWS Secrets Manager
- `outputs.tf` - All infrastructure outputs

### 2. Free Tier Optimization
✅ **Cost savings implemented:**
- ❌ Removed NAT Gateway (saves ~$32/month)
- ✅ Using ECS on public subnets with public IPs
- ✅ RDS db.t3.micro (750 hours/month free)
- ✅ S3 + CloudFront (50GB transfer/month free)
- ✅ CloudWatch logs (7-day retention)

**Estimated monthly cost:** $18-22/month (vs Azure $50-100/month)

### 3. Terraform Initialized
✅ Terraform v1.5.7 installed
✅ AWS provider v5.100.0 configured
✅ `terraform.tfvars` created with secure passwords

### 4. Resources Being Created
The following resources are being deployed (14 new resources):

**Network & Security:**
- ✅ VPC (10.0.0.0/16)
- ✅ 2 Public Subnets
- ✅ 2 Private Subnets (for RDS only)
- ✅ Internet Gateway
- ✅ Route Tables
- ✅ Security Groups (ALB, ECS, RDS)

**Compute:**
- ⏳ RDS PostgreSQL (db.t3.micro, 20GB) - **IN PROGRESS (~10-15 min)**
- ⏳ ECS Cluster
- ⏳ ECS Task Definitions (backend, Keycloak)
- ⏳ ECS Services (pending ALB)

**Storage & CDN:**
- ✅ S3 Bucket (`workshelf-frontend`)
- ⏳ CloudFront Distribution - **IN PROGRESS (~5-10 min)**
- ✅ ECR Repositories (backend, frontend, Keycloak)

**Load Balancing:**
- ⏳ Application Load Balancer
- ⏳ Target Groups (backend, Keycloak)
- ⏳ HTTPS Listener
- ⏳ Listener Rules

**Secrets & Config:**
- ✅ 7 Secrets Manager secrets created
- ✅ IAM roles and policies
- ✅ CloudWatch log groups
- ✅ ACM SSL certificate (pending DNS validation)

---

## 🚧 NEXT STEPS

### Step 1: Complete Infrastructure Deployment
**ACTION REQUIRED:** Run the deployment script
```bash
cd "/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/terraform"
./deploy.sh
```

**Time:** 15-20 minutes
**What it creates:** RDS database, ALB, CloudFront, ECS services

### Step 2: SSL Certificate DNS Validation
After deployment completes, you'll need to add DNS records:

```bash
terraform output acm_validation_records
```

**Example records to add to your DNS provider:**
```
Type: CNAME
Name: _abc123def456.workshelf.dev
Value: _xyz789.acm-validations.aws.
```

⏱️ **Wait 5-15 minutes** for validation after adding DNS records.

### Step 3: Populate Secrets Manager
Set all application secrets:

```bash
# Backend secret key
aws secretsmanager put-secret-value \
  --secret-id workshelf/secret-key \
  --secret-string "YOUR_SECRET_KEY_FROM_AZURE"

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

### Step 4: Migrate Database
**Export from Neon:**
```bash
pg_dump "postgresql://neondb_owner:YOUR_PASSWORD@ep-weathered-tree-a81zzcnl-pooler.eastus2.azure.neon.tech/neondb" > workshelf_backup.sql
```

**Get RDS endpoint:**
```bash
terraform output rds_endpoint
```

**Import to RDS:**
```bash
psql "postgresql://workshelf_admin:PASSWORD@<RDS_ENDPOINT>/workshelf" < workshelf_backup.sql
```

### Step 5: Build and Push Docker Images
**Login to ECR:**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_backend_url | cut -d'/' -f1)
```

**Build & push backend:**
```bash
cd backend
docker build -t workshelf-backend .
docker tag workshelf-backend:latest $(terraform output -raw ecr_backend_url):latest
docker push $(terraform output -raw ecr_backend_url):latest
```

**Build & push Keycloak:**
```bash
# Pull official Keycloak
docker pull quay.io/keycloak/keycloak:latest
docker tag quay.io/keycloak/keycloak:latest $(terraform output -raw ecr_keycloak_url):latest
docker push $(terraform output -raw ecr_keycloak_url):latest
```

### Step 6: Deploy ECS Services
```bash
aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment
aws ecs update-service --cluster workshelf-cluster --service workshelf-keycloak --force-new-deployment
```

### Step 7: Build and Deploy Frontend
**Build frontend:**
```bash
cd frontend
npm install
npm run build
```

**Upload to S3:**
```bash
aws s3 sync dist/ s3://$(terraform output -raw s3_bucket_name)/ --delete
```

**Invalidate CloudFront:**
```bash
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

### Step 8: Configure DNS
Add these records to your DNS provider (from `terraform output dns_configuration`):

```
Type: CNAME or ALIAS
Name: workshelf.dev
Value: <CloudFront domain>

Type: CNAME
Name: www
Value: <CloudFront domain>

Type: CNAME
Name: api
Value: <ALB DNS name>

Type: CNAME
Name: auth
Value: <ALB DNS name>
```

### Step 9: Test Everything
```bash
# Test API
curl https://api.workshelf.dev/health

# Test Keycloak
curl https://auth.workshelf.dev/health

# Test Frontend
curl https://workshelf.dev
```

---

##  📊 INFRASTRUCTURE OVERVIEW

### Network Architecture
```
Internet
    │
    ├─> CloudFront (Frontend CDN)
    │       └─> S3 Bucket (Static Files)
    │
    └─> Application Load Balancer
            │
            ├─> api.workshelf.dev → ECS Backend (Public Subnet)
            │                          └─> RDS PostgreSQL (Private Subnet)
            │
            └─> auth.workshelf.dev → ECS Keycloak (Public Subnet)
                                          └─> RDS PostgreSQL (Private Subnet)
```

### Resource Summary
- **VPC:** 1 (10.0.0.0/16)
- **Subnets:** 4 (2 public, 2 private)
- **Security Groups:** 3 (ALB, ECS, RDS)
- **RDS:** 1 PostgreSQL db.t3.micro
- **ECR Repositories:** 3
- **ECS Cluster:** 1
- **ECS Services:** 2 (backend, Keycloak)
- **ALB:** 1 with 2 target groups
- **S3 Buckets:** 1
- **CloudFront Distributions:** 1
- **Secrets:** 7
- **SSL Certificates:** 1

### Cost Breakdown (Monthly)
| Service | Cost | Free Tier |
|---------|------|-----------|
| RDS db.t3.micro | $0-15 | 750 hrs/mo free (Year 1) |
| ALB | $16 | No free tier |
| S3 + CloudFront | $0-2 | 50GB/mo free |
| ECR | $0-1 | 500MB free |
| Secrets Manager | $3 | No free tier |
| Data Transfer | $1-3 | 100GB/mo free |
| **TOTAL** | **$20-40/mo** | **$50-70 savings vs Azure** |

---

## 🔒 SECURITY

### Secrets Management
✅ All secrets stored in AWS Secrets Manager
✅ Database password auto-generated (64 characters)
✅ Keycloak admin password preserved from Azure

### Network Security
✅ RDS in private subnets (no internet access)
✅ ECS tasks in public subnets (need internet for pulling images)
✅ Security groups restrict traffic to necessary ports
✅ SSL/TLS encryption via ACM certificates

### Best Practices
✅ Deletion protection enabled on RDS
✅ Encrypted RDS storage
✅ CloudWatch logging enabled
✅ IAM roles with least-privilege access

---

## 📝 FILES CREATED

### Terraform Configuration
```
infrastructure/terraform/
├── main.tf                    # Provider configuration
├── variables.tf               # Variable definitions
├── terraform.tfvars           # Actual values (⚠️ DO NOT COMMIT)
├── terraform.tfvars.example   # Example template
├── .gitignore                 # Ignore secrets
├── vpc.tf                     # Network infrastructure
├── rds.tf                     # PostgreSQL database
├── ecr.tf                     # Container registries
├── ecs.tf                     # ECS cluster & services
├── alb.tf                     # Load balancer
├── s3-cloudfront.tf           # Frontend hosting
├── acm.tf                     # SSL certificates
├── secrets.tf                 # Secrets Manager
├── outputs.tf                 # Infrastructure outputs
├── deploy.sh                  # Deployment script
└── MIGRATION_GUIDE.md         # Full migration guide
```

---

## 🆘 TROUBLESHOOTING

### Issue: Terraform deployment stuck on RDS creation
**Solution:** RDS takes 10-15 minutes to create. Be patient!

### Issue: CloudFront SSL certificate error
**Solution:** We temporarily disabled custom domains. Will enable after DNS validation.

### Issue: ECS tasks won't start
**Possible causes:**
1. Docker images not pushed to ECR
2. Secrets not populated
3. Database not accessible

**Check logs:**
```bash
aws logs tail /ecs/workshelf/backend --follow
aws logs tail /ecs/workshelf/keycloak --follow
```

### Issue: DNS not resolving
**Solution:** DNS propagation takes 1-24 hours. Use CloudFront/ALB DNS names for testing.

---

## 📚 DOCUMENTATION

- Full migration guide: `infrastructure/terraform/MIGRATION_GUIDE.md`
- Terraform docs: https://registry.terraform.io/providers/hashicorp/aws/
- AWS ECS docs: https://docs.aws.amazon.com/ecs/
- AWS RDS docs: https://docs.aws.amazon.com/rds/

---

## ✅ TODO CHECKLIST

- [x] Create Terraform infrastructure code
- [x] Optimize for AWS free tier
- [x] Initialize Terraform
- [ ] **RUN: ./deploy.sh (15-20 minutes)**
- [ ] Add DNS records for SSL validation
- [ ] Populate AWS Secrets Manager
- [ ] Migrate database from Neon to RDS
- [ ] Build and push Docker images to ECR
- [ ] Deploy ECS services
- [ ] Build and upload frontend to S3
- [ ] Configure DNS for CloudFront and ALB
- [ ] Test all endpoints
- [ ] Update GitHub Actions CI/CD
- [ ] Decommission Azure resources

**Current step:** Infrastructure deployment (Step 1)

---

**Need help?** Check MIGRATION_GUIDE.md or ask!
