# Matrix Server Deployment - Quick Reference

## 🚀 Deployment Status

**Currently Deploying to AWS!**

The Matrix server is being created with the following components:

### Resources Being Created

1. **RDS PostgreSQL Database** (db.t4g.micro)
   - ~5-10 minutes to create
   - 20GB storage
   - PostgreSQL 15.8
   - Automated backups (7 days)

2. **ECS Fargate Service**
   - 0.5 vCPU, 1GB RAM
   - Matrix Synapse container
   - Auto-scaling: 1 task

3. **EFS File System**
   - Persistent storage for Matrix data
   - Encrypted at rest
   - Infrequent Access after 30 days

4. **Security Groups**
   - Matrix service → Database
   - ALB → Matrix service
   - Matrix service → EFS

5. **Secrets Manager**
   - Database password
   - Registration shared secret

6. **ALB Target Groups**
   - Port 8008 (client API)
   - Port 8448 (federation)

7. **CloudWatch Logs**
   - 7-day retention
   - `/ecs/workshelf-matrix`

### Total: 20 New Resources

## 📋 After Deployment Complete

### 1. Get Terraform Outputs

```bash
cd infrastructure/terraform

# Get Matrix homeserver URL
terraform output matrix_homeserver_url

# Get ALB DNS name
terraform output alb_dns_name

# Get shared secret ARN
terraform output matrix_shared_secret_arn
```

### 2. Add DNS Record

Point matrix subdomain to ALB:

```
Type: CNAME
Name: matrix
Value: [Your ALB DNS name from output above]
TTL: 300
```

### 3. Get Matrix Shared Secret

```bash
cd infrastructure/terraform
SECRET_ARN=$(terraform output -raw matrix_shared_secret_arn)
aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text
```

Copy this secret for the next step.

### 4. Update Backend .env

Add to `backend/.env`:

```bash
MATRIX_HOMESERVER=https://matrix.workshelf.dev
MATRIX_REGISTRATION_SHARED_SECRET=[secret from step 3]
```

### 5. Run Database Migration

```bash
cd backend
alembic upgrade head
```

### 6. Install Frontend Dependencies

```bash
cd frontend
npm install matrix-js-sdk
```

### 7. Test Matrix Server

```bash
# Wait 1-2 minutes after deployment completes
curl https://matrix.workshelf.dev/_matrix/client/versions

# Expected response:
# {"versions":["r0.0.1","r0.1.0","r0.2.0",...]}
```

## 💰 Cost Breakdown

| Service | Cost/Month |
|---------|-----------|
| RDS db.t4g.micro | ~$15 |
| Fargate (0.5 vCPU, 1GB) | ~$7 |
| EFS (~10GB) | ~$3 |
| Secrets Manager (2) | ~$1 |
| CloudWatch Logs | <$1 |
| Data Transfer | ~$1 |
| **TOTAL** | **~$28/month** |

## 🔍 Monitor Deployment

### Check Deployment Status

```bash
# Watch terraform output
tail -f infrastructure/terraform/terraform-apply.log

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier workshelf-matrix-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Check ECS service
aws ecs describe-services \
  --cluster workshelf-cluster \
  --services workshelf-matrix
```

### View Logs

```bash
# Once deployed, view Matrix logs
aws logs tail /ecs/workshelf-matrix --follow

# Check health
aws elbv2 describe-target-health \
  --target-group-arn [from terraform output]
```

## 🐛 If Deployment Fails

### Database Creation Timeout

RDS can take 10-15 minutes. If it times out:

```bash
cd infrastructure/terraform
terraform apply -auto-approve
```

### Version Errors

If you see engine version errors, check available versions:

```bash
aws rds describe-db-engine-versions \
  --engine postgres \
  --engine-version 15 \
  --query 'DBEngineVersions[*].EngineVersion'
```

### Resource Limits

Check AWS service quotas:

```bash
aws service-quotas list-service-quotas \
  --service-code rds \
  --query 'Quotas[?QuotaName==`DB instances`]'
```

## ✅ Success Indicators

After deployment completes, you should see:

```
Apply complete! Resources: 20 added, 1 changed, 0 destroyed.

Outputs:

matrix_db_endpoint = "workshelf-matrix-db.xxx.us-east-1.rds.amazonaws.com:5432"
matrix_homeserver_url = "https://matrix.workshelf.dev"
matrix_shared_secret_arn = "arn:aws:secretsmanager:us-east-1:xxx:secret:workshelf/matrix/shared-secret-xxx"
```

## 🔄 Next: Integrate with Work Shelf

1. ✅ Matrix server deployed
2. ⏳ Add DNS record
3. ⏳ Update backend config
4. ⏳ Run migration
5. ⏳ Test connection
6. ⏳ Deploy backend changes
7. ⏳ Install frontend deps
8. ⏳ Test messaging

Total time: ~30 minutes from deployment complete

## 📚 Documentation

- **AWS Setup**: `docs/MATRIX_AWS_SETUP.md`
- **Server Setup**: `docs/MATRIX_SERVER_SETUP.md`
- **Quick Start**: `docs/MATRIX_QUICK_START.md`
- **Terraform Code**: `infrastructure/terraform/matrix.tf`

## 🆘 Support

- Check CloudWatch Logs: `/ecs/workshelf-matrix`
- Check RDS Events: AWS Console > RDS > Events
- Check ECS Events: AWS Console > ECS > workshelf-cluster > workshelf-matrix

---

**Estimated Deployment Time**: 5-10 minutes
**Status**: Check terminal output or AWS console
