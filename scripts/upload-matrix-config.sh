#!/bin/bash
# Upload Matrix Synapse configuration to EFS
# This script creates a one-time ECS task to upload config files

set -e

echo "📁 Uploading Matrix configuration to EFS..."

# Get the EFS file system ID
EFS_ID=$(cd "/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/terraform" && terraform output -json | jq -r '.matrix_efs_id.value // empty')

if [ -z "$EFS_ID" ]; then
    echo "❌ Could not find EFS ID in terraform outputs"
    echo "Looking for EFS manually..."
    EFS_ID=$(aws efs describe-file-systems --query 'FileSystems[?CreationToken==`workshelf-matrix-data`].FileSystemId' --output text)
fi

echo "EFS ID: $EFS_ID"

## Networking for the task
# Prefer a public subnet with public IP assignment to allow pulling base images without NAT
PUBLIC_SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=workshelf-public-1" --query 'Subnets[0].SubnetId' --output text)
PRIVATE_SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=workshelf-private-1" --query 'Subnets[0].SubnetId' --output text)
if [ "$PUBLIC_SUBNET_ID" = "None" ] || [ -z "$PUBLIC_SUBNET_ID" ]; then
  SUBNET_ID=$PRIVATE_SUBNET_ID
  ASSIGN_PUBLIC_IP="DISABLED"
  echo "ℹ️  Public subnet not found, using private subnet (image pulls may require NAT or VPC endpoints)"
else
  SUBNET_ID=$PUBLIC_SUBNET_ID
  ASSIGN_PUBLIC_IP="ENABLED"
fi

# IMPORTANT: Use the Matrix service security group so EFS SG allows NFS (2049) from it
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=workshelf-matrix-service-sg" --query 'SecurityGroups[0].GroupId' --output text)
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name workshelf-ecs-task-execution-role --query 'Role.Arn' --output text)

echo "Subnet: $SUBNET_ID (assignPublicIp=$ASSIGN_PUBLIC_IP)"
echo "Security Group (service SG): $SECURITY_GROUP_ID"
echo "Execution Role: $EXECUTION_ROLE_ARN"

# Resolve homeserver config. Prefer template with secret injection if present.
HOMESERVER_TEMPLATE="/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/matrix-config/homeserver.yaml.template"
HOMESERVER_SOURCE="/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/matrix-config/homeserver.yaml"
TMP_RENDERED="/tmp/homeserver.rendered.yaml"

if [ -f "$HOMESERVER_TEMPLATE" ]; then
  echo "🔐 Using template and injecting registration_shared_secret"
  # Determine secret value: prefer env var MATRIX_REGISTRATION_SHARED_SECRET, else AWS Secrets Manager
  if [ -n "$MATRIX_REGISTRATION_SHARED_SECRET" ]; then
    SECRET_VALUE="$MATRIX_REGISTRATION_SHARED_SECRET"
    echo "  • Using MATRIX_REGISTRATION_SHARED_SECRET from environment"
  else
    SECRET_NAME=${MATRIX_REGISTRATION_SECRET_NAME:-"workshelf/matrix-registration-secret"}
    echo "  • Fetching secret from AWS Secrets Manager: $SECRET_NAME"
    set +e
    SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --query SecretString --output text 2>/dev/null)
    GET_SECRET_EXIT=$?
    set -e
    if [ $GET_SECRET_EXIT -ne 0 ] || [ -z "$SECRET_VALUE" ]; then
      echo "⚠️  Could not fetch secret from Secrets Manager. You can set MATRIX_REGISTRATION_SHARED_SECRET env var to override."
      echo "   Falling back to the non-templated homeserver.yaml if available."
      if [ -f "$HOMESERVER_SOURCE" ]; then
        cp "$HOMESERVER_SOURCE" "$TMP_RENDERED"
      else
        echo "❌ No homeserver.yaml available and template cannot be rendered without a secret. Aborting."
        exit 1
      fi
    else
      # Render template by substituting the placeholder
      sed "s|\${REGISTRATION_SHARED_SECRET}|$SECRET_VALUE|g" "$HOMESERVER_TEMPLATE" > "$TMP_RENDERED"
    fi
  fi
else
  echo "ℹ️  Template not found. Using existing homeserver.yaml as-is."
  cp "$HOMESERVER_SOURCE" "$TMP_RENDERED"
fi

# Create base64 encoded config files
HOMESERVER_CONFIG=$(cat "$TMP_RENDERED" | base64)
LOG_CONFIG=$(cat "/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/matrix-config/matrix.workshelf.dev.log.config" | base64)

# Create a task definition for uploading
cat > /tmp/matrix-upload-task.json <<EOF
{
  "family": "matrix-config-upload",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "uploader",
  "image": "alpine:latest",
      "essential": true,
      "command": [
        "sh",
        "-c",
        "echo '$HOMESERVER_CONFIG' | base64 -d > /data/homeserver.yaml && echo '$LOG_CONFIG' | base64 -d > /data/matrix.workshelf.dev.log.config && ls -la /data/ && echo 'Config files uploaded successfully!'"
      ],
      "mountPoints": [
        {
          "sourceVolume": "matrix-data",
          "containerPath": "/data",
          "readOnly": false
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/workshelf-matrix",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "config-upload"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "matrix-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "$EFS_ID",
        "rootDirectory": "/",
        "transitEncryption": "DISABLED"
      }
    }
  ]
}
EOF

echo ""
echo "📝 Registering upload task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file:///tmp/matrix-upload-task.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "Task definition: $TASK_DEF_ARN"

echo ""
echo "🚀 Running upload task..."
TASK_ARN=$(aws ecs run-task \
  --cluster workshelf-cluster \
  --task-definition matrix-config-upload \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=$ASSIGN_PUBLIC_IP}" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task ARN: $TASK_ARN"
TASK_ID=$(basename $TASK_ARN)

echo ""
echo "⏳ Waiting for task to complete..."
for i in {1..48}; do
    STATUS=$(aws ecs describe-tasks --cluster workshelf-cluster --tasks $TASK_ARN --query 'tasks[0].lastStatus' --output text)
    echo "  Status: $STATUS"
    
    if [ "$STATUS" = "STOPPED" ]; then
        EXIT_CODE=$(aws ecs describe-tasks --cluster workshelf-cluster --tasks $TASK_ARN --query 'tasks[0].containers[0].exitCode' --output text)
        echo ""
        if [ "$EXIT_CODE" = "0" ]; then
            echo "✅ Config files uploaded successfully!"
            echo ""
            echo "📋 Task logs:"
            aws logs tail /ecs/workshelf-matrix --since 2m --format short | grep config-upload || echo "No logs yet"
            exit 0
        else
            echo "❌ Upload task failed with exit code: $EXIT_CODE"
            echo ""
            echo "📋 Task logs:"
            aws logs tail /ecs/workshelf-matrix --since 2m --format short | grep config-upload || echo "No logs available"
            exit 1
        fi
    fi
    
    sleep 5
done

echo "❌ Task did not complete within timeout"
exit 1
