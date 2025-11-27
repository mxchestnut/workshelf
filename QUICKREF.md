# WorkShelf - Quick Reference

## 🚀 Getting Started

```bash
cd /Volumes/T7\ Shield/Code/workshelf/work-shelf
./setup-complete.sh
```

That's it! Everything will be configured automatically.

---

## 📍 URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:8000/docs | - |
| **Keycloak** | http://localhost:8080 | admin / admin |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |

---

## 👤 Test Account

- **Username:** testuser
- **Password:** password123

---

## 🛠️ Common Commands

### Start Everything
```bash
./start.sh
# or
docker-compose up -d
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f keycloak
```

### Restart Service
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Reset Everything
```bash
docker-compose down -v  # ⚠️ Deletes all data!
./setup-complete.sh
```

---

## 🔧 Development

### Backend (Python)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend (React)
```bash
cd frontend
npm run dev
```

### Database Migrations
```bash
cd backend
source venv/bin/activate

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

---

## 📁 Project Structure

```
work-shelf/
├── backend/              # Python FastAPI
│   ├── app/
│   │   ├── api/         # REST endpoints
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── main.py      # App entry
│   └── alembic/         # Migrations
│
├── frontend/            # React + Vite
│   └── src/
│       ├── components/  # UI components
│       │   ├── Editor.tsx        # Tiptap 3.x
│       │   ├── ChatManager.tsx   # Matrix chat
│       │   └── Navigation.tsx    # Header
│       ├── pages/       # Pages
│       │   ├── Home.tsx          # Landing
│       │   ├── BetaFeed.tsx      # Feed
│       │   └── ...
│       └── services/    # API clients
│
├── docker-compose.yml   # Services
├── start.sh            # Quick start
├── setup-keycloak.sh   # Keycloak config
└── setup-complete.sh   # Full setup
```

---

## 🎨 Design System

### Colors
- **Background:** `#FFFFFF` (white)
- **Text:** `#000000` (black)
- **Border:** `#E5E5E5` (gray-90)
- **Muted:** `#F2F2F2` (gray-95)

### Fonts
- **Primary:** JetBrains Mono
- **Fallback:** Fira Code, Monaco, Courier New

### Style
- No rounded corners
- No shadows
- No gradients
- Monospace everything
- Brutalist aesthetic

---

## 🐛 Troubleshooting

### Keycloak won't start
```bash
docker-compose logs keycloak
docker-compose restart keycloak
```

### Backend connection errors
```bash
# Check if backend is running
curl http://localhost:8000/health

# View logs
docker-compose logs backend
```

### Frontend build errors
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Database errors
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

### Port already in use
```bash
# Find process using port
lsof -ti:8080  # or 5173, 8000, etc.

# Kill process
kill -9 <PID>
```

---

## 💰 AWS Lightsail Deployment

### Recommended: $5/month Instance

1. Create Lightsail instance (1 GB RAM)
2. Install Docker & Docker Compose
3. Copy project files
4. Update `.env` with production values
5. Run `docker-compose up -d`

### External Services (Free)
- **Database:** Neon Postgres (free tier)
- **Chat:** Matrix.org (free homeserver)
- **Storage:** Cloudflare R2 (free 10 GB)

**Total: $5/month** ✅

---

## 📚 Documentation

- API Docs: http://localhost:8000/docs
- Keycloak Admin: http://localhost:8080
- README.md: Full documentation
- CONSOLIDATION_COMPLETE.md: Project summary

---

## 🎯 Key Features

- ✅ Tiptap 3.x rich text editor
- ✅ Matrix chat (real-time messaging)
- ✅ Content feed (discovery & sharing)
- ✅ Keycloak auth (SSO ready)
- ✅ Black & white design
- ✅ Monospace fonts
- ✅ M1/M2 Mac compatible
- ✅ One-command setup

---

## 📞 Support

If something doesn't work:

1. Check logs: `docker-compose logs -f`
2. Restart services: `docker-compose restart`
3. Reset everything: `docker-compose down -v && ./setup-complete.sh`

---

**Built with ❤️ and simplicity**
