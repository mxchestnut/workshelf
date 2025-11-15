# Matrix Server on AWS - Cost-Optimized Setup

## 💰 Monthly Cost Breakdown

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **RDS PostgreSQL** | db.t4g.micro (1 vCPU, 1GB RAM) | ~$15 |
| **ECS Fargate** | 0.5 vCPU, 1GB RAM, 24/7 | ~$7 |
| **EFS Storage** | ~10GB (most data cached) | ~$3 |
| **ALB** | Shared with existing services | $0 |
| **Secrets Manager** | 2 secrets | ~$1 |
| **CloudWatch Logs** | 7-day retention | <$1 |
| **Data Transfer** | Minimal (internal VPC) | ~$1 |
| **TOTAL** | | **~$28/month** |

## 🏗️ Architecture

```
Users → Route53 (matrix.workshelf.dev)
         ↓
      ALB (HTTPS)
         ↓
    ECS Fargate (Matrix Synapse)
         ↓
    RDS PostgreSQL (db.t4g.micro)
         ↓
    EFS (persistent data)
```

## 🚀 Deployment

### Automated Deployment (Recommended)

```bash
cd /path/to/work-shelf
bash scripts/deploy-matrix-aws.sh
```

This script will:
1. Validate Terraform configuration
2. Show you the planned changes
3. Deploy Matrix infrastructure
4. Output the shared secret for backend configuration

### Manual Deployment

```bash
cd infrastructure/terraform

# Plan the deployment
terraform plan -target=aws_db_instance.matrix \
               -target=aws_ecs_service.matrix

# Apply if plan looks good
terraform apply -target=aws_db_instance.matrix \
                -target=aws_ecs_service.matrix
```

## 📋 Post-Deployment Steps

### 1. Add DNS Record

Add a CNAME record to your DNS provider (Namecheap, etc.):

```
Type: CNAME
Name: matrix
Value: <your-alb-dns-name>
TTL: 300
```

Get your ALB DNS name:
```bash
cd infrastructure/terraform
terraform output alb_dns_name
```

### 2. Get Matrix Shared Secret

```bash
cd infrastructure/terraform
SECRET_ARN=$(terraform output -raw matrix_shared_secret_arn)
aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text
```

### 3. Update Backend Configuration

Add to `backend/.env`:
```bash
MATRIX_HOMESERVER=https://matrix.workshelf.dev
MATRIX_REGISTRATION_SHARED_SECRET=<secret-from-step-2>
```

### 4. Run Database Migration

```bash
cd backend
alembic upgrade head
```

### 5. Verify Deployment

```bash
# Test Matrix server
curl https://matrix.workshelf.dev/_matrix/client/versions

# Expected response:
# {"versions":["r0.0.1","r0.1.0",...]}
```

## 🔍 Monitoring

### View Logs

```bash
# Via AWS CLI
aws logs tail /ecs/work-shelf-matrix --follow

# Via AWS Console
CloudWatch > Log Groups > /ecs/work-shelf-matrix
```

### Check Service Health

```bash
# ECS Service status
aws ecs describe-services \
  --cluster work-shelf-cluster \
  --services work-shelf-matrix

# Database status
aws rds describe-db-instances \
  --db-instance-identifier work-shelf-matrix-db
```

### Metrics to Monitor

- **ECS**: CPU/Memory utilization (should be <70%)
- **RDS**: Database connections (should be <50)
- **ALB**: Target health checks
- **EFS**: Data transfer rate

## 🔧 Configuration Details

### ECS Task Configuration

- **CPU**: 512 units (0.5 vCPU)
- **Memory**: 1024 MB (1 GB)
- **Restart Policy**: Always
- **Health Check**: `/_matrix/client/versions`

### Database Configuration

- **Engine**: PostgreSQL 15.4
- **Instance**: db.t4g.micro (Graviton2)
- **Storage**: 20GB GP3 SSD
- **Backups**: 7-day retention
- **Multi-AZ**: No (for cost savings)

### Security

- **Network**: Private subnets only
- **Encryption**: 
  - RDS: At rest (enabled)
  - EFS: At rest (enabled)
  - ALB: In transit (HTTPS)
- **Secrets**: AWS Secrets Manager
- **IAM**: Task execution role with minimal permissions

## 💾 Backups

### Automated RDS Backups

- **Retention**: 7 days
- **Window**: 3:00-4:00 AM UTC
- **Snapshots**: Automated before upgrades

### Manual Backup

```bash
aws rds create-db-snapshot \
  --db-instance-identifier work-shelf-matrix-db \
  --db-snapshot-identifier matrix-manual-backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier work-shelf-matrix-db

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier work-shelf-matrix-db-restored \
  --db-snapshot-identifier <snapshot-id>
```

## 📈 Scaling

### Vertical Scaling (More Power)

Edit `infrastructure/terraform/matrix.tf`:

```hcl
# Increase CPU/Memory
cpu    = 1024  # 1 vCPU (~$14/month)
memory = 2048  # 2GB RAM

# Upgrade database
instance_class = "db.t4g.small"  # 2 vCPU, 2GB (~$30/month)
```

Then apply:
```bash
terraform apply -target=aws_ecs_task_definition.matrix \
                -target=aws_db_instance.matrix
```

### Horizontal Scaling (Not Recommended)

Matrix Synapse doesn't scale horizontally well. Vertical scaling is preferred.

## 🐛 Troubleshooting

### Matrix Service Won't Start

```bash
# Check logs
aws logs tail /ecs/work-shelf-matrix --follow

# Common issues:
# - Database connection failed: Check RDS security groups
# - EFS mount failed: Check EFS mount targets
# - Health check failing: Check port 8008 accessibility
```

### Can't Connect via HTTPS

```bash
# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <matrix-client-tg-arn>

# Check DNS propagation
dig matrix.workshelf.dev

# Check SSL certificate
aws acm describe-certificate --certificate-arn <cert-arn>
```

### Database Connection Errors

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier work-shelf-matrix-db \
  --query 'DBInstances[0].DBInstanceStatus'

# Test connection from ECS (requires SSM Session Manager)
aws ecs execute-command \
  --cluster work-shelf-cluster \
  --task <task-id> \
  --container synapse \
  --command "nc -zv $POSTGRES_HOST 5432" \
  --interactive
```

## 💸 Cost Optimization Tips

### Reduce Costs Further

1. **Use Spot Instances for Non-Prod**
   - Not available for Fargate, but consider EC2 ECS for dev

2. **Reduce Backup Retention**
   ```hcl
   backup_retention_period = 3  # Instead of 7
   ```

3. **Use EFS Infrequent Access**
   - Already configured to transition after 30 days
   - Saves ~50% on storage costs

4. **Reduce Log Retention**
   ```hcl
   retention_in_days = 3  # Instead of 7
   ```

5. **Stop During Off-Hours (Dev Only)**
   ```bash
   # Stop service
   aws ecs update-service \
     --cluster work-shelf-cluster \
     --service work-shelf-matrix \
     --desired-count 0

   # Start service
   aws ecs update-service \
     --cluster work-shelf-cluster \
     --service work-shelf-matrix \
     --desired-count 1
   ```

### Cost at Scale

| Users | RDS Instance | Monthly Cost |
|-------|-------------|--------------|
| <1,000 | db.t4g.micro | ~$28 |
| 1,000-5,000 | db.t4g.small | ~$45 |
| 5,000-20,000 | db.t4g.medium | ~$75 |
| 20,000+ | db.r6g.large | ~$150 |

## 🔄 Updates & Maintenance

### Update Matrix Synapse

```bash
# Update task definition to use new image
terraform apply -target=aws_ecs_task_definition.matrix

# Force new deployment
aws ecs update-service \
  --cluster work-shelf-cluster \
  --service work-shelf-matrix \
  --force-new-deployment
```

### Database Maintenance

- **Automatic**: Minor version upgrades during maintenance window
- **Manual**: Major version upgrades require planning

### Monitoring Maintenance

Set up CloudWatch Alarms:

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name matrix-high-cpu \
  --alarm-description "Matrix CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## 🔐 Security Best Practices

1. **Enable GuardDuty**: Monitor for threats
2. **Enable VPC Flow Logs**: Audit network traffic
3. **Rotate Secrets**: Use AWS Secrets Manager rotation
4. **Enable CloudTrail**: Audit API calls
5. **Use IAM Roles**: Never hardcode credentials
6. **Enable RDS Encryption**: Already enabled by default
7. **Use Security Groups**: Restrict access to necessary services only

## 📊 Compliance

- **Data Residency**: Data stays in your AWS region
- **Encryption**: At rest and in transit
- **Backups**: Automated with 7-day retention
- **Audit Logs**: CloudWatch Logs + CloudTrail
- **High Availability**: Multi-AZ RDS (optional upgrade)

## 🆘 Support

- **AWS Support**: Use your AWS support plan
- **Matrix Community**: https://matrix.org/support/
- **Synapse Docs**: https://matrix-org.github.io/synapse/latest/
- **Terraform Docs**: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## 📝 Terraform Resources Created

- `aws_db_instance.matrix` - PostgreSQL database
- `aws_ecs_task_definition.matrix` - Container definition
- `aws_ecs_service.matrix` - ECS service
- `aws_efs_file_system.matrix` - Persistent storage
- `aws_lb_target_group.matrix_client` - ALB target group (port 8008)
- `aws_lb_target_group.matrix_federation` - ALB target group (port 8448)
- `aws_security_group.matrix_service` - Service security group
- `aws_security_group.matrix_db` - Database security group
- `aws_security_group.matrix_efs` - EFS security group
- `aws_secretsmanager_secret.matrix_shared_secret` - Registration secret
- `aws_secretsmanager_secret.matrix_db_password` - Database password
- `aws_cloudwatch_log_group.matrix` - Log group

## 🎯 Success Criteria

- [ ] Matrix server responding at `https://matrix.workshelf.dev`
- [ ] Database connected and healthy
- [ ] ECS service running with 1 task
- [ ] Health checks passing
- [ ] Logs visible in CloudWatch
- [ ] Backend can register users
- [ ] Frontend can connect and send messages
- [ ] Element app can connect (optional)

---

**Questions?** Check the full setup guide or AWS console for details.
