# Deployment Issues & Fixes

## CORS Headers Conflict (URGENT)

**Issue**: The API returns duplicate CORS headers causing fetch requests to fail:
```
Access-Control-Allow-Origin: https://workshelf.dev, *
```

**Root Cause**: Both nginx reverse proxy AND FastAPI are adding CORS headers.

**Fix Required**: SSH to EC2 server and update nginx configuration

1. SSH to server:
```bash
ssh ubuntu@34.207.74.33
```

2. Find and edit the nginx config for api.workshelf.dev:
```bash
sudo nano /etc/nginx/sites-available/api.workshelf.dev
```

3. Remove or comment out any `add_header Access-Control-Allow-Origin` lines:
```nginx
# REMOVE THIS:
# add_header Access-Control-Allow-Origin "*" always;

# FastAPI handles CORS via CORSMiddleware in backend/app/main.py
```

4. Test and reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Sentry 403 Error

**Issue**: Sentry initialization returns 403 Forbidden

**Cause**: The Sentry DSN/auth token may be invalid or the project doesn't exist

**Fix**: Check Sentry configuration in GitHub secrets and environment variables

## Missing vite.svg

**Issue**: 404 error for `/vite.svg`

**Fix**: Remove reference to vite.svg from the HTML or add the file to public folder

## SSH Timeout

**Issue**: Cannot SSH to EC2 instance (connection timeout)

**Possible causes**:
- Security group not allowing SSH from your IP
- Instance stopped/terminated
- Elastic IP not associated

**Check**:
```bash
aws ec2 describe-instances --filters "Name=tag:Name,Values=workshelf" --query "Reservations[*].Instances[*].[State.Name,PublicIpAddress]"
```
