# Workshelf Backend

FastAPI backend service for Workshelf platform.

## Features

### Rate Limiting

The backend implements Redis-backed rate limiting with automatic fallback to in-memory storage.

**Environment Variables:**
- `RATE_LIMIT_PER_MINUTE`: Global API rate limit (default: 120 requests/minute)
- `AUTH_RATE_LIMIT_PER_MINUTE`: Auth endpoint rate limit (default: 30 requests/minute)
- `REDIS_URL`: Redis connection string (optional, falls back to in-memory)

**Behavior:**
- Health endpoints (`/health`, `/health/live`, `/health/ready`) are **excluded** from rate limiting
- Auth endpoints (`/api/v1/auth/*`) use stricter `AUTH_RATE_LIMIT_PER_MINUTE` limit
- All other endpoints use `RATE_LIMIT_PER_MINUTE` limit
- Limits are applied per IP address
- Redis stores counters with 60-second TTL

**Response Headers:**
All API responses include:
- `X-Request-ID`: UUID v4 request identifier
- `X-RateLimit-Limit`: Maximum requests allowed per minute
- `X-RateLimit-Remaining`: Remaining requests in current window

**429 Rate Limit Exceeded Response:**
```json
{
  "detail": "Rate limit exceeded",
  "limit": 120,
  "retry_after_seconds": 45,
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Structured Logging

All requests are logged in JSON format for easy parsing and monitoring:

```json
{
  "event": "request",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "ip": "192.0.2.1",
  "path": "/api/v1/users/me",
  "method": "GET",
  "status_code": 200,
  "duration_ms": 45,
  "remaining_quota": 119
}
```

Rate-limited requests generate:
```json
{
  "event": "rate_limited",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "ip": "192.0.2.1",
  "path": "/api/v1/auth/login",
  "method": "POST"
}
```

### Error Tracking

Sentry integration for error monitoring and performance tracing.

**Environment Variables:**
- `SENTRY_DSN`: Sentry project DSN (required for error tracking)
- `ENVIRONMENT`: Environment name (e.g., `production`, `staging`)
- `GIT_SHA`: Git commit hash for release tracking

**Configuration:**
- Traces sample rate: 10%
- Integrations: FastAPI, SQLAlchemy
- Automatic error capture for uncaught exceptions

### Authentication

Keycloak-based JWT authentication with automatic user creation.

**Flow:**
1. User authenticates with Keycloak
2. Frontend receives JWT access token
3. First request to `/api/v1/users/me` auto-creates user in database
4. Subsequent requests use existing user record

**Token Validation:**
- Validates JWT signature with Keycloak public key
- Checks token expiration
- Extracts user info from token claims

## Development

### Setup

```bash
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements-dev.txt
```

### Running Locally

```bash
uvicorn app.main:app --reload --port 8000
```

### Database Migrations

Create migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

### Testing

```bash
pytest tests/
pytest tests/test_specific_file.py
pytest -v  # verbose output
pytest --cov  # with coverage report
```

## Production

See [deploy/README.md](../deploy/README.md) for deployment instructions.

### Environment Variables

Required:
- `DATABASE_URL`: PostgreSQL connection string
- `KEYCLOAK_URL`: Keycloak server URL
- `KEYCLOAK_REALM`: Keycloak realm name
- `KEYCLOAK_CLIENT_ID`: Backend client ID
- `KEYCLOAK_CLIENT_SECRET`: Backend client secret

Optional:
- `REDIS_URL`: Redis connection string (enables distributed rate limiting)
- `SENTRY_DSN`: Sentry project DSN (enables error tracking)
- `RATE_LIMIT_PER_MINUTE`: Global API rate limit (default: 120)
- `AUTH_RATE_LIMIT_PER_MINUTE`: Auth endpoint rate limit (default: 30)
- `ENVIRONMENT`: Environment name for Sentry (default: `development`)
- `GIT_SHA`: Git commit hash for Sentry releases

### Health Checks

- `GET /health`: Basic health check (always returns 200)
- `GET /health/live`: Liveness probe (checks app is running)
- `GET /health/ready`: Readiness probe (checks database connectivity)

All health endpoints are excluded from rate limiting.

## Security

- JWT-based authentication with Keycloak
- Rate limiting (IP-based, configurable per endpoint type)
- CORS configured for specific origins only
- Database connection pooling with SQLAlchemy async
- Dependency vulnerability scanning via pip-audit (CI/CD)
- Pre-commit hooks enforce code quality (black, ruff)

See [deploy/README.md](../deploy/README.md#keycloak-security) for Keycloak security policies.
