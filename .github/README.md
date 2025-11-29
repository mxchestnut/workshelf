# GitHub Actions CI/CD Setup

This repository uses GitHub Actions for continuous integration and deployment.

## Workflows

### CI (`ci.yml`)
Runs on every push and pull request to `main`:
- **Frontend**: Lint, type-check, and build (validates env vars)
- **Backend**: Run pytest suite with Postgres + Redis
- **Security**: npm audit + pip-audit for known vulnerabilities

### Deploy (`deploy.yml`)
Manual deployment to production EC2:
- Requires typing "deploy" to confirm
- Verifies CI passed on the commit
- SSH deploys to EC2, rebuilds images, restarts services
- Notifies Sentry of new release

## Required Secrets

Configure these in GitHub Settings → Secrets → Actions:

```
EC2_SSH_KEY          # Private SSH key for ubuntu@EC2_HOST
EC2_HOST             # EC2 instance IP (e.g., 34.239.176.138)
VITE_SENTRY_DSN      # Frontend Sentry DSN (for CI build)
SENTRY_AUTH_TOKEN    # Sentry API token for release tracking (optional)
SENTRY_ORG           # Sentry organization slug (optional)
```

## Pre-commit Hooks

Install locally to catch issues before pushing:

```bash
cd backend
pip install pre-commit
pre-commit install
```

Hooks run:
- `black` (Python formatting)
- `ruff` (Python linting)
- `eslint` (TypeScript/React linting)
- Trailing whitespace, YAML/JSON validation
- Secret detection

## Running Tests Locally

**Frontend:**
```bash
cd frontend
npm ci
npm run lint
npm run build
```

**Backend:**
```bash
cd backend
pip install -r requirements-dev.txt

# Start test dependencies
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine

export DATABASE_URL=postgresql://postgres:test@localhost:5432/workshelf_test
export REDIS_URL=redis://localhost:6379
export SECRET_KEY=test-key

pytest tests/ -v
```

## Deployment Process

1. Push changes to `main` (or open PR)
2. Wait for CI to pass
3. Go to Actions → Deploy to Production → Run workflow
4. Type "deploy" and confirm
5. Monitor deployment logs
6. Verify health checks pass

## Troubleshooting

**CI failing on frontend build:**
- Check `VITE_API_URL` format in `scripts/validate-env.mjs`
- Ensure secrets are set in GitHub repo settings

**Backend tests failing:**
- Verify Postgres/Redis services are healthy
- Check `DATABASE_URL` connection string format
- Review pytest output for specific test failures

**Deploy failing:**
- Confirm EC2 SSH key is correct (PEM format, 600 permissions)
- Check EC2 security group allows SSH from GitHub Actions IPs
- Verify deploy/.env has all required variables
