# WorkShelf

A minimal, beautiful writing and collaboration platform with:
- 📝 **Tiptap 3.x** rich text editor
- 📰 **Feed** for content discovery
- 🔐 **Keycloak** authentication (OAuth2 PKCE flow)
- 📚 **Vault** for book tracking and reading lists
- 🛒 **Store** for publishing and selling ebooks
- 🎨 **Black & white design** with monospace fonts

Built with Python (FastAPI) + React + TypeScript.

---

## 🚀 Quick Start (M1/M2 Mac Compatible)

### Prerequisites
- Docker Desktop for Mac (with Apple Silicon support)
- Node.js 18+ (ARM64 version)
- Python 3.11+

### 1. Clone and Setup

```bash
git clone https://github.com/mxchestnut/workshelf.git
cd workshelf
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 2. Start Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (5432)
- Keycloak (8080)
- MinIO (9000, 9001)
- Redis (6379)
- Backend API (8000)
- Frontend (5173)

### 3. Initialize Keycloak

**First time only:** Follow the comprehensive setup guide in [docs/KEYCLOAK_SETUP.md](docs/KEYCLOAK_SETUP.md)

Quick summary:
1. Visit http://localhost:8080
2. Login with admin / admin
3. Create realm: `workshelf`
4. Create clients: `workshelf-api` (confidential) and `workshelf-frontend` (public)
5. Configure redirect URIs and get client secret
6. Update `.env` with client secret

### 4. Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Keycloak:** http://localhost:8080
- **MinIO Console:** http://localhost:9001 (minioadmin / minioadmin)

---

## 📚 Documentation

- **[Keycloak Setup](docs/KEYCLOAK_SETUP.md)** - Complete authentication setup guide
- **[S3 Storage](docs/S3_STORAGE_DEPLOYMENT.md)** - Document storage configuration (MinIO/S3/R2)
- **[Database Safety](docs/DATABASE_SAFETY.md)** - Database migration and backup procedures
- **[TODO List](docs/TODO.md)** - Current development priorities

---

## 🛠️ Technology Stack

**Backend:**
- FastAPI (Python 3.11+)
- PostgreSQL + SQLAlchemy (async)
- Keycloak (OAuth2/OIDC)
- S3-compatible storage (MinIO/AWS S3/Cloudflare R2)
- Stripe for payments
- Claude AI for writing assistance

**Frontend:**
- React + TypeScript
- Vite
- TipTap 3.x editor
- Tailwind CSS
- Keycloak.js (PKCE flow)

---

## 🔧 Development

```bash
# Start backend only
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload

# Start frontend only
cd frontend
npm install
npm run dev
```

---

## 📝 License

MIT
6. Create a test user

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Keycloak**: http://localhost:8080

---

## 🚢 Deployment (AWS Lightsail)

See deployment guide in docs/ folder.

---

**Built with ❤️ and a love for simplicity**
