# WorkShelf Operations Guide (AWS)

Quick reference for common operational tasks on AWS infrastructure.

---

## 🏥 Health Checks

### Check All Services Status
```bash
aws ecs describe-services \
  --cluster workshelf-cluster \
  --services workshelf-backend workshelf-keycloak workshelf-matrix \
  --query 'services[*].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' \
  --output table
```

### Check Specific Service Health
```bash
aws ecs describe-services \
  --cluster workshelf-cluster \
  --service workshelf-backend \
  --query 'services[0].{Status:status,Health:healthCheckGracePeriodSeconds,Running:runningCount}'
```

### Check RDS Database Status
```bash
aws rds describe-db-instances \
  --db-instance-identifier workshelf-db \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Endpoint:Endpoint.Address,Storage:AllocatedStorage}'
```

---

## 🔄 Deployments

### Force Redeploy Service (No Code Changes)
```bash
aws ecs update-service \
  --cluster workshelf-cluster \
  --service workshelf-backend \
  --force-new-deployment
```

### Deploy New Backend Image
```bash
# 1. Build and push to ECR
cd backend
docker build --platform linux/amd64 -t workshelf-backend:TAG .
docker tag workshelf-backend:TAG 496675774501.dkr.ecr.us-east-1.amazonaws.com/workshelf-backend:TAG
docker push 496675774501.dkr.ecr.us-east-1.amazonaws.com/workshelf-backend:TAG

# 2. Update Terraform task definition
cd ../infrastructure/terraform
# Edit task definition to use new TAG
terraform apply -target=aws_ecs_task_definition.backend

# 3. Force redeploy to pick up new task definition
aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment
```

### Deploy Frontend
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://workshelf-frontend/ --delete
aws cloudfront create-invalidation --distribution-id E1GLU4B1NET1IX --paths "/*"
```

### Run Database Migrations
```bash
# Migrations run automatically on backend startup
# To run manually:
./scripts/run-migration.sh
```

---

## 📊 Monitoring & Logs

### View Recent Logs
```bash
# Backend logs (last 10 minutes)
aws logs tail /ecs/workshelf/backend --since 10m --follow

# Matrix logs
aws logs tail /ecs/workshelf-matrix --since 10m --follow

# Keycloak logs
aws logs tail /ecs/workshelf-keycloak --since 10m --follow
```

### Search Logs for Errors
```bash
aws logs filter-log-events \
  --log-group-name /ecs/workshelf/backend \
  --filter-pattern "ERROR" \
  --start-time $(date -u -v-1H +%s)000
```

### Check CloudWatch Alarms
```bash
aws cloudwatch describe-alarms \
  --alarm-names "workshelf-*" \
  --query 'MetricAlarms[*].{Name:AlarmName,State:StateValue,Reason:StateReason}'
```

---

## 🔐 Secrets Management

### View Secret (Without Value)
```bash
aws secretsmanager describe-secret --secret-id workshelf/db-password
```

### Get Secret Value
```bash
aws secretsmanager get-secret-value \
  --secret-id workshelf/db-password \
  --query SecretString \
  --output text
```

### Update Secret
```bash
aws secretsmanager update-secret \
  --secret-id workshelf/db-password \
  --secret-string "NEW_PASSWORD_HERE"
```

### Rotate Database Password (Full Process)
```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# 2. Update Secrets Manager
aws secretsmanager update-secret \
  --secret-id workshelf/db-password \
  --secret-string "$NEW_PASSWORD"

# 3. Update RDS instance
aws rds modify-db-instance \
  --db-instance-identifier workshelf-db \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately

# 4. Wait for status to become 'available'
aws rds wait db-instance-available --db-instance-identifier workshelf-db

# 5. Restart backend to pick up new password
aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment
aws ecs update-service --cluster workshelf-cluster --service workshelf-keycloak --force-new-deployment
```

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
# 1. Check task status
aws ecs list-tasks --cluster workshelf-cluster --service workshelf-backend

# 2. Describe failed task
TASK_ARN=$(aws ecs list-tasks --cluster workshelf-cluster --service workshelf-backend --desired-status STOPPED --query 'taskArns[0]' --output text)
aws ecs describe-tasks --cluster workshelf-cluster --tasks $TASK_ARN

# 3. Check logs for errors
aws logs tail /ecs/workshelf/backend --since 30m | grep -i error
```

### Database Connection Issues
```bash
# 1. Verify database is running
aws rds describe-db-instances --db-instance-identifier workshelf-db --query 'DBInstances[0].DBInstanceStatus'

# 2. Check security group allows ECS tasks
aws ec2 describe-security-groups --group-ids <DB_SECURITY_GROUP_ID>

# 3. Test connection from ECS task
aws ecs execute-command \
  --cluster workshelf-cluster \
  --task TASK_ARN \
  --container workshelf-backend \
  --interactive \
  --command "/bin/bash"
# Then inside container: psql $DATABASE_URL
```

### High Memory/CPU Usage
```bash
# Check ECS service metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=workshelf-backend Name=ClusterName,Value=workshelf-cluster \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

### CloudFront Not Serving Latest Frontend
```bash
# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E1GLU4B1NET1IX \
  --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations --distribution-id E1GLU4B1NET1IX
```

---

## 💾 Backups & Recovery

### Create Manual RDS Snapshot
```bash
aws rds create-db-snapshot \
  --db-instance-identifier workshelf-db \
  --db-snapshot-identifier workshelf-manual-$(date +%Y%m%d-%H%M%S)
```

### List Available Snapshots
```bash
aws rds describe-db-snapshots \
  --db-instance-identifier workshelf-db \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status}' \
  --output table
```

### Restore from Snapshot
```bash
# 1. Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier workshelf-db-restored \
  --db-snapshot-identifier SNAPSHOT_ID

# 2. Wait for restoration
aws rds wait db-instance-available --db-instance-identifier workshelf-db-restored

# 3. Update Secrets Manager with new endpoint
# 4. Update backend to point to new database
# 5. Delete old database when verified
```

---

## 🚨 Emergency Procedures

### Total Service Outage
```bash
# 1. Check AWS status
# Visit: https://health.aws.amazon.com/health/status

# 2. Check all services
aws ecs describe-services --cluster workshelf-cluster --services workshelf-backend workshelf-keycloak workshelf-matrix

# 3. Force restart all services
for service in workshelf-backend workshelf-keycloak workshelf-matrix; do
  aws ecs update-service --cluster workshelf-cluster --service $service --force-new-deployment
done

# 4. Monitor logs
aws logs tail /ecs/workshelf/backend --follow
```

### Rollback Bad Deployment
```bash
# 1. List recent task definitions
aws ecs list-task-definitions --family-prefix workshelf-backend --sort DESC

# 2. Update service to use previous version
aws ecs update-service \
  --cluster workshelf-cluster \
  --service workshelf-backend \
  --task-definition workshelf-backend:PREVIOUS_VERSION

# 3. Monitor deployment
aws ecs describe-services --cluster workshelf-cluster --service workshelf-backend
```

### Security Breach Response
```bash
# 1. Immediately rotate all secrets
./scripts/rotate-all-secrets.sh

# 2. Check CloudTrail for unauthorized access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --start-time $(date -u -v-24H +%Y-%m-%dT%H:%M:%S)

# 3. Review security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=workshelf-*"

# 4. Enable GuardDuty if not already
aws guardduty create-detector --enable
```

---

## 📈 Scaling

### Increase Service Task Count
```bash
aws ecs update-service \
  --cluster workshelf-cluster \
  --service workshelf-backend \
  --desired-count 2
```

### Upgrade RDS Instance
```bash
aws rds modify-db-instance \
  --db-instance-identifier workshelf-db \
  --db-instance-class db.t3.small \
  --apply-immediately
```

### Increase RDS Storage
```bash
aws rds modify-db-instance \
  --db-instance-identifier workshelf-db \
  --allocated-storage 50 \
  --apply-immediately
```

---

## 🔧 Maintenance

### Weekly Tasks
- Review Sentry error reports
- Check CloudWatch logs for anomalies
- Monitor RDS storage usage
- Review AWS costs in Cost Explorer

### Monthly Tasks
- Review and rotate credentials
- Test backup restoration
- Update dependencies (npm, pip)
- Review and update security groups
- Check for AWS service updates

### Quarterly Tasks
- Load testing
- Security audit
- Review IAM permissions
- Update documentation
- Disaster recovery drill

---

## 📞 Support Contacts

- **AWS Support**: https://console.aws.amazon.com/support/
- **Sentry**: https://sentry.io
- **Matrix Documentation**: https://matrix-org.github.io/synapse/latest/
- **Keycloak Documentation**: https://www.keycloak.org/documentation

---

**Last Updated**: November 16, 2025
**Next Review**: December 16, 2025
