.PHONY: help build up down logs test clean deploy

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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
