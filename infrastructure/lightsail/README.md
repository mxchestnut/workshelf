# WorkShelf Matrix on Lightsail (Ubuntu + Docker)

This bundle runs Matrix Synapse + PostgreSQL behind Caddy (auto-HTTPS) on a single Ubuntu Lightsail instance.

## When to use this
- You prefer simpler, single-server ops (vs. ECS/EFS/ALB).
- Low-to-moderate traffic, cost-sensitive.
- You want full control and easy SSH access.

## Recommended Lightsail size
- Minimum for Synapse + Postgres: 2 vCPU / 2–4 GB RAM (approx $10–$20/mo).
- Disk: 40–60 GB SSD.

## Open ports
- 22 (SSH), 80/443 (HTTP/HTTPS), 8448 (Matrix federation)

## Quick start
1) Create a Lightsail Ubuntu instance and assign a Static IP.
2) SSH to the server as `ubuntu` (or `root`).
3) Copy the setup script to the server and run it with your values:

   - Server name: `matrix.workshelf.dev`
   - Registration shared secret: from AWS Secrets Manager or choose a strong value
   - Postgres password: strong random

### Run on the server
```bash
curl -fsSL https://raw.githubusercontent.com/mxchestnut/workshelf/main/scripts/lightsail/setup-matrix-synapse.sh -o setup-matrix-synapse.sh
sudo bash setup-matrix-synapse.sh \
  --server-name matrix.workshelf.dev \
  --registration-shared-secret "<SECRET>" \
  --postgres-password "<DB_PASSWORD>"
```

4) Point DNS for `matrix.workshelf.dev` to the server Static IP:

```bash
# From your laptop (AWS credentials configured)
./scripts/lightsail/route53-point-matrix-to-ip.sh <STATIC_IP>
```

5) Test after 1–3 minutes:
```bash
curl -s https://matrix.workshelf.dev/_matrix/client/versions | jq '.'
```

## Files in this folder
- `docker-compose.yml` – Synapse + Postgres + Caddy stack
- `Caddyfile` – TLS + reverse proxy for client (443) and federation (8448)
- `synapse/homeserver.yaml` – baseline config templated by setup script
- `synapse/matrix.log.config` – logging config

## Notes
- Caddy obtains and renews TLS certs automatically for `matrix.workshelf.dev`.
- Postgres is local to the server; for higher durability use RDS or Lightsail managed DB and update `database.args.host`.
- The registration shared secret disables open signups; your backend will create users via shared-secret registration.
- Backups: enable Lightsail snapshots and add a nightly `pg_dump` cron.

## Scale-up later
- Move Postgres to a managed DB (RDS/Lightsail DB)
- Split Caddy/Synapse to separate instances
- Add monitoring (Prometheus, Loki, etc.)

## Using apex domain user IDs (`@user:workshelf.dev`)
If you want Matrix user IDs to live on the apex (recommended for brand consistency) while the homeserver actually runs at `matrix.workshelf.dev`, set `server_name: workshelf.dev` in your Synapse config and publish these well-known files on the primary site:

Frontend (static site) should expose:

`/.well-known/matrix/server`
```json
{ "m.server": "matrix.workshelf.dev:8448" }
```

`/.well-known/matrix/client`
```json
{ "m.homeserver": { "base_url": "https://matrix.workshelf.dev" } }
```

Steps:
1. Create the `.well-known/matrix/` directory in your web root (already added under `frontend/.well-known/matrix/`).
2. Ensure your static server includes dotfiles and nested directories (Nginx/Netlify default is usually fine).
3. Restart/redeploy frontend so the files are served.
4. Verify:
  ```bash
  curl -s https://workshelf.dev/.well-known/matrix/server | jq '.'
  curl -s https://workshelf.dev/.well-known/matrix/client | jq '.'
  ```
5. Confirm federation lookup:
  ```bash
  curl -s https://matrix.workshelf.dev/_matrix/client/versions | jq '.'
  ```

Why apex IDs:
- Shorter, cleaner handles (`@kit:workshelf.dev`).
- Flexibility to move homeserver hosting without changing user IDs.

If you prefer subdomain IDs (`@kit:matrix.workshelf.dev`), skip the well-known files and set `server_name: matrix.workshelf.dev` instead.
