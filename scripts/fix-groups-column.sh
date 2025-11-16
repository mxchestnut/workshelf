#!/bin/bash
# Run a one-time task to add the missing column

set -e

echo "Creating one-time task to fix groups.matrix_space_id column..."

# Get DB password from Secrets Manager
DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id workshelf/db-password --query SecretString --output text)

# Get networking info
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=workshelf-private-1" --query 'Subnets[0].SubnetId' --output text)
SECURITY_GROUP_ID="sg-0fc6272bb5c59c5ea"  # workshelf-ecs-sg (has RDS access)
EXECUTION_ROLE_ARN=$(aws iam get-role --role-name workshelf-ecs-task-execution-role --query 'Role.Arn' --output text)

echo "Subnet: $SUBNET_ID"
echo "Security Group: $SECURITY_GROUP_ID"

# SQL to run
SQL_COMMAND="DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'matrix_space_id') THEN ALTER TABLE groups ADD COLUMN matrix_space_id VARCHAR(255); CREATE INDEX IF NOT EXISTS ix_groups_matrix_space_id ON groups(matrix_space_id); RAISE NOTICE 'Added matrix_space_id column and index'; ELSE RAISE NOTICE 'matrix_space_id column already exists'; END IF; END \$\$;"

# Create task definition
cat > /tmp/fix-groups-task.json <<EOF
{
  "family": "workshelf-db-fix",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "fix",
      "image": "postgres:15-alpine",
      "essential": true,
      "command": [
        "psql",
        "postgresql://workshelf_admin:${DB_PASSWORD}@workshelf-db.c7nldsfplzvc.us-east-1.rds.amazonaws.com:5432/workshelf",
        "-c",
        "${SQL_COMMAND}"
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/workshelf/backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "db-fix"
        }
      }
    }
  ]
}
EOF

echo "Registering task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition --cli-input-json file:///tmp/fix-groups-task.json --query 'taskDefinition.taskDefinitionArn' --output text)
echo "Task definition: $TASK_DEF_ARN"

echo "Running fix task..."
TASK_ARN=$(aws ecs run-task \
  --cluster workshelf-cluster \
  --task-definition workshelf-db-fix \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=DISABLED}" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task ARN: $TASK_ARN"
echo "Waiting for task to complete..."

for i in {1..30}; do
    STATUS=$(aws ecs describe-tasks --cluster workshelf-cluster --tasks $TASK_ARN --query 'tasks[0].lastStatus' --output text)
    echo "  Status: $STATUS"
    
    if [ "$STATUS" = "STOPPED" ]; then
        EXIT_CODE=$(aws ecs describe-tasks --cluster workshelf-cluster --tasks $TASK_ARN --query 'tasks[0].containers[0].exitCode' --output text)
        if [ "$EXIT_CODE" = "0" ]; then
            echo "✅ Fix completed successfully!"
            exit 0
        else
            echo "❌ Fix failed with exit code: $EXIT_CODE"
            aws logs tail /ecs/workshelf/backend --since 2m | grep db-fix || echo "No logs available"
            exit 1
        fi
    fi
    
    sleep 3
done

echo "❌ Task did not complete within timeout"
exit 1
