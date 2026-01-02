# Local Development Guide

This guide covers running WorkShelf locally for development without Docker or Keycloak complexity.

## Quick Start

### For Studio + Groups Development

Run this single command to start both frontend and backend with mock authentication:

```bash
./start-studio-local.sh
```

This will:
- Set up mock authentication (no Keycloak needed)
- Start backend API on http://localhost:8000
- Start frontend on http://localhost:5173
- Auto-authenticate you as `dev@local.test`

### Available Features

When running `start-studio-local.sh`, you get access to:

✅ **Studio (Writing Workspace)**
- Document creation and editing
- Projects and folders
- Full writing environment

✅ **Groups (Community & Collaboration)**
- Create and join groups
- Group discussions and posts
- Member management
- All group features

✅ **All Other Features**
- User profiles
- Collections
- Reading lists
- Vault
- And more...

## How It Works

### Mock Authentication

The local environment uses `MOCK_AUTH=true` which bypasses Keycloak:
- You're automatically logged in as `dev@local.test`
- No need to set up Keycloak locally
- All API endpoints work normally
- Mock user has full access

### Database Connection

The backend connects to the **production database** in read/write mode:
- Changes you make are **REAL** and affect production
- Use test data or a development account
- Be careful when testing destructive operations

### Environment Setup

The startup script automatically creates:

**Backend** (`backend/.env.local`):
```env
MOCK_AUTH=true
DATABASE_URL=postgresql://...  # Production database
KEYCLOAK_SERVER_URL=https://keycloak.workshelf.dev
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-backend
```

**Frontend** (`frontend/.env.local`):
```env
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=https://keycloak.workshelf.dev
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_MOCK_AUTH=true
```

## Recent Changes

### Groups Functionality (Jan 2, 2026)

Added ConfigDict import to `backend/app/api/group_admin.py` to fix Pydantic v2 compatibility.

Updated `start-studio-local.sh` to:
- Clearly indicate groups functionality is available
- Show which features work in local development
- Display the mock user information

## Requirements

- Python 3.10+ (tested with 3.14.2)
- Node.js and npm
- Internet connection (for database access)

## Troubleshooting

### Backend won't start

1. Check Python version: `python3 --version` (should be 3.10+)
2. Recreate venv:
   ```bash
   cd backend
   rm -rf .venv
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

### Frontend won't start

1. Reinstall dependencies:
   ```bash
   cd frontend
   rm -rf node_modules
   npm install
   ```

### "Redis unavailable" warning

This is expected and safe to ignore. The backend falls back to in-memory rate limiting.

### Database connection errors

Check that you have the correct DATABASE_URL in `backend/.env.local`. This should be the production database connection string.

## Other Local Development Scripts

- `start-local.sh` - Full Docker setup with Keycloak
- `start-frontend-only.sh` - Frontend only (expects backend running separately)
- `start-studio-local.sh` - **Recommended** for quick development

## Next Steps

1. Open http://localhost:5173 in your browser
2. Navigate to any feature (Studio, Groups, etc.)
3. You're automatically authenticated - start developing!

## Production Deployment

This local setup is for development only. Production uses:
- Real Keycloak authentication
- Azure Container Apps
- Neon PostgreSQL database
- Full Docker setup

See `deploy-prod.sh` for production deployment.
