#!/usr/bin/env bash
# Setup Matrix Synapse on Ubuntu (Lightsail) with Docker, Postgres, and Caddy TLS
# Usage:
#   sudo bash setup-matrix-synapse.sh \
#     --server-name matrix.workshelf.dev \
#     --registration-shared-secret "<shared-secret>" \
#     --postgres-password "<db-password>"

set -euo pipefail

# -------- args --------
SERVER_NAME=""
REG_SECRET=""
PG_PASS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server-name)
      SERVER_NAME="$2"; shift 2;;
    --registration-shared-secret)
      REG_SECRET="$2"; shift 2;;
    --postgres-password)
      PG_PASS="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$SERVER_NAME" || -z "$REG_SECRET" || -z "$PG_PASS" ]]; then
  echo "Missing required args."
  echo "Usage: sudo bash $0 --server-name matrix.workshelf.dev --registration-shared-secret <secret> --postgres-password <pass>"
  exit 1
fi

# -------- system prep --------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw

# Docker Engine
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
printf "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu %s stable\n" "$VERSION_CODENAME" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# Allow docker without sudo for ubuntu user
if id ubuntu &>/dev/null; then
  usermod -aG docker ubuntu || true
fi

# -------- filesystem layout --------
BASE_DIR=/opt/matrix
mkdir -p $BASE_DIR
cd $BASE_DIR

# Write compose and configs from embedded heredocs
cat > docker-compose.yml <<'COMPOSE'
version: "3.9"
services:
  postgres:
    image: postgres:15
    container_name: matrix-postgres
    environment:
      POSTGRES_USER: synapse_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: synapse
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  synapse:
    image: matrixdotorg/synapse:latest
    container_name: matrix-synapse
    depends_on:
      - postgres
    environment:
      SYNAPSE_SERVER_NAME: ${SERVER_NAME}
      SYNAPSE_REPORT_STATS: "no"
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      REGISTRATION_SHARED_SECRET: ${REGISTRATION_SHARED_SECRET}
    volumes:
      - synapse-data:/data
      - ./synapse/homeserver.yaml:/data/homeserver.yaml:ro
      - ./synapse/matrix.log.config:/data/matrix.workshelf.dev.log.config:ro
    restart: unless-stopped

  caddy:
    image: caddy:2
    container_name: matrix-caddy
    depends_on:
      - synapse
    ports:
      - "80:80"
      - "443:443"
      - "8448:8448"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    restart: unless-stopped

volumes:
  postgres-data:
  synapse-data:
  caddy-data:
  caddy-config:
COMPOSE

mkdir -p synapse
cat > synapse/homeserver.yaml <<'CONF'
server_name: "${SERVER_NAME}"
web_client: false
pid_file: /data/homeserver.pid
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

# PostgreSQL database (compose service name: postgres)
database:
  name: psycopg2
  args:
    user: synapse_user
    password: "${POSTGRES_PASSWORD}"
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10

log_config: "/data/matrix.workshelf.dev.log.config"
media_store_path: "/data/media_store"

enable_registration: false
registration_shared_secret: "${REGISTRATION_SHARED_SECRET}"

report_stats: false
signing_key_path: "/data/matrix.workshelf.dev.signing.key"
trusted_key_servers:
  - server_name: "matrix.org"
web_client_location: https://workshelf.dev
allow_guest_access: false
url_preview_enabled: false
presence:
  enabled: true
user_directory:
  enabled: true
  search_all_users: true
rc_message:
  per_second: 10
  burst_count: 50
rc_registration:
  per_second: 0.17
  burst_count: 3
rc_login:
  address:
    per_second: 0.17
    burst_count: 3
  account:
    per_second: 0.17
    burst_count: 3
  failed_attempts:
    per_second: 0.17
    burst_count: 3
retention:
  enabled: false
enable_metrics: false
suppress_key_server_warning: true
CONF

cat > synapse/matrix.log.config <<'LOG'
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
    level: INFO
loggers:
  synapse:
    level: INFO
  synapse.storage.SQL:
    level: INFO
root:
  level: INFO
  handlers: [console]
disable_existing_loggers: false
LOG

cat > Caddyfile <<CADDY
{
  email admin@${SERVER_NAME#*.}
}
${SERVER_NAME}:443 {
  encode zstd gzip
  reverse_proxy synapse:8008
}
${SERVER_NAME}:8448 {
  encode zstd gzip
  reverse_proxy synapse:8008
}
CADDY

# -------- env file --------
cat > .env <<ENV
SERVER_NAME=${SERVER_NAME}
REGISTRATION_SHARED_SECRET=${REG_SECRET}
POSTGRES_PASSWORD=${PG_PASS}
ENV

# -------- firewall --------
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8448/tcp

# -------- launch --------
/usr/bin/docker compose --env-file .env up -d

echo ""
echo "✓ Matrix services launched. Give it ~60-120s. Then test:"
echo "  curl -s https://${SERVER_NAME}/_matrix/client/versions"
echo ""
echo "Next: Point DNS to this server's static IP (A record) for ${SERVER_NAME}."
