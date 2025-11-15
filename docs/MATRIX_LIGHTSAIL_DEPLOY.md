# Matrix Synapse Deployment on Lightsail

A concise, repeatable procedure to launch Synapse + Postgres + Caddy on an Ubuntu Lightsail instance, using the repo's `infrastructure/lightsail` bundle.

## Overview
- Homeserver host: `matrix.workshelf.dev`
- User IDs on apex: `@user:workshelf.dev` (via well-known files)
- Services: Synapse, local Postgres, Caddy reverse proxy + TLS (443 & 8448)
- Script: `scripts/lightsail/setup-matrix-synapse.sh`

## Prerequisites
1. AWS credentials with Route53 access configured on your local machine.
2. Hosted zone for `workshelf.dev` exists in Route53.
3. Registration shared secret chosen (store securely, e.g. Secrets Manager). Example generation:
   ```bash
   openssl rand -hex 32
   ```
4. Decide Postgres password (store securely).

## Provision Lightsail Instance
1. Create Lightsail Ubuntu (latest LTS) instance (recommend: 2 vCPU / 4GB RAM, 60GB SSD disk).
2. Attach a Static IP.
3. Note public Static IP for DNS step.

## Run Setup Script (on server)
SSH to the instance:
```bash
ssh ubuntu@<STATIC_IP>
```
Download and execute:
```bash
curl -fsSL https://raw.githubusercontent.com/mxchestnut/workshelf/main/scripts/lightsail/setup-matrix-synapse.sh -o setup-matrix-synapse.sh
sudo bash setup-matrix-synapse.sh \
  --server-name workshelf.dev \
  --registration-shared-secret "<REGISTRATION_SHARED_SECRET>" \
  --postgres-password "<POSTGRES_PASSWORD>"
```
The script will:
- Install Docker + Compose plugin
- Create `/opt/matrix` with compose stack
- Template `homeserver.yaml` with provided values
- Launch containers (Synapse, Postgres, Caddy)
- Open UFW ports: 22,80,443,8448

## DNS Configuration
From your local repo root:
```bash
./scripts/lightsail/route53-point-matrix-to-ip.sh <STATIC_IP>
```
This creates/updates A record for `matrix.workshelf.dev`.

## Well-Known (for apex user IDs)
Already added to `frontend/.well-known/matrix/`:
- `server`: `{ "m.server": "matrix.workshelf.dev:8448" }`
- `client`: `{ "m.homeserver": { "base_url": "https://matrix.workshelf.dev" } }`

Redeploy the frontend so these files are served at:
- `https://workshelf.dev/.well-known/matrix/server`
- `https://workshelf.dev/.well-known/matrix/client`

## Verification
Run these from your laptop after 1–3 minutes:
```bash
curl -s https://matrix.workshelf.dev/_matrix/client/versions | jq '.'
curl -s https://workshelf.dev/.well-known/matrix/server | jq '.'
curl -s https://workshelf.dev/.well-known/matrix/client | jq '.'
```
If versions returns JSON and well-known files are correct, Synapse is reachable.

### Test Registration (backend shared-secret flow)
Use your backend API or direct admin endpoint:
```bash
curl -X POST \
  -H "Authorization: Bearer <REGISTRATION_SHARED_SECRET>" \
  -H 'Content-Type: application/json' \
  https://matrix.workshelf.dev/_synapse/admin/v1/register \
  -d '{"username":"testuser","password":"StrongPass123","admin":false}'
```
Expect JSON containing access token or new user info.

### Federation Probe
```bash
curl -s https://matrix.workshelf.dev:8448/_matrix/federation/v1/version | jq '.'
```
Should return a JSON version object.

## Backups & Maintenance
- Enable Lightsail snapshot daily.
- Add cron for Postgres dump:
  ```bash
  sudo bash -c 'cat > /etc/cron.daily/matrix-pgdump <<EOF
  #!/bin/bash
  pg_dump -U synapse synapse > /opt/matrix/backups/synapse-$(date +%F).sql
  find /opt/matrix/backups -type f -mtime +14 -delete
  EOF'
  sudo chmod +x /etc/cron.daily/matrix-pgdump
  mkdir -p /opt/matrix/backups
  ```
- Keep OS updated:
  ```bash
  sudo apt update && sudo apt -y upgrade
  ```
- Synapse upgrade:
  ```bash
  cd /opt/matrix
  docker compose pull synapse
  docker compose up -d
  ```

## Logs & Troubleshooting
- Synapse logs: `docker logs -f synapse`
- Caddy logs: `docker logs -f caddy`
- Postgres logs: `docker logs -f postgres`
- Health check failure? Confirm TLS cert issuance (may take a minute) and that ports 80/443/8448 are open.

## Migration Path (Later)
1. Stand up ECS + RDS environment.
2. `pg_dump` from Lightsail → restore to RDS.
3. Sync media folder (if used) to S3/EFS.
4. Update DNS (and well-known if host changes) to new endpoint.
5. Decommission Lightsail after validation.

## Security Notes
- Keep registration secret out of version control.
- Restrict SSH with IP allowlist if possible.
- Consider Fail2Ban for SSH hardening.
- Rotate secrets periodically (update homeserver.yaml + restart Synapse).

## Quick Command Cheat Sheet
```bash
# Versions
curl -s https://matrix.workshelf.dev/_matrix/client/versions | jq '.'

# Register test user (replace secret)
curl -X POST -H "Authorization: Bearer <REGISTRATION_SHARED_SECRET>" \
  -H 'Content-Type: application/json' \
  https://matrix.workshelf.dev/_synapse/admin/v1/register \
  -d '{"username":"demo","password":"DemoPass123","admin":false}'

# Synapse logs
docker logs -f synapse
```

---
**Result:** A low-cost, production-capable Matrix homeserver suitable for initial messaging rollout. Scale or migrate when usage demands.
