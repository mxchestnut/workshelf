# 🚀 WorkShelf Development Setup

## Quick Start for New Developers

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- AWS CLI configured
- Git

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/mxchestnut/workshelf.git
cd workshelf

# Install all dependencies
make install

# Copy environment files
make env

# Start local services (database, keycloak, etc.)
make up

# Run database migrations
make migrate-up
```

### Running Locally
```bash
# Terminal 1: Backend
make backend-run

# Terminal 2: Frontend
make frontend-run
```

Visit:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- Keycloak: http://localhost:8080 (admin/admin)

## Development Workflow

### Before Committing
```bash
# Format code
make format

# Run linters
make lint

# Run tests
make test

# Or run all checks at once
make ci-all
```

### Pre-commit Hooks
We use pre-commit hooks to ensure code quality. They run automatically on `git commit`:

```bash
# Install hooks (done automatically by `make install`)
make pre-commit-setup

# Run manually on all files
make pre-commit-run
```

What gets checked:
- ✅ Python formatting (black)
- ✅ Python linting (ruff)
- ✅ Type checking (mypy)
- ✅ JavaScript/TypeScript formatting (prettier)
- ✅ ESLint
- ✅ Secret detection
- ✅ YAML/JSON validation
- ✅ Trailing whitespace
- ✅ Large file detection

### Creating Features

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   make test
   make lint
   ```

3. **Commit with pre-commit checks**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   # Pre-commit hooks run automatically
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - GitHub Actions will run all tests automatically
   - Terraform plan will show infrastructure changes
   - E2E tests will run on the preview environment

### Database Migrations

```bash
# Create a new migration
make migrate-create MSG="add user preferences table"

# Edit the migration file in backend/alembic/versions/

# Apply migrations locally
make migrate-up

# Check current version
make migrate-status

# View migration history
make migrate-history
```

### Testing

```bash
# Run all tests
make test

# Backend tests only
make backend-test

# Frontend tests only
make frontend-test

# E2E tests (requires deployed environment)
cd e2e && npm test

# Watch mode for development
cd backend && pytest --watch
cd frontend && npm test
```

### Deployment

**Automatic (Recommended):**
- Push to `main` branch → GitHub Actions deploys automatically
- Backend tests run → Build Docker → Push to ECR → Update ECS
- Frontend tests run → Build assets → Sync to S3 → Invalidate CloudFront

**Manual:**
```bash
# Deploy both
make deploy-aws

# Deploy backend only
make deploy-backend-aws

# Deploy frontend only
make deploy-frontend-aws
```

### Viewing Logs

```bash
# Backend logs (live tail)
make logs-backend-aws

# View recent errors
make logs-events

# Local services
make logs
```

## Code Style

### Python (Backend)
- Formatter: **black** (line length 88)
- Linter: **ruff** (replaces flake8, isort, etc.)
- Type checking: **mypy**
- Docstrings: Google style

```python
async def create_project(
    db: AsyncSession,
    user_id: int,
    title: str,
) -> Project:
    """Create a new project.
    
    Args:
        db: Database session
        user_id: ID of the project owner
        title: Project title
        
    Returns:
        Created project instance
        
    Raises:
        ValueError: If title is empty
    """
    ...
```

### TypeScript (Frontend)
- Formatter: **prettier**
- Linter: **ESLint**
- Style: React functional components with hooks

```typescript
interface ProjectCardProps {
  project: Project;
  onDelete?: (id: number) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ 
  project, 
  onDelete 
}) => {
  // Component logic
};
```

### Git Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user profile page
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify authentication logic
test: add tests for project creation
chore: update dependencies
```

## Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── api/          # API routes
│   ├── core/         # Config, database, auth
│   ├── models/       # SQLAlchemy models
│   ├── schemas/      # Pydantic schemas
│   └── services/     # Business logic
├── alembic/          # Database migrations
└── tests/            # Pytest tests
```

### Frontend (React + Vite)
```
frontend/
├── src/
│   ├── components/   # Reusable components
│   ├── pages/        # Page components
│   ├── services/     # API clients
│   ├── hooks/        # Custom React hooks
│   └── utils/        # Utility functions
└── public/           # Static assets
```

### Infrastructure (Terraform + AWS)
```
infrastructure/
└── terraform/
    ├── ecs.tf        # ECS services
    ├── rds.tf        # PostgreSQL database
    ├── s3.tf         # Frontend hosting
    └── cloudfront.tf # CDN
```

## Monitoring & Debugging

### Error Tracking (Sentry)
- All production errors automatically captured
- View at: https://sentry.io
- Includes stack traces, user context, breadcrumbs

### Logs (Grafana Cloud)
- Aggregated logs from all services
- View at: https://grafana.com
- Better UI than CloudWatch

### Database Monitoring (pgAnalyze)
- Slow query detection
- Index recommendations
- View at: https://pganalyze.com

### Performance (Sentry)
- Request duration tracking
- Database query performance
- Frontend page load times

## Troubleshooting

### Backend won't start
```bash
# Check database connection
docker-compose ps

# View backend logs
make logs-backend

# Reset database
make down && make up
make migrate-up
```

### Frontend build fails
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Tests failing
```bash
# Update dependencies
pip install -r requirements.txt -r requirements-dev.txt
npm install

# Check database connection
docker-compose ps postgres

# Run with verbose output
pytest -vv --log-cli-level=DEBUG
```

### Pre-commit hooks failing
```bash
# Update hooks
pre-commit autoupdate

# Run manually to see errors
pre-commit run --all-files

# Skip hooks temporarily (not recommended)
git commit --no-verify
```

## Getting Help

- **Documentation**: `docs/` directory
- **API Docs**: https://api.workshelf.dev/api/docs
- **Issues**: GitHub Issues
- **Team Chat**: Matrix (coming soon)

## Additional Resources

- [Backend API Documentation](./docs/API.md)
- [Frontend Components](./docs/COMPONENTS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Best Practices](./docs/SECURITY.md)
