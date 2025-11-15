# Matrix Messaging Integration - Quick Start

## 📋 What You Got

**Complete messaging system using Matrix protocol:**
- ✅ 4 Frontend components (637 lines)
- ✅ Backend API (317 lines)
- ✅ Docker setup for self-hosted server
- ✅ Database migration
- ✅ Setup scripts
- ✅ Full documentation

## 🚀 Setup on Your Server

### 1. Run Setup Script
```bash
cd /path/to/work-shelf
bash scripts/setup-matrix-server.sh
```

This will:
- Generate secure passwords
- Create Docker configuration
- Start Matrix Synapse server
- Save secrets to `SECRETS.txt`

### 2. Configure DNS
Add DNS record for subdomain:
```
Type: A
Name: matrix.workshelf.dev
Value: Your Server IP
TTL: 3600
```

### 3. Get SSL Certificate
```bash
sudo certbot certonly --standalone -d matrix.workshelf.dev
```

### 4. Configure Nginx
Copy configuration from `docs/MATRIX_SERVER_SETUP.md` to:
```bash
sudo nano /etc/nginx/sites-available/matrix.workshelf.dev
sudo ln -s /etc/nginx/sites-available/matrix.workshelf.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Update Backend Environment
Add to `backend/.env`:
```bash
MATRIX_HOMESERVER=https://matrix.workshelf.dev
MATRIX_REGISTRATION_SHARED_SECRET=<from SECRETS.txt>
```

### 6. Run Database Migration
```bash
cd backend
alembic upgrade head
```

### 7. Install Frontend Dependencies
```bash
cd frontend
npm install matrix-js-sdk
```

### 8. Register Matrix Router (Backend)
Add to `backend/app/main.py`:
```python
from app.api import matrix

app.include_router(matrix.router, prefix="/api/v1")
```

### 9. Integrate Frontend Components
Update `frontend/src/App.tsx`:
```typescript
import { MatrixProvider } from './hooks/useMatrixClient'
import ChatManager from './components/ChatManager'
import Messages from './pages/Messages'

function App() {
  return (
    <MatrixProvider>
      {/* Your existing app */}
      <Routes>
        {/* Add Messages route */}
        <Route path="/messages" element={<Messages />} />
        {/* ... other routes */}
      </Routes>
      
      {/* Chat popups float over everything */}
      <ChatManager />
    </MatrixProvider>
  )
}
```

### 10. Test It!
```bash
# Test Matrix server
curl https://matrix.workshelf.dev/_matrix/client/versions

# Should return:
# {"versions":["r0.0.1","r0.1.0",...]}
```

## 🎯 How Users Will Experience It

1. User logs into Work Shelf → Matrix account auto-created
2. User clicks another user's profile → "Send Message" button
3. Popup chat window opens (Facebook-style)
4. Messages sync with Element app if they use it
5. Full inbox at `/messages` route

## 📱 Optional: Element App Integration

Users can access their messages in Element desktop/mobile apps:
1. Download Element: https://element.io/download
2. Login with:
   - Homeserver: `https://matrix.workshelf.dev`
   - Username: `@workshelf_user_{their_id}:matrix.workshelf.dev`
   - Password: (stored securely, auto-login via web)

## 🔐 Security Notes

- Matrix passwords are 32-char random strings, never seen by users
- Access tokens stored encrypted in database (recommended)
- All messages end-to-end encrypted by default
- Self-hosted = you control the data
- Registration shared secret keeps server private

## 📊 Estimated Costs

- **VPS**: $10-20/month (2-4GB RAM)
- **Domain**: Already have workshelf.dev
- **SSL**: Free (Let's Encrypt)
- **Bandwidth**: Included

## 🐛 Troubleshooting

### Can't connect to Matrix server
```bash
# Check if running
docker-compose ps

# View logs
docker-compose logs -f synapse

# Restart if needed
docker-compose restart
```

### SSL issues
```bash
# Renew certificate
sudo certbot renew

# Test Nginx config
sudo nginx -t
```

### Database issues
```bash
# Check Postgres
docker exec -it workshelf-matrix-db psql -U synapse_user -d synapse

# View tables
\dt
```

## 📚 Full Documentation

- **Setup Guide**: `docs/MATRIX_SERVER_SETUP.md`
- **Docker Config**: `docker/matrix-synapse/docker-compose.yml`
- **Backend API**: `backend/app/api/matrix.py`
- **Frontend Hook**: `frontend/src/hooks/useMatrixClient.ts`
- **Components**: `frontend/src/components/Chat*.tsx`

## ⏱️ Timeline

- **Server Setup**: 1-2 hours
- **Frontend Integration**: 2-3 hours
- **Testing**: 1 hour
- **Total**: 1 day vs 1-2 weeks for custom build

## ✅ Launch Checklist

- [ ] Matrix server running on matrix.workshelf.dev
- [ ] SSL certificate configured
- [ ] DNS records set
- [ ] Backend .env updated with secrets
- [ ] Database migration run
- [ ] Frontend integrated (MatrixProvider + ChatManager)
- [ ] Messages route added to router
- [ ] Tested user registration
- [ ] Tested sending messages
- [ ] Tested Element app sync (optional)

---

**Need Help?** Check the full docs or the Matrix community:
- Matrix Spec: https://spec.matrix.org/
- Synapse Docs: https://matrix-org.github.io/synapse/latest/
- Element Support: https://element.io/help
