.PHONY: help build up down logs test clean deploy env setup-dev migrate-create migrate-up migrate-status matrix-upload-config matrix-rotate-secret matrix-bootstrap-admin matrix-store-admin-token matrix-promote-admin

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Setup & Environment
env: ## Copy .env.example to .env for local development
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env from .env.example"; \
		echo "⚠️  Edit .env with your actual credentials"; \
	else \
		echo "⚠️  .env already exists (not overwriting)"; \
	fi

setup-dev: env install-backend install-frontend ## Complete dev environment setup
	@echo "🚀 Setting up development environment..."
	@echo "✅ Development environment ready!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Edit .env with your credentials"
	@echo "  2. Run 'make up' to start all services"
	@echo "  3. Run 'make migrate-up' to apply database migrations"

# Docker Compose
build: ## Build all Docker containers
	cd docker && docker-compose build

up: ## Start all services
	cd docker && docker-compose up -d
	@echo "✅ Services started!"
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@echo "Keycloak: http://localhost:8080 (admin/admin)"
	@echo "MinIO:    http://localhost:9001 (minioadmin/minioadmin)"

down: ## Stop all services
	cd docker && docker-compose down

logs: ## View logs from all services
	cd docker && docker-compose logs -f

logs-backend: ## View backend logs
	cd docker && docker-compose logs -f backend

logs-frontend: ## View frontend logs
	cd docker && docker-compose logs -f frontend

test: ## Run backend tests
	cd backend && pytest

test-watch: ## Run backend tests in watch mode
	cd backend && pytest-watch

clean: ## Stop services and remove volumes
	cd docker && docker-compose down -v
	@echo "✅ All services stopped and volumes removed"

restart: down up ## Restart all services

ps: ## Show running containers
	cd docker && docker-compose ps

deploy: ## Placeholder for Azure deployment
	@echo "🚀 Deploying to Azure..."
	@echo "See infrastructure/README-deploy.md for deployment instructions"

# Matrix Synapse helpers
matrix-upload-config: ## Render and upload Synapse homeserver.yaml to EFS via one-time ECS task
	bash scripts/upload-matrix-config.sh

matrix-rotate-secret: ## Rotate Matrix registration secret in AWS Secrets Manager (optional VALUE=...)
	@if ! command -v aws >/dev/null 2>&1; then \
		echo "❌ AWS CLI not found. Install and configure it first."; \
		exit 1; \
	fi
	@SECRET_NAME=$${MATRIX_REGISTRATION_SECRET_NAME:-workshelf/matrix-registration-secret}; \
	if [ -z "$(VALUE)" ]; then \
		NEW=$$(openssl rand -base64 48 | tr -d '\n'); \
		echo "🔐 Generated new secret (random)"; \
	else \
		NEW="$(VALUE)"; \
		echo "🔐 Using provided VALUE for new secret"; \
	fi; \
	echo "➡️  Updating secret '$$SECRET_NAME'..."; \
	aws secretsmanager put-secret-value --secret-id "$$SECRET_NAME" --secret-string "$$NEW" >/dev/null && echo "✅ Secret updated" || (echo "❌ Failed to update secret"; exit 1)

matrix-bootstrap-admin: ## Bootstrap a Synapse admin user and store access token in Secrets Manager
	python3 scripts/bootstrap_matrix_admin.py

matrix-store-admin-token: ## Login as an existing Synapse admin and store the access token in Secrets Manager
	@if [ -z "$(MATRIX_ADMIN_USERNAME)" ] || [ -z "$(MATRIX_ADMIN_PASSWORD)" ]; then \
		echo "❌ Set MATRIX_ADMIN_USERNAME and MATRIX_ADMIN_PASSWORD env vars"; \
		exit 1; \
	fi
	python3 scripts/store_matrix_admin_token.py

matrix-promote-admin: ## Promote an existing Matrix user to admin: make matrix-promote-admin USER=localpart [PASS=newPassword]
	@if [ -z "$(USER)" ]; then \
		echo "❌ Usage: make matrix-promote-admin USER=localpart [PASS=newPassword]"; \
		exit 1; \
	fi; \
	MATRIX_TARGET_USERNAME="$(USER)" MATRIX_TARGET_PASSWORD="$(PASS)" python3 scripts/promote_user_admin.py

dev-backend: ## Run backend locally (without Docker)
	cd backend && uvicorn app.main:app --reload

dev-frontend: ## Run frontend locally (without Docker)
	cd frontend && npm run dev

install-backend: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

# Database commands
db-migrate: ## Run database migrations
	cd docker && docker-compose exec backend alembic upgrade head

db-rollback: ## Rollback last migration
	cd docker && docker-compose exec backend alembic downgrade -1

db-seed: ## Seed database with test data
	cd docker && docker-compose exec backend python scripts/seed_data.py

db-reset: ## Reset database (WARNING: destroys all data)
	cd docker && docker-compose down -v
	cd docker && docker-compose up -d postgres
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@sleep 5
	cd docker && docker-compose up -d backend
	@sleep 3
	$(MAKE) db-migrate
	$(MAKE) db-seed
	@echo "✅ Database reset complete!"

db-shell: ## Open PostgreSQL shell
	cd docker && docker-compose exec postgres psql -U workshelf -d workshelf

db-logs: ## View database logs
	cd docker && docker-compose logs -f postgres

# Alembic Migration Commands
migrate-create: ## Create new migration: make migrate-create MSG="description"
	@if [ -z "$(MSG)" ]; then \
		echo "❌ Usage: make migrate-create MSG='description'"; \
		exit 1; \
	fi
	cd backend && python3 -m alembic revision -m "$(MSG)"
	@echo "✅ Created migration: $(MSG)"
	@echo "📝 Edit the file in backend/alembic/versions/ then run 'make migrate-up'"

migrate-up: ## Run pending migrations locally
	cd backend && python3 -m alembic upgrade head
	@echo "✅ Migrations applied"

migrate-status: ## Show current migration version
	cd backend && python3 -m alembic current

migrate-history: ## Show migration history
	cd backend && python3 -m alembic history --verbose

# Code Quality
lint: ## Run all linters
	@echo "🔍 Linting backend..."
	cd backend && ruff check app/ tests/
	cd backend && mypy app/ --ignore-missing-imports
	@echo "🔍 Linting frontend..."
	cd frontend && npm run lint
	@echo "✅ Linting complete!"

format: ## Format all code
	@echo "✨ Formatting backend..."
	cd backend && black app/ tests/
	cd backend && ruff check app/ tests/ --fix
	@echo "✨ Formatting frontend..."
	cd frontend && npx prettier --write src/
	@echo "✅ Formatting complete!"

pre-commit-setup: ## Install pre-commit hooks
	pip install pre-commit
	pre-commit install
	@echo "✅ Pre-commit hooks installed!"

pre-commit-run: ## Run pre-commit on all files
	pre-commit run --all-files

# Security
scan-secrets: ## Scan repository for secrets
	@echo "🔍 Scanning for secrets..."
	detect-secrets scan --baseline .secrets.baseline || detect-secrets scan > .secrets.baseline
	@echo "✅ Secret scan complete!"

# CI/CD
ci-test-backend: ## Run backend tests (CI-style)
	cd backend && pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=xml

ci-test-frontend: ## Run frontend tests (CI-style)
	cd frontend && npm test -- --coverage --watchAll=false

ci-all: lint ci-test-backend ci-test-frontend ## Run all CI checks locally

# AWS Deployment (Production)
deploy-backend-aws: ## Deploy backend to AWS ECS
	@echo "🚀 Deploying backend to AWS..."
	cd backend && docker build --platform linux/amd64 -t workshelf-backend:latest .
	aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 496675774501.dkr.ecr.us-east-1.amazonaws.com
	docker tag workshelf-backend:latest 496675774501.dkr.ecr.us-east-1.amazonaws.com/workshelf-backend:latest
	docker push 496675774501.dkr.ecr.us-east-1.amazonaws.com/workshelf-backend:latest
	aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment --region us-east-1
	@echo "✅ Backend deployment initiated! Check AWS console for status."

deploy-frontend-aws: ## Deploy frontend to S3/CloudFront
	@echo "🚀 Deploying frontend to AWS..."
	cd frontend && npm run build
	aws s3 sync frontend/dist/ s3://workshelf-frontend/ --delete --cache-control 'no-cache'
	aws cloudfront create-invalidation --distribution-id E1GLU4B1NET1IX --paths "/*"
	@echo "✅ Frontend deployed!"

deploy-aws: deploy-backend-aws deploy-frontend-aws ## Deploy both to AWS

# Logs (AWS)
logs-backend-aws: ## Tail backend logs from AWS
	aws logs tail /ecs/workshelf/backend --follow --format short

logs-events: ## Show CloudWatch Events
	aws logs tail /ecs/workshelf/backend --since 1h --format short | grep -i error

# Infrastructure
tf-plan: ## Preview Terraform changes
	cd infrastructure/terraform && terraform plan

tf-apply: ## Apply Terraform changes
	cd infrastructure/terraform && terraform apply

tf-destroy: ## Destroy Terraform infrastructure (DANGEROUS!)
	cd infrastructure/terraform && terraform destroy

