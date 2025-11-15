# Matrix Synapse Server Setup
# Subdomain: matrix.workshelf.dev

## Prerequisites

1. **Domain & DNS Setup**
   - Add DNS A record: `matrix.workshelf.dev` → Your server IP
   - Add DNS SRV records for federation (optional but recommended):
     ```
     _matrix._tcp.workshelf.dev. 3600 IN SRV 10 0 8448 matrix.workshelf.dev.
     ```

2. **SSL Certificate**
   - Use Certbot to generate SSL certificate:
     ```bash
     sudo certbot certonly --standalone -d matrix.workshelf.dev
     ```

3. **Firewall Rules**
   - Open ports 8008 (client API) and 8448 (federation)

## Initial Setup

### 1. Generate Synapse Configuration

```bash
cd docker/matrix-synapse

# Generate initial config
docker run -it --rm \
  -v $(pwd)/data:/data \
  -e SYNAPSE_SERVER_NAME=matrix.workshelf.dev \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate

# This creates data/homeserver.yaml
```

### 2. Configure Environment Variables

Create `.env` file:
```bash
POSTGRES_PASSWORD=your_secure_postgres_password_here
```

### 3. Edit Configuration

Edit `data/homeserver.yaml`:

```yaml
# Database configuration
database:
  name: psycopg2
  args:
    user: synapse_user
    password: your_postgres_password
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10

# Enable registration with auto-join (for your app)
enable_registration: true
enable_registration_without_verification: true  # Your backend handles verification

# Shared secret for admin registration from your backend
registration_shared_secret: "GENERATE_SECURE_SECRET_HERE"

# Allow guest access for your app
allow_guest_access: false

# Public room directory
allow_public_rooms_without_auth: false
allow_public_rooms_over_federation: false

# Redis for better performance (optional)
redis:
  enabled: true
  host: redis
  port: 6379

# URL previews (optional)
url_preview_enabled: true
url_preview_ip_range_blacklist:
  - '127.0.0.0/8'
  - '10.0.0.0/8'
  - '172.16.0.0/12'
  - '192.168.0.0/16'

# Max upload size (for file sharing in chats)
max_upload_size: 50M

# CORS for your frontend
web_client_location: https://workshelf.dev

# Trusted key servers for federation
trusted_key_servers:
  - server_name: "matrix.org"
```

### 4. Generate Registration Secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy this into `registration_shared_secret` in homeserver.yaml

### 5. Start Services

```bash
docker-compose up -d
```

### 6. Create Admin User (for management)

```bash
docker exec -it workshelf-matrix register_new_matrix_user \
  -c /data/homeserver.yaml \
  --admin \
  http://localhost:8008

# Follow prompts to create admin user
```

## Nginx Configuration

Add to your main Nginx config or create new file:

```nginx
# /etc/nginx/sites-available/matrix.workshelf.dev

server {
    listen 80;
    listen [::]:80;
    server_name matrix.workshelf.dev;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    listen 8448 ssl http2;  # Federation port
    listen [::]:8448 ssl http2;
    
    server_name matrix.workshelf.dev;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/matrix.workshelf.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matrix.workshelf.dev/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client API
    location ~ ^(/_matrix|/_synapse/client) {
        proxy_pass http://localhost:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;

        # For file uploads
        client_max_body_size 50M;
    }

    # Server-server federation API
    location ~ ^/_matrix/federation {
        proxy_pass http://localhost:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    # .well-known for delegation (optional)
    location /.well-known/matrix/server {
        return 200 '{"m.server": "matrix.workshelf.dev:8448"}';
        default_type application/json;
        add_header Access-Control-Allow-Origin *;
    }

    location /.well-known/matrix/client {
        return 200 '{"m.homeserver": {"base_url": "https://matrix.workshelf.dev"}}';
        default_type application/json;
        add_header Access-Control-Allow-Origin *;
    }
}
```

Enable the config:
```bash
sudo ln -s /etc/nginx/sites-available/matrix.workshelf.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Update Backend Configuration

In `backend/.env`:
```bash
MATRIX_HOMESERVER=https://matrix.workshelf.dev
MATRIX_REGISTRATION_SHARED_SECRET=your_generated_secret_here
```

Update `backend/app/api/matrix.py`:
```python
import os

MATRIX_HOMESERVER = os.getenv("MATRIX_HOMESERVER", "https://matrix.workshelf.dev")
MATRIX_SHARED_SECRET = os.getenv("MATRIX_REGISTRATION_SHARED_SECRET")
```

## Update Frontend Configuration

In `frontend/src/hooks/useMatrixClient.ts`:
```typescript
const MATRIX_HOMESERVER = "https://matrix.workshelf.dev";
```

## Verify Installation

### 1. Check Server Status
```bash
curl https://matrix.workshelf.dev/_matrix/client/versions
```

Expected response:
```json
{
  "versions": ["r0.0.1", "r0.1.0", "r0.2.0", ...]
}
```

### 2. Check Federation (optional)
```bash
curl https://matrix.workshelf.dev/_matrix/federation/v1/version
```

### 3. Test Registration
```bash
curl -X POST https://matrix.workshelf.dev/_matrix/client/r0/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "password": "test_password",
    "auth": {"type": "m.login.dummy"}
  }'
```

## Maintenance

### View Logs
```bash
docker-compose logs -f synapse
```

### Backup Database
```bash
docker exec workshelf-matrix-db pg_dump -U synapse_user synapse > matrix-backup-$(date +%Y%m%d).sql
```

### Update Synapse
```bash
docker-compose pull
docker-compose up -d
```

### Monitor Resources
```bash
docker stats workshelf-matrix workshelf-matrix-db
```

## Troubleshooting

### Issue: Registration fails
- Check `enable_registration: true` in homeserver.yaml
- Verify shared secret is set correctly
- Check logs: `docker-compose logs synapse`

### Issue: Federation not working
- Verify DNS SRV records are set
- Check port 8448 is open
- Test with: https://federationtester.matrix.org/

### Issue: Can't connect from frontend
- Check CORS settings in homeserver.yaml
- Verify SSL certificate is valid
- Check Nginx proxy headers

## Security Considerations

1. **Firewall**: Only expose ports 80, 443, 8448
2. **Database**: Use strong postgres password
3. **Shared Secret**: Keep registration_shared_secret private (only backend should know)
4. **Rate Limiting**: Synapse has built-in rate limiting, configure in homeserver.yaml
5. **Backups**: Automate daily postgres backups
6. **Monitoring**: Set up alerts for high CPU/memory usage
7. **Updates**: Keep Synapse updated for security patches

## Production Checklist

- [ ] DNS records configured (A + SRV)
- [ ] SSL certificate installed and auto-renewal enabled
- [ ] Strong postgres password set
- [ ] Registration shared secret generated and stored securely
- [ ] Nginx reverse proxy configured
- [ ] Firewall rules applied
- [ ] Database backups automated
- [ ] Monitoring/alerting set up
- [ ] Rate limiting configured
- [ ] Log rotation enabled
- [ ] Test user registration from backend
- [ ] Test message sending between users
- [ ] Test Element app compatibility

## Estimated Costs

- **VPS**: $10-20/month (2GB RAM minimum, 4GB recommended)
- **Domain**: Already covered by workshelf.dev
- **SSL**: Free (Let's Encrypt)
- **Bandwidth**: Included with VPS

## Resources

- [Synapse Documentation](https://matrix-org.github.io/synapse/latest/)
- [Matrix Spec](https://spec.matrix.org/)
- [Federation Tester](https://federationtester.matrix.org/)
- [Element Clients](https://element.io/download)
