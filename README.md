# NPC (Nerdchurch Partners Corporation)

A minimal, beautiful writing and collaboration platform with:
- 📝 **Tiptap 3.x** rich text editor
- 💬 **Matrix chat** for real-time messaging  
- 📰 **Feed** for content discovery
- 🔐 **Keycloak** authentication
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
cd npc
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
- Matrix Synapse (8008)
- MinIO (9000, 9001)
- Redis (6379)
- Backend API (8000)
- Frontend (5173)

### 3. Initialize Keycloak

**First time only:**

1. Visit http://localhost:8080
2. Login with npc-kit / admin
3. Create realm: npc
4. Create client: npc-api (confidential)
5. Create client: npc-frontend (public)
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
