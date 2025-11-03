# Work Shelf Backend

FastAPI-based backend for the Work Shelf platform.

## Features

- 🚀 FastAPI with async support
- 🔐 Keycloak integration for authentication
- 🗄️ PostgreSQL with SQLAlchemy ORM
- 🐳 Docker-ready
- ✅ Pytest for testing
- 🔄 Multi-tenant architecture

## Local Development

### Prerequisites

- Python 3.11+
- PostgreSQL (or use Docker Compose)

### Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On macOS/Linux
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run the server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Access the API:
- API: http://localhost:8000
- Docs: http://localhost:8000/api/docs
- Health: http://localhost:8000/health

## Testing

```bash
pytest
```

## Docker

Build and run:
```bash
docker build -t workshelf-backend .
docker run -p 8000:8000 workshelf-backend
```

## Project Structure

```
backend/
├── app/
│   ├── api/          # API routes
│   ├── core/         # Config, security
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   └── main.py       # App entry point
├── tests/            # Test files
└── requirements.txt
```

## Next Steps for Phase 0

1. ✅ Basic API structure
2. 🔲 Database schema with multi-tenancy
3. 🔲 Keycloak integration
4. 🔲 Document CRUD endpoints
5. 🔲 RBAC system
