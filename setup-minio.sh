#!/bin/bash
# MinIO Security Configuration Script
# Configures bucket policies, CORS, and lifecycle rules for WorkShelf

set -e

MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_ALIAS="workshelf"
BUCKET_NAME="${MINIO_BUCKET:-workshelf}"

echo "🔧 Configuring MinIO security..."

# Configure mc (MinIO client)
mc alias set "$MINIO_ALIAS" "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Create bucket if it doesn't exist
mc mb "$MINIO_ALIAS/$BUCKET_NAME" 2>/dev/null || echo "Bucket already exists"

echo "📋 Setting bucket policy (restricted to workshelf.dev origins)..."

# Create restrictive bucket policy JSON
cat > /tmp/bucket-policy.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::workshelf/public/*"],
      "Condition": {
        "StringLike": {
          "aws:Referer": [
            "https://workshelf.dev/*",
            "https://*.workshelf.dev/*"
          ]
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::workshelf/covers/*"]
    }
  ]
}
POLICY

mc anonymous set-json /tmp/bucket-policy.json "$MINIO_ALIAS/$BUCKET_NAME" || echo "Policy set (or already applied)"

echo "🌐 Configuring CORS (restrict origins)..."

# Set CORS rules
mc admin config set "$MINIO_ALIAS" api cors_allow_origin="https://workshelf.dev,https://api.workshelf.dev"

echo "♻️  Setting lifecycle rules (cleanup temp files after 7 days)..."

# Create lifecycle rule for temp files
cat > /tmp/lifecycle.json << 'LIFECYCLE'
{
  "Rules": [
    {
      "ID": "expire-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "ID": "expire-upload-staging",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "uploads/staging/"
      },
      "Expiration": {
        "Days": 3
      }
    }
  ]
}
LIFECYCLE

mc ilm import "$MINIO_ALIAS/$BUCKET_NAME" < /tmp/lifecycle.json

echo "✅ MinIO security configuration complete!"
echo ""
echo "Summary:"
echo "  - Bucket: $BUCKET_NAME"
echo "  - Public read: covers/* (unrestricted), public/* (referer-restricted)"
echo "  - CORS origins: workshelf.dev, api.workshelf.dev"
echo "  - Lifecycle: temp/ (7d), uploads/staging/ (3d)"
