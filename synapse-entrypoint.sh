#!/bin/bash
set -e

# Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    apt-get update && apt-get install -y awscli
fi

# Download config from S3
aws s3 cp s3://workshelf-synapse-config-496675774501/homeserver.yaml /data/homeserver.yaml

# Generate signing key if it doesn't exist
if [ ! -f /data/chat.workshelf.dev.signing.key ]; then
    python -m synapse.app.homeserver --generate-keys -c /data/homeserver.yaml
fi

# Start Synapse
exec python -m synapse.app.homeserver -c /data/homeserver.yaml
