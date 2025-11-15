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

# Get subnet and security group for the task
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=workshelf-private-1" --query 'Subnets[0].SubnetId' --output text)
# IMPORTANT: Use the Matrix service security group so EFS SG allows NFS (2049) from it
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=workshelf-matrix-service-sg" --query 'SecurityGroups[0].GroupId' --output text)
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name workshelf-ecs-task-execution-role --query 'Role.Arn' --output text)

echo "Subnet: $SUBNET_ID"
echo "Security Group (service SG): $SECURITY_GROUP_ID"
echo "Execution Role: $EXECUTION_ROLE_ARN"

# Create base64 encoded config files
HOMESERVER_CONFIG=$(cat "/Users/kit/Library/Mobile Documents/com~apple~CloudDocs/PROJECTS NEW/Shared Thread/work-shelf/infrastructure/matrix-config/homeserver.yaml" | base64)
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
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=DISABLED}" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task ARN: $TASK_ARN"
TASK_ID=$(basename $TASK_ARN)

echo ""
echo "⏳ Waiting for task to complete..."
for i in {1..30}; do
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
