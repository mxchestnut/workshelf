# AWS S3 Migration Guide

**Date:** December 18, 2025
**Purpose:** Switch from self-hosted MinIO (87MB RAM) to AWS S3 with malware scanning

---

## 🎯 Benefits

- **Memory Savings:** Free up 87MB by removing MinIO container
- **Security:** Automated malware scanning via AWS GuardDuty
- **Reliability:** AWS-managed, 99.99% uptime SLA
- **Scalability:** No storage limits, pay-as-you-go

---

## 📋 Prerequisites

1. AWS Account with admin access
2. AWS CLI installed and configured
3. EC2 instance upgraded to t3.large (8GB RAM) - recommended

---

## Step 1: Create S3 Bucket

```bash
# Create bucket for WorkShelf uploads
aws s3 mb s3://workshelf-uploads --region us-east-1

# Enable versioning (recommended for recovery)
aws s3api put-bucket-versioning \
    --bucket workshelf-uploads \
    --versioning-configuration Status=Enabled

# Set lifecycle policy to delete old file versions after 30 days
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket workshelf-uploads \
    --lifecycle-configuration file://lifecycle.json
```

---

## Step 2: Create IAM User for WorkShelf Backend

```bash
# Create IAM user
aws iam create-user --user-name workshelf-s3-user

# Create policy for S3 access
cat > s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::workshelf-uploads",
        "arn:aws:s3:::workshelf-uploads/*"
      ]
    }
  ]
}
EOF

aws iam put-user-policy \
    --user-name workshelf-s3-user \
    --policy-name WorkShelfS3Access \
    --policy-document file://s3-policy.json

# Create access keys
aws iam create-access-key --user-name workshelf-s3-user
```

**Save the output:** You'll need `AccessKeyId` and `SecretAccessKey`

---

## Step 3: Update Backend Configuration

### On Production Server:

```bash
# SSH to server
ssh -i ~/.ssh/workshelf-key.pem ubuntu@52.202.80.210

# Edit environment file
cd /home/ubuntu/workshelf/deploy
nano .env
```

### Add/Update these variables:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIA...  # From Step 2
AWS_SECRET_ACCESS_KEY=...   # From Step 2
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=workshelf-uploads

# Remove MinIO endpoint (or leave blank for AWS S3)
S3_ENDPOINT_URL=

# Optional: CloudFront CDN distribution (set up later)
# CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
```

### Restart backend:

```bash
cd /home/ubuntu/workshelf/deploy
sudo docker-compose -f docker-compose.prod.yml restart backend
```

---

## Step 4: Stop MinIO Container (Frees 87MB)

```bash
cd /home/ubuntu/workshelf/deploy

# Stop MinIO
sudo docker-compose -f docker-compose.prod.yml stop minio

# Verify memory freed
free -h
```

---

## Step 5: Set Up AWS GuardDuty Malware Scanning

### 5.1: Enable GuardDuty (if not already enabled)

```bash
# Check if GuardDuty is enabled
aws guardduty list-detectors --region us-east-1

# If empty, enable it
aws guardduty create-detector \
    --enable \
    --finding-publishing-frequency FIFTEEN_MINUTES \
    --region us-east-1
```

### 5.2: Enable Malware Protection for S3

```bash
# Get detector ID
DETECTOR_ID=$(aws guardduty list-detectors --region us-east-1 --query 'DetectorIds[0]' --output text)

# Enable S3 malware scanning
aws guardduty update-malware-scan-settings \
    --detector-id $DETECTOR_ID \
    --scan-resource-criteria '{"Include": {"S3_BUCKET_NAME": ["workshelf-uploads"]}}' \
    --region us-east-1
```

### 5.3: Create Lambda Function for Malware Actions

This Lambda will automatically delete infected files:

```bash
# Create Lambda execution role
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
    --role-name WorkShelfMalwareLambdaRole \
    --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
    --role-name WorkShelfMalwareLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create S3 deletion policy
cat > s3-delete-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::workshelf-uploads/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name WorkShelfMalwareLambdaRole \
    --policy-name S3DeletePolicy \
    --policy-document file://s3-delete-policy.json
```

### 5.4: Create Lambda Function Code

Create `malware_handler.py`:

```python
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Triggered by GuardDuty findings.
    Deletes infected files and logs the action.
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Parse GuardDuty finding
    detail = event.get('detail', {})
    finding_type = detail.get('type', '')
    
    if 'MalwareProtection' not in finding_type:
        logger.info("Not a malware finding, ignoring")
        return
    
    # Extract S3 object info
    resources = detail.get('resource', {}).get('s3BucketDetails', [])
    
    for resource in resources:
        bucket = resource.get('name')
        object_key = resource.get('objectKey')
        
        if bucket and object_key:
            logger.warning(f"MALWARE DETECTED: {bucket}/{object_key}")
            
            try:
                # Delete infected file
                s3.delete_object(Bucket=bucket, Key=object_key)
                logger.info(f"Deleted infected file: {bucket}/{object_key}")
                
                # TODO: Notify user via email/notification system
                # notify_user(object_key, "malware_detected")
                
            except Exception as e:
                logger.error(f"Failed to delete {bucket}/{object_key}: {e}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Malware handling complete')
    }
```

### 5.5: Deploy Lambda

```bash
# Package Lambda
zip malware_handler.zip malware_handler.py

# Create Lambda function
aws lambda create-function \
    --function-name WorkShelfMalwareHandler \
    --runtime python3.11 \
    --role arn:aws:iam::YOUR_ACCOUNT_ID:role/WorkShelfMalwareLambdaRole \
    --handler malware_handler.lambda_handler \
    --zip-file fileb://malware_handler.zip \
    --timeout 60 \
    --region us-east-1
```

### 5.6: Connect GuardDuty to Lambda via EventBridge

```bash
# Create EventBridge rule
aws events put-rule \
    --name workshelf-malware-detection \
    --event-pattern '{
      "source": ["aws.guardduty"],
      "detail-type": ["GuardDuty Finding"],
      "detail": {
        "type": [{
          "prefix": "MalwareProtection"
        }]
      }
    }' \
    --region us-east-1

# Add Lambda as target
aws events put-targets \
    --rule workshelf-malware-detection \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:WorkShelfMalwareHandler" \
    --region us-east-1

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
    --function-name WorkShelfMalwareHandler \
    --statement-id AllowEventBridgeInvoke \
    --action 'lambda:InvokeFunction' \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/workshelf-malware-detection \
    --region us-east-1
```

---

## Step 6: Test Malware Scanning

### Upload EICAR test file (harmless malware test):

```bash
# Create EICAR test file
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Upload to S3
aws s3 cp eicar.txt s3://workshelf-uploads/test/eicar.txt

# Wait 5-10 minutes for GuardDuty to scan
# Check GuardDuty findings
aws guardduty list-findings --detector-id $DETECTOR_ID --region us-east-1
```

If working correctly:
1. GuardDuty detects malware within 5-10 minutes
2. EventBridge triggers Lambda
3. Lambda deletes the file
4. Finding appears in GuardDuty console

---

## Step 7: Monitoring & Costs

### GuardDuty Costs:
- **S3 malware scanning:** $0.50 per GB scanned (first 150 GB free per month)
- **GuardDuty base:** ~$0.008 per 1,000 CloudTrail events
- **Estimated for small app:** $5-15/month

### S3 Storage Costs:
- **Storage:** $0.023 per GB/month
- **PUT requests:** $0.005 per 1,000 requests
- **GET requests:** $0.0004 per 1,000 requests
- **Estimated for 10GB storage, 10K requests/month:** $2-5/month

### Monitoring:
```bash
# View recent GuardDuty findings
aws guardduty list-findings \
    --detector-id $DETECTOR_ID \
    --finding-criteria '{"Criterion":{"service.archived":{"Eq":["false"]}}}' \
    --region us-east-1

# Check Lambda logs
aws logs tail /aws/lambda/WorkShelfMalwareHandler --follow
```

---

## Rollback Plan (If Issues Occur)

If you need to go back to MinIO:

```bash
# Restart MinIO
cd /home/ubuntu/workshelf/deploy
sudo docker-compose -f docker-compose.prod.yml up -d minio

# Update .env
S3_ENDPOINT_URL=http://minio:9000

# Restart backend
sudo docker-compose -f docker-compose.prod.yml restart backend
```

---

## Next Steps

1. ✅ Upgrade EC2 to t3.large (8GB RAM)
2. ✅ Update backend .env with AWS credentials
3. ✅ Stop MinIO container
4. ✅ Set up GuardDuty malware scanning
5. ⬜ Test file uploads work with S3
6. ⬜ Test malware detection with EICAR file
7. ⬜ Set up CloudWatch alerts for GuardDuty findings
8. ⬜ Optional: Add CloudFront CDN for faster downloads

---

## Security Notes

- **Never commit AWS keys to git** - they're in .env which is .gitignored
- Consider using IAM roles instead of access keys (requires EC2 instance profile)
- Enable S3 bucket encryption at rest (AES-256)
- Enable S3 access logging for audit trail
- Set up SNS notifications for critical GuardDuty findings

