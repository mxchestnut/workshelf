#!/usr/bin/env bash
# Point matrix.workshelf.dev to a given IPv4 using Route53
# Usage: bash route53-point-matrix-to-ip.sh <ipv4>

set -euo pipefail
IPV4=${1:-}
if [[ -z "$IPV4" ]]; then
  echo "Usage: $0 <ipv4>"; exit 1
fi

ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[?Name==`workshelf.dev.`].Id' --output text)
if [[ -z "$ZONE_ID" ]]; then
  echo "Could not find hosted zone for workshelf.dev"; exit 1
fi

cat > /tmp/matrix-a-record.json <<JSON
{
  "Comment": "Point matrix.workshelf.dev to $IPV4",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "matrix.workshelf.dev",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{ "Value": "$IPV4" }]
      }
    }
  ]
}
JSON

aws route53 change-resource-record-sets \
  --hosted-zone-id "$ZONE_ID" \
  --change-batch file:///tmp/matrix-a-record.json \
  --output json | jq '.'

echo "✓ DNS updated. Allow 1-5 minutes to propagate."
