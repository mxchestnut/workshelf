# Work Shelf - Local Development Guide

## 🚀 Quick Start

### Start Local Environment
```bash
./start-local.sh
```
This starts:
- **Backend** on http://localhost:8000 (with hot reload)
- **Frontend** on http://localhost:5173 (with hot reload)
- **API Docs** on http://localhost:8000/docs

### Stop Local Environment
```bash
./stop-local.sh
```

## 🧪 Testing Before Deploy

### Run All Tests Locally
```bash
./local-test.sh
```
This runs:
- Frontend linting
- Frontend type checking
- Backend syntax validation

**Always run this before deploying to production!**

## 🌐 Deploy to Production

### Option 1: Deploy with Tests (Recommended)
```bash
./deploy-to-prod.sh "Your commit message"
```
This will:
1. Run all local tests
2. Commit and push changes
3. Wait for GitHub Actions
4. Confirm deployment

### Option 2: Manual Deploy
```bash
./local-test.sh           # Test first
git add -A
git commit -m "message"
git push origin main
```

## 📝 Development Workflow

### The Right Way (New Process)
```bash
# 1. Start local environment
./start-local.sh

# 2. Make your changes
# Edit files in frontend/src or backend/app

# 3. Test locally (browser at localhost:5173)
# Changes auto-reload thanks to hot reload

# 4. When ready, test everything
./local-test.sh

# 5. Deploy to production
./deploy-to-prod.sh "Add new feature"

# 6. Stop local when done
./stop-local.sh
```

### The Old Way (Don't Do This)
```bash
# ❌ Make changes
# ❌ Commit immediately
# ❌ Push to production
# ❌ Find out it broke via CI
```

## 🔧 Environment Files

Local environment uses:
- `frontend/.env.local` (points to localhost:8000)
- `backend/.env.local` (uses production database)

These are **auto-created** by `start-local.sh` and are **git-ignored**.

## 💡 Tips

1. **Always work locally first** - see changes instantly
2. **Run ./local-test.sh** before every deploy
3. **Use ./deploy-to-prod.sh** to deploy safely
4. **Check localhost:5173** to verify changes work
5. **Backend logs** show in terminal when running locally

## 🐛 Troubleshooting

### Port already in use
```bash
./stop-local.sh
# or
lsof -ti:8000 | xargs kill
lsof -ti:5173 | xargs kill
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
./start-local.sh
```

### Backend errors
```bash
cd backend
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
./start-local.sh
```

## 📊 Useful Commands

```bash
# Check what's running locally
lsof -ti:8000,5173

# View backend logs
tail -f backend/logs/*.log

# Check CI status
gh run list --limit 5

# View latest CI run
gh run view --log
```
