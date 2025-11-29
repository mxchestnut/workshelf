# AWS EC2 Deployment Guide

## Quick Deploy

```bash
cd deploy
chmod +x aws-deploy.sh
./aws-deploy.sh
```

## What Gets Deployed

- **EC2 Instance**: t3.small (2 vCPU, 2GB RAM, ~$15/month)
- **Docker Services**:
  - PostgreSQL 15 (database)
  - Redis 7 (cache)
  - Keycloak 23 (authentication)
  - MinIO (S3-compatible storage)
  - Backend (FastAPI on port 8000)
  - Frontend (React/Vite on port 5173)
- **Nginx**: Reverse proxy for all services
- **Security**: Firewall configured for HTTP/HTTPS/SSH

## Cost Estimate

- **EC2 t3.small**: ~$15/month
- **30GB EBS storage**: ~$3/month
- **Data transfer**: First 100GB/month free
- **Total**: ~$18-20/month

## Environment Variables

The deployment script automatically generates secure secrets for:
- Database password
- Keycloak client secret
- Matrix admin token
- MinIO credentials
- Application secret key

## Custom Domain (Optional)

To use your own domain:

```bash
DOMAIN=workshelf.com ./aws-deploy.sh
```

Then configure your DNS to point to the EC2 public IP.

## SSL/HTTPS Setup

After deployment, SSH into the instance and run:

```bash
sudo certbot --nginx -d yourdomain.com
```

## Monitoring

SSH into instance:
```bash
ssh -i ~/.ssh/workshelf-key.pem ubuntu@<PUBLIC_IP>
```

View logs:
```bash
cd /opt/workshelf/work-shelf
docker-compose logs -f
```

## Scaling

To upgrade instance type:
```bash
aws ec2 stop-instances --instance-ids <INSTANCE_ID>
aws ec2 modify-instance-attribute --instance-id <INSTANCE_ID> --instance-type t3.medium
aws ec2 start-instances --instance-ids <INSTANCE_ID>
```

## Backup

Database backup:
```bash
docker-compose exec postgres pg_dump -U workshelf workshelf > backup.sql
```

## Keycloak Security

The Workshelf realm is configured with production-grade security policies.

### Password Policy

**Requirements:**
- Minimum length: 12 characters
- Must contain at least 1 digit
- Must contain at least 1 lowercase letter
- Must contain at least 1 uppercase letter
- Must contain at least 1 special character

### Brute Force Protection

**Settings:**
- Max login failures before lockout: 5 attempts
- Wait increment per failure: 1 second
- Maximum wait time: 900 seconds (15 minutes)
- Quick login wait time: 5 seconds

### Token Lifespans

- **Access Token**: 900 seconds (15 minutes)
- **Access Token (Implicit Flow)**: 600 seconds (10 minutes)
- **SSO Session Idle**: 3600 seconds (1 hour)
- **SSO Session Max**: 86400 seconds (24 hours)

### Realm Settings

- **Registration**: Disabled (admin-created accounts only)
- **SSL Required**: External requests only
- **Default Locale**: en

### Client Configuration

**workshelf-frontend** (Public Client):
- **Access Type**: public
- **Authorization Code Flow**: Enabled with PKCE (S256)
- **Direct Access Grants**: Disabled
- **Valid Redirect URIs**: `https://workshelf.dev/*`
- **Valid Post Logout Redirect URIs**: `https://workshelf.dev/*`
- **Web Origins**: `https://workshelf.dev`

**workshelf-api** (Confidential Client):
- **Access Type**: confidential
- **Service Accounts**: Enabled
- **Authorization**: Enabled
- **Valid Redirect URIs**: `https://api.workshelf.dev/*`
- **Web Origins**: `https://api.workshelf.dev`

### Client Scopes

**Default Scopes** (always included):
- acr (Authentication Context Class Reference)
- email
- profile
- roles
- web-origins

**Optional Scopes** (user must consent or request):
- offline_access (refresh tokens)

**Removed Scopes** (not needed):
- address
- phone
- microprofile-jwt

### Security Best Practices

1. **Never use wildcard (`*`) in redirectUris or webOrigins** - always specify exact URLs
2. **Disable Direct Access Grants** for frontend clients - use Authorization Code Flow with PKCE
3. **Require PKCE** for all public clients (code_challenge_method: S256)
4. **Enable brute force detection** to prevent credential stuffing attacks
5. **Set short token lifespans** - force frequent re-authentication for sensitive operations
6. **Disable public registration** - use admin-controlled account creation
7. **Minimize client scopes** - only include claims actually used by the application

### Verifying Security Settings

SSH into the instance and run:

```bash
# Get access token
TOKEN=$(curl -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
  -d "grant_type=password" | jq -r '.access_token')

# Check realm settings
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/admin/realms/workshelf" | jq '{
    registrationAllowed,
    bruteForceProtected,
    passwordPolicy,
    accessTokenLifespan,
    ssoSessionIdleTimeout
  }'

# List client scopes
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/admin/realms/workshelf/client-scopes" | jq '.[] | {name, protocol}'
```

## Cleanup

To remove all resources:
```bash
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
aws ec2 delete-security-group --group-id <SG_ID>
aws ec2 delete-key-pair --key-name workshelf-key
```
