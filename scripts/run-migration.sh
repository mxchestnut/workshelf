#!/bin/bash
set -e

echo "Running Alembic migration on ECS backend container..."

# Get the task ARN for the backend service
TASK_ARN=$(aws ecs list-tasks \
  --cluster workshelf-cluster \
  --service-name workshelf-backend \
  --desired-status RUNNING \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "Error: No running backend tasks found"
  exit 1
fi

echo "Found task: $TASK_ARN"

# Run the migration command
echo "Executing: alembic upgrade head"
aws ecs execute-command \
  --cluster workshelf-cluster \
  --task "$TASK_ARN" \
  --container workshelf-backend \
  --interactive \
  --command "cd /app && alembic upgrade head"

echo "Migration complete!"
