# WorkShelf Docker Development Environment

This directory contains Docker Compose configuration for running WorkShelf locally for development.

## Security Notice

**⚠️ IMPORTANT: Never commit the `.env` file to version control!**

The `.env` file contains sensitive credentials and is already included in `.gitignore`.

## Quick Start

1. **Create your `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Update the passwords in `.env`**:
   - Change all `change_this_*` values to secure passwords
   - The `.env` file is gitignored and will never be committed

3. **Start the services**:
   ```bash
   docker-compose up -d
   ```

## Environment Variables

All sensitive credentials must be set in the `.env` file:

### Required Variables (Docker Compose will fail without these):
- `POSTGRES_PASSWORD` - PostgreSQL database password
- `KEYCLOAK_ADMIN_PASSWORD` - Keycloak admin console password
- `KC_DB_PASSWORD` - Keycloak's database password (should match POSTGRES_PASSWORD)
- `MINIO_ROOT_PASSWORD` - MinIO object storage password
- `DATABASE_URL` - Full database connection string for the backend
- `SECRET_KEY` - Application secret key for JWT signing

### Optional Variables:
- `ANTHROPIC_API_KEY` - For AI-powered features
- `STRIPE_SECRET_KEY` - For payment processing
- `GPTZERO_API_KEY` - For plagiarism detection
- `COPYSCAPE_API_KEY` - For content verification

See `.env.example` for a complete list and format.

## Services

- **PostgreSQL** (port 5432) - Main database
- **Keycloak** (port 8081) - Authentication service
- **MinIO** (ports 9000, 9001) - Object storage
- **Redis** (port 6379) - Caching
- **Backend** (port 8000) - FastAPI application
- **Frontend** (port 3000) - React application

## Accessing Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend Docs: http://localhost:8000/docs
- Keycloak Admin: http://localhost:8081
- MinIO Console: http://localhost:9001

## Security Best Practices

1. **Never commit `.env` files** - They contain real credentials
2. **Use strong passwords** - Especially in production-like environments
3. **Rotate credentials regularly** - Update passwords periodically
4. **Keep `.env.example` updated** - But only with placeholders, never real values
5. **Review `.gitignore`** - Ensure all credential files are excluded

## Troubleshooting

If you see errors about missing environment variables:
1. Make sure you copied `.env.example` to `.env`
2. Verify all required variables are set (not empty)
3. Check that passwords don't contain special characters that need escaping

For database connection issues:
1. Ensure `POSTGRES_PASSWORD` and `KC_DB_PASSWORD` match
2. Verify `DATABASE_URL` uses the correct password
3. Wait for health checks to pass before connecting
