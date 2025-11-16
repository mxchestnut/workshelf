#!/bin/bash
# Grant staff privileges to warpxth via Systems Manager Run Command

TASK_ARN=$(aws ecs list-tasks --cluster workshelf-cluster --service-name workshelf-backend --desired-status RUNNING --query 'taskArns[0]' --output text)
TASK_ID=$(echo $TASK_ARN | awk -F/ '{print $NF}')

echo "Running staff grant command on ECS task: $TASK_ID"

# Create a temporary Python script
SCRIPT=$(cat <<'EOF'
import asyncio
import asyncpg
import os

async def main():
    db_url = os.getenv('DATABASE_URL', '').replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(db_url)
    user = await conn.fetchrow("SELECT id, username, email, is_staff FROM users WHERE email = 'mxchestnut@gmail.com'")
    if not user:
        print('User not found')
    elif user['is_staff']:
        print(f'User {user["username"]} is already staff')
    else:
        await conn.execute("UPDATE users SET is_staff = TRUE WHERE email = 'mxchestnut@gmail.com'")
        print(f'Granted staff privileges to {user["username"]}')
    await conn.close()

asyncio.run(main())
EOF
)

# Try to run via ECS exec (requires Session Manager plugin)
aws ecs execute-command \
    --cluster workshelf-cluster \
    --task "$TASK_ID" \
    --container backend \
    --interactive \
    --command "python3 -c '$SCRIPT'"
