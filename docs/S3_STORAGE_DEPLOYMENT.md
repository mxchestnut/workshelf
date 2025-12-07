# S3 Document Storage - Deployment Guide

## Overview

Documents are now stored in S3-compatible object storage instead of the PostgreSQL database. This protects your data:

- **Database corruption won't affect document content**
- **Better scalability** with object storage
- **Cost-effective** with free tiers (AWS S3: 5GB, Cloudflare R2: 10GB)
- **Backward compatible** - existing DB storage still works as fallback

## Architecture

```
Document Creation Flow:
1. User creates/updates document
2. Content uploaded to S3: tenant_id/documents/document_id/content_TIMESTAMP.txt
3. Database stores: file_path, file_size, metadata only
4. Fallback: If S3 fails, content stored in DB (like before)

Document Retrieval Flow:
1. Load document from database
2. If file_path exists: Download content from S3
3. If file_path missing: Use content from DB column
4. Return document to user
```

## Storage Options

### Option 1: AWS S3 (Recommended for Production)

**Free Tier (12 months):**
- 5 GB storage
- 20,000 GET requests/month
- 2,000 PUT requests/month
- 100 GB data transfer out

**Cost after free tier:** ~$0.023/GB/month

**Setup:**
1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Set environment variables (leave `S3_ENDPOINT_URL` empty for AWS)

### Option 2: Cloudflare R2 (Cheapest)

**Free Tier (Forever):**
- 10 GB storage
- 10 million read requests/month
- 1 million write requests/month
- **Zero egress fees** (no charge for downloads)

**Cost after free tier:** $0.015/GB/month (cheaper than S3)

**Setup:**
1. Go to https://dash.cloudflare.com/?to=/:account/r2
2. Create bucket: `workshelf-documents`
3. Create API token with read/write permissions
4. Set `S3_ENDPOINT_URL` to your R2 endpoint

### Option 3: MinIO (Development/Self-Hosted)

**Cost:** Free (self-hosted)

**Setup:**
- Already running in Docker Compose
- Perfect for development and staging
- Use for testing before deploying to cloud

## Environment Variables

Add these to your production `.env`:

```bash
# S3-Compatible Document Storage
S3_ENDPOINT_URL=                    # Empty for AWS S3, set for MinIO/R2
S3_ACCESS_KEY_ID=your_key_here      # AWS access key or R2 token
S3_SECRET_ACCESS_KEY=your_secret    # AWS secret or R2 secret
S3_BUCKET_NAME=workshelf-documents  # Bucket name
S3_REGION=us-east-1                 # AWS region or R2 auto
```

### For AWS S3:
```bash
S3_ENDPOINT_URL=
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=workshelf-documents
S3_REGION=us-east-1
```

### For Cloudflare R2:
```bash
S3_ENDPOINT_URL=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key
S3_BUCKET_NAME=workshelf-documents
S3_REGION=auto
```

### For MinIO (Development):
```bash
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=workshelf-documents
S3_REGION=us-east-1
```

## Production Deployment Steps

### Step 1: Choose Storage Provider

**Recommendation:** Start with **AWS S3 free tier** or **Cloudflare R2**
- Both are production-ready
- R2 is cheaper long-term (no egress fees)
- S3 has better AWS integration

### Step 2: Create Bucket

**AWS S3:**
```bash
# Using AWS CLI
aws s3 mb s3://workshelf-documents --region us-east-1

# Set bucket policy (private)
aws s3api put-bucket-acl --bucket workshelf-documents --acl private
```

**Cloudflare R2:**
1. Go to Cloudflare Dashboard → R2
2. Click "Create bucket"
3. Name: `workshelf-documents`
4. Create API token with read/write permissions

### Step 3: Update Production Environment

SSH into production server:
```bash
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138
cd /opt/workshelf/deploy
```

Edit `.env` file:
```bash
sudo nano .env
```

Add S3 configuration (see examples above).

### Step 4: Deploy

```bash
# Pull latest code
git pull

# Restart backend to load new S3 settings
docker-compose restart backend

# Check logs
docker-compose logs -f backend | grep -i s3
```

You should see: `✅ S3 client initialized with endpoint: AWS S3` (or your endpoint)

### Step 5: Verify

Test document creation:
```bash
# On your local machine
cd backend
python3 scripts/test_s3_storage.py
```

Expected output:
```
✅ S3 client initialized
✅ Upload successful
✅ Download successful
✅ Content matches original
✅ Delete successful
✅ All tests passed!
```

## Migration Strategy

### Existing Data
- **Old documents:** Content remains in database `content` column
- **New documents:** Content stored in S3, `content` column is NULL
- **No migration needed:** System works with both

### Optional: Migrate Old Documents to S3

Create migration script (future task):
```python
# backend/scripts/migrate_docs_to_s3.py
# For each document with content in DB:
#   1. Upload content to S3
#   2. Update file_path in database
#   3. Clear content column
#   4. Verify download works
```

## Monitoring

### Check S3 Usage

**AWS S3:**
```bash
aws s3 ls s3://workshelf-documents --recursive --summarize
```

**Cloudflare R2:**
- Dashboard → R2 → workshelf-documents → Metrics

### Backend Logs

```bash
docker-compose logs backend | grep -E "S3|storage"
```

Look for:
- `✅ S3 client initialized`
- `Uploaded document X to S3`
- `Downloaded document from S3`
- ❌ `Failed to upload/download` (indicates issues)

## Troubleshooting

### Issue: "S3 not configured, falling back to database storage"

**Solution:** Check environment variables are set:
```bash
docker-compose exec backend env | grep S3_
```

### Issue: "Failed to upload document to S3"

**Causes:**
1. Wrong credentials
2. Bucket doesn't exist
3. Network issues
4. Permissions issues

**Solution:**
```bash
# Test credentials manually
docker-compose exec backend python3 scripts/test_s3_storage.py
```

### Issue: Documents not loading

**Check:**
1. Backend logs for S3 errors
2. Bucket permissions (should be private but accessible to IAM user)
3. Network connectivity from server to S3

## Security

### Bucket Permissions
- ✅ **Private** bucket (not public)
- ✅ IAM user with minimum permissions:
  - `s3:PutObject` (upload)
  - `s3:GetObject` (download)
  - `s3:DeleteObject` (delete)
  - `s3:ListBucket` (list)

### Example IAM Policy (AWS S3):
```json
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
        "arn:aws:s3:::workshelf-documents",
        "arn:aws:s3:::workshelf-documents/*"
      ]
    }
  ]
}
```

## Backup Strategy

### S3 Versioning (Recommended)

Enable bucket versioning to protect against accidental deletion:

**AWS S3:**
```bash
aws s3api put-bucket-versioning \
  --bucket workshelf-documents \
  --versioning-configuration Status=Enabled
```

**Cloudflare R2:**
- Not yet supported, use lifecycle rules instead

### Disaster Recovery

**Backup plan:**
1. S3 bucket versioning enabled (auto-backup)
2. Daily database backups (Neon: 30-day retention)
3. Test restore process quarterly

**Recovery:**
- Database corrupted? → S3 files intact ✅
- S3 files lost? → Restore from S3 versioning ✅
- Both corrupted? → Restore database from Neon backup ✅

## Cost Estimates

### Scenario: 100 users, 50 documents each

**Storage:** 5,000 documents × 50KB avg = 250 MB

**AWS S3:** FREE (under 5GB)
**Cloudflare R2:** FREE (under 10GB)

### Scenario: 1,000 users, 100 documents each

**Storage:** 100,000 documents × 50KB avg = 5 GB

**AWS S3:** $0.12/month
**Cloudflare R2:** FREE (under 10GB)

**Winner:** Cloudflare R2 🏆

## Next Steps

1. ✅ Choose storage provider (AWS S3 or Cloudflare R2)
2. ✅ Create bucket
3. ✅ Update production `.env` with S3 credentials
4. ✅ Deploy and test
5. ⏳ Enable bucket versioning
6. ⏳ Monitor S3 usage
7. ⏳ (Optional) Migrate existing documents to S3

## Summary

- Documents now stored in S3 instead of database
- Protects user data from database issues
- Free tier available (AWS 5GB, R2 10GB)
- Backward compatible (no migration needed)
- Ready to deploy!
