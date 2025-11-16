#!/bin/bash
# Create a Matrix user with shared secret registration
set -e

SECRET=$(aws secretsmanager get-secret-value --secret-id workshelf/matrix/shared-secret --query SecretString --output text)

# Get nonce
NONCE=$(curl -sS https://matrix.workshelf.dev/_synapse/admin/v1/register | jq -r '.nonce')

# Compute HMAC
USERNAME="testuser"
PASSWORD="Test1234!"
MAC=$(python3 -c "
import hmac
import hashlib
nonce = '$NONCE'
user = '$USERNAME'
password = '$PASSWORD'
secret = '$SECRET'
mac_input = f'{nonce}\x00{user}\x00{password}\x00notadmin'
print(hmac.new(secret.encode('utf-8'), mac_input.encode('utf-8'), hashlib.sha1).hexdigest())
")

# Register user
curl -X POST https://matrix.workshelf.dev/_synapse/admin/v1/register \
  -H "Content-Type: application/json" \
  -d "{
    \"nonce\": \"$NONCE\",
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\",
    \"admin\": false,
    \"mac\": \"$MAC\"
  }"
