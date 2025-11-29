# Nginx Configuration for Keycloak Timeouts

## Problem
Keycloak required-action endpoints (password updates, email verification, etc.) can take longer than nginx's default 60s timeout, causing 502 Bad Gateway errors on POST requests.

## Solution
Increase nginx timeouts and buffer sizes specifically for Keycloak proxy.

## Files Created
- `deploy/nginx-keycloak.conf` - Complete nginx config for keycloak.workshelf.dev subdomain
- `deploy/setup-keycloak-nginx.sh` - Automated setup script

## Key Timeout Settings
```nginx
proxy_connect_timeout 300s;  # Time to establish connection to Keycloak
proxy_send_timeout 300s;     # Time to send request to Keycloak
proxy_read_timeout 300s;     # Time to read response from Keycloak
send_timeout 300s;           # Time to send response to client
```

## Buffer Settings (for large SAML/JWT responses)
```nginx
proxy_buffer_size 128k;
proxy_buffers 8 256k;
proxy_busy_buffers_size 512k;
client_max_body_size 20M;
```

## Deployment Steps

### On Production Server
```bash
# 1. Copy setup script to server
scp deploy/setup-keycloak-nginx.sh user@server:/tmp/

# 2. SSH to server
ssh user@server

# 3. Run setup (as root or with sudo)
sudo bash /tmp/setup-keycloak-nginx.sh

# 4. Verify
curl -I https://keycloak.workshelf.dev/health
systemctl status nginx
```

### Manual Alternative
```bash
# Copy config
sudo cp deploy/nginx-keycloak.conf /etc/nginx/sites-available/keycloak.workshelf.dev

# Enable site
sudo ln -sf /etc/nginx/sites-available/keycloak.workshelf.dev /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Get SSL cert (if needed)
sudo certbot --nginx -d keycloak.workshelf.dev

# Reload
sudo systemctl reload nginx
```

## Verification
```bash
# Test timeout (should not 502 after 60s)
time curl -X POST https://keycloak.workshelf.dev/realms/workshelf/login-actions/required-action \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "session_code=test"

# Monitor logs
sudo tail -f /var/log/nginx/keycloak-error.log

# Check Keycloak container
docker logs keycloak-container-name --tail 50
```

## Troubleshooting

### Still Getting 502
1. Check Keycloak is running: `docker ps | grep keycloak`
2. Check Keycloak logs: `docker logs <keycloak-container> --tail 100`
3. Verify database connection in Keycloak
4. Check nginx error log: `tail -f /var/log/nginx/keycloak-error.log`

### Upstream Connection Issues
```bash
# Test direct connection (from server)
curl -I http://localhost:8080/health

# Check port binding
netstat -tlnp | grep 8080
```

## Why This Is Sustainable
- ✅ Proper timeout values for auth flows (5 minutes vs 60 seconds)
- ✅ Adequate buffers for SAML and large token responses
- ✅ Connection pooling with keepalive for performance
- ✅ Separate subdomain config (isolated from main site)
- ✅ Proper logging for debugging
- ✅ Health check endpoint for monitoring

## Related Issues
- 502 Bad Gateway on password update required action
- Timeout errors on SAML authentication
- Large token responses causing buffer overflow
- Slow database queries during authentication
