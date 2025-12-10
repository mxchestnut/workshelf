# Production State Documentation
**Last Updated**: December 10, 2025

## Current Working Configuration

### Network
- **Network Name**: `workshelf_workshelf`
- All containers must be on this network to communicate

### Backend Container: `workshelf-backend`
**Note**: All environment variables are stored in .env.prod on the server (NOT in git)

See docker-compose.prod.yml for the configuration structure.

### Keycloak Container: `workshelf-keycloak`
**Note**: All environment variables are stored in .env.prod on the server (NOT in git)

See docker-compose.prod.yml for the configuration structure.

### Database
- **Main Database**: Neon PostgreSQL (see .env.prod on server)
- **Keycloak Schema**: `keycloak` (in same database)
- **Storage Database**: Separate Neon database (see .env.prod on server)

### Keycloak Configuration
- **Realm**: `workshelf`
- **Backend Client**: `workshelf-api` (confidential, secret: workshelf-api-secret)
- **Frontend Client**: `workshelf-frontend` (public, PKCE enabled)
- **Admin**: admin / admin

### Current User
- **Username**: warpxth
- **Email**: warpxth@workshelf.dev
- **Backend User ID**: 2
- **Keycloak ID**: (regenerated if Keycloak is recreated)
- **Temp Password**: (set via Keycloak admin)

## Known Issues Fixed
1. ✅ Documents query - removed `joinedload(Document.owner)` to prevent WITHIN GROUP error
2. ✅ Groups table - added `is_deleted` and `deleted_at` columns
3. ✅ Keycloak connectivity - updated KEYCLOAK_INTERNAL_URL to use `workshelf-keycloak` container name

## Do NOT Change
- Container network: `workshelf_workshelf`
- Container names: `workshelf-backend`, `workshelf-keycloak`
- Database endpoints (they're stable now)

## Safe Deployment Process
1. Build new image: `docker build -t workshelf-backend:latest -f backend/Dockerfile backend/`
2. Stop old container: `docker stop workshelf-backend`
3. Remove old container: `docker rm workshelf-backend`
4. Run with saved configuration above
5. Wait 10 seconds and check logs: `docker logs workshelf-backend --tail 20`

## Emergency Recovery
If something breaks, you can restore Keycloak users. See .env.prod on server for credentials.
```bash
# Get admin token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=KEYCLOAK_ADMIN_PASSWORD" \
  -d "grant_type=password" -d "client_id=admin-cli" | \
  grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Create user
curl -s -X POST "http://localhost:8080/admin/realms/workshelf/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "USERNAME", "email": "EMAIL", "emailVerified": true, "enabled": true, "credentials": [{"type": "password", "value": "PASSWORD", "temporary": false}]}'

# Update backend user with new Keycloak ID (get ID from Keycloak admin)
```
