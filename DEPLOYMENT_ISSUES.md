# Deployment Issues & Fixes

## CORS Preflight Failing (URGENT - MANUAL FIX REQUIRED)

**Issue**: OPTIONS requests return 204 but no `Access-Control-Allow-Origin` header

**Root Cause**: Either:
1. Nginx is responding to OPTIONS without forwarding to FastAPI
2. FastAPI CORS middleware not receiving OPTIONS requests

**Manual Fix Steps**:

```bash
# 1. SSH to server
ssh -i ~/.ssh/workshelf-key.pem ubuntu@34.239.176.138

# 2. Navigate to deployment directory
cd /opt/workshelf/deploy

# 3. Pull latest code (includes fix script)
git pull

# 4. Run the CORS fix script
sudo bash fix-cors.sh

# 5. Restart backend to ensure new code is loaded
sudo docker-compose -f docker-compose.prod.yml restart backend

# 6. Wait 10 seconds for backend to start
sleep 10

# 7. Test CORS
curl -X OPTIONS https://api.workshelf.dev/api/v1/store/browse \
  -H "Origin: https://workshelf.dev" \
  -H "Access-Control-Request-Method: GET" \
  -i | grep -i "access-control"

# Should see:
# access-control-allow-origin: https://workshelf.dev
# access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
```

**If still not working after restart**, check nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
sudo docker-compose -f docker-compose.prod.yml logs backend | tail -50
```

**Expected behavior**:
- OPTIONS request should return headers like:
  ```
  access-control-allow-origin: https://workshelf.dev
  access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
  access-control-allow-headers: *
  access-control-max-age: 3600
  ```

---

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
