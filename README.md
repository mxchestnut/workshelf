# Work Shelf

> Social infrastructure platform for writers, thinkers, and creators

[![Phase 0](https://img.shields.io/badge/Phase-0%20Infrastructure-blue)](Kit's%20Notes/Phase%200)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Work Shelf is a revolutionary platform transforming the creative process through a comprehensive ecosystem for writers and creators. It provides a seamless environment for the entire creative lifecycle—from inspiration and drafting through collaboration and feedback to publication and community building.

## 🎯 Current Status: Phase 0 - Core Infrastructure

Building the foundation that everything else attaches to:

- ✅ FastAPI backend with health checks
- ✅ React + Vite frontend
- ✅ Docker Compose for local development
- ✅ Azure deployment ready (Bicep IaC)
- 🔲 Database schema with multi-tenancy
- 🔲 Keycloak authentication integration
- 🔲 Document model & storage
- 🔲 RBAC system

See [`Kit's Notes/Phase 0`](Kit's%20Notes/Phase%200) for detailed roadmap.

## 🏗️ Architecture

```
work-shelf/
├── backend/          FastAPI + PostgreSQL + SQLAlchemy
├── frontend/         React + Vite + Tailwind + shadcn/ui
├── infrastructure/   Azure Bicep templates
├── docker/          Docker Compose for local dev
└── docs/            Documentation
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)
- Azure CLI (for deployment)

### Local Development with Docker

```bash
# Start all services (backend, frontend, database, Keycloak, MinIO)
make up

# View logs
make logs

# Stop services
make down
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **Keycloak**: http://localhost:8080 (admin/admin)
- **MinIO**: http://localhost:9001 (minioadmin/minioadmin)

### Local Development without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📦 Deployment to Azure

**Minimal cost deployment (~$12-17/month):**

```bash
cd infrastructure/bicep

# Deploy infrastructure
az deployment sub create \
  --location centralus \
  --template-file main.bicep \
  --parameters environment=dev \
               resourceGroupName=workshelf-dev-rg \
               postgresAdminPassword='YOUR_STRONG_PASSWORD'

# Build and deploy containers
# (See infrastructure/README-deploy.md for complete guide)
```

For even cheaper (~$5-10/month), use external database (Neon/Supabase free tier).

See [infrastructure/README-deploy.md](infrastructure/README-deploy.md) for complete deployment guide.

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests (when added)
cd frontend
npm test
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Robust relational database with RLS for multi-tenancy
- **SQLAlchemy** - ORM with async support
- **Keycloak** - Enterprise authentication & authorization
- **Azure Blob Storage** - Document and file storage

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Icon library

### Infrastructure
- **Azure Container Apps** - Serverless containers
- **Azure Database for PostgreSQL** - Managed database
- **Azure Blob Storage** - Object storage
- **Docker** - Containerization
- **Bicep** - Infrastructure as Code

## 📖 Project Vision

Work Shelf aims to provide:

1. **Professional-Grade Creation Tools** - Exceptional writing experience
2. **Collaborative Beta Reading** - Social feedback and community engagement
3. **Premium Reading Experience** - Immersive, accessible reading
4. **Multi-Tenant Studios** - Customizable branded spaces
5. **Comprehensive Social Framework** - Following, feeds, groups, messaging
6. **Ethical Foundation** - Privacy, accessibility, fair monetization

See [`Kit's Notes/Start.md`](Kit's%20Notes/Start.md) for complete vision and roadmap.

## 🤝 Contributing

This project is in early development (Phase 0). Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

### Phase 0: Core Infrastructure (Current)
- Multi-tenant database schema
- Authentication & authorization
- Basic API & admin interface

### Phase 1: Document Foundation
- Text editor integration
- Version control
- Basic collaboration features

### Phase 2: Social Infrastructure
- User profiles & following
- Feed system
- Beta reading workflow

See [`Kit's Notes/Start.md`](Kit's%20Notes/Start.md) for complete roadmap.

## 📞 Support

For questions or issues, please open a GitHub issue.

---

**Built with ❤️ for creators, by creators**
