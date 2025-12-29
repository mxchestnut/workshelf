# Keycloak Production Deployment Guide

## Prerequisites

- SSH access to your production VM (172.190.159.85)
- Root/sudo access
- DNS A record for `keycloak.workshelf.dev` pointing to your VM IP

## Step 1: Configure DNS

Before running the deployment, add a DNS A record:

```
Type: A
Name: keycloak
Value: 172.190.159.85
TTL: 3600
```

Wait a few minutes for DNS to propagate. Test with:
```bash
nslookup keycloak.workshelf.dev
```

## Step 2: Upload and Run Setup Script

**On your local machine:**

```bash
# Copy the setup script to the VM
scp deploy/setup-keycloak-production.sh azureuser@172.190.159.85:/tmp/

# SSH into the VM
ssh azureuser@172.190.159.85
```

**On the production VM:**

```bash
# Make the script executable
chmod +x /tmp/setup-keycloak-production.sh

# Run the setup script as root
sudo /tmp/setup-keycloak-production.sh
```

**IMPORTANT:** The script will display admin credentials for 60 seconds. **Copy them immediately!**

Example output:
```
==============================================
Keycloak Production Credentials
==============================================

Admin Console: https://keycloak.workshelf.dev

Admin Username: admin
Admin Password: [GENERATED_PASSWORD]

Database Password: [GENERATED_PASSWORD]

==============================================
```

## Step 3: Configure Keycloak Realm

**Option A: Manual Configuration (Recommended for first time)**

1. Access https://keycloak.workshelf.dev
2. Login with admin credentials from Step 2
3. Follow the configuration steps in `docs/KEYCLOAK_SETUP.md` sections 3-6

**Option B: Automated Configuration**

```bash
# On your local machine, upload the config script
scp deploy/configure-keycloak-realm.sh azureuser@172.190.159.85:/tmp/

# SSH into the VM
ssh azureuser@172.190.159.85

# Run the configuration script
chmod +x /tmp/configure-keycloak-realm.sh
/tmp/configure-keycloak-realm.sh
```

This will:
- Create the `workshelf` realm
- Create `workshelf-frontend` client (public)
- Create `workshelf-api` client (confidential)
- Display the backend client secret

**Save the client secret!** You'll need it for your backend .env file.

## Step 4: Create Your Admin User

1. Go to https://keycloak.workshelf.dev
2. Login as admin
3. Select the `workshelf` realm (dropdown at top)
4. Go to Users → Add user
5. Set your username and email
6. Click Create
7. Go to Credentials tab → Set password
8. Disable "Temporary" toggle
9. Click Save

## Step 5: Update Backend Environment Variables

SSH into your VM and update the backend .env file:

```bash
ssh azureuser@172.190.159.85

# Edit the backend .env file
nano /path/to/backend/.env
```

Update these values:
```bash
KEYCLOAK_SERVER_URL=https://keycloak.workshelf.dev
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-api
KEYCLOAK_CLIENT_SECRET=<paste-the-secret-from-step-3>
```

Restart the backend:
```bash
sudo systemctl restart workshelf-backend
# OR
sudo docker restart workshelf-backend
```

## Step 6: Update Frontend Environment Variables

The frontend build needs these environment variables. They should already be set in your GitHub Actions secrets or build environment:

```bash
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
```

If deploying manually:
```bash
cd /path/to/frontend
# Set env vars
export VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
export VITE_KEYCLOAK_REALM=workshelf
export VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend

# Rebuild
npm run build

# Restart nginx or copy build to web root
sudo systemctl reload nginx
```

## Step 7: Test Authentication

1. Go to https://workshelf.dev
2. Click "Sign In" or try to access a protected page
3. You should be redirected to Keycloak login
4. Login with the user you created in Step 4
5. You should be redirected back to WorkShelf

Check browser console (F12) for any errors.

## Troubleshooting

### "Invalid redirect_uri" error
- Make sure `https://workshelf.dev/callback` is in the frontend client's Valid Redirect URIs
- Check that Web Origins includes `https://workshelf.dev`

### "Client not found" error
- Verify realm name is exactly `workshelf`
- Check client IDs are exactly `workshelf-frontend` and `workshelf-api`

### Backend can't validate tokens
- Check `KEYCLOAK_SERVER_URL` is accessible from backend container
- Test: `curl https://keycloak.workshelf.dev/realms/workshelf/.well-known/openid-configuration`

### SSL certificate issues
- Ensure DNS is propagating: `nslookup keycloak.workshelf.dev`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify certbot success: `sudo certbot certificates`

### Keycloak won't start
- Check Docker logs: `sudo docker logs keycloak`
- Check if port 8080 is already in use: `sudo netstat -tulpn | grep 8080`
- Verify PostgreSQL is running: `sudo docker ps | grep keycloak-db`

## Maintenance

### View Keycloak Logs
```bash
sudo docker logs -f keycloak
```

### Restart Keycloak
```bash
sudo docker restart keycloak
```

### Backup Keycloak Database
```bash
sudo docker exec keycloak-db pg_dump -U keycloak keycloak > keycloak-backup-$(date +%Y%m%d).sql
```

### Update Keycloak
```bash
sudo docker pull quay.io/keycloak/keycloak:23.0
sudo docker stop keycloak
sudo docker rm keycloak
# Re-run the docker run command from the setup script
```

## Security Notes

- Admin credentials are auto-generated and shown only once
- Client secrets are confidential - store in Azure Key Vault or similar
- Enable HTTPS only (the script configures this)
- Consider IP whitelisting for admin console
- Regular security updates: `sudo apt update && sudo apt upgrade`
- Monitor failed login attempts in Keycloak
