# Keycloak Setup Guide

## Quick Start for Local Development

### 1. Start Keycloak with Docker

```bash
docker-compose up -d
```

This starts Keycloak at http://localhost:8080

### 2. Initial Keycloak Configuration

**Access Keycloak Admin Console:**
- URL: http://localhost:8080
- Username: `admin`
- Password: `admin` (or check your docker-compose.yml)

### 3. Create Realm

1. Click "Create Realm" (or select realm dropdown)
2. Name: `workshelf`
3. Click "Create"

### 4. Create Frontend Client

1. Go to "Clients" → "Create client"
2. Client ID: `workshelf-frontend`
3. Click "Next"
4. **Client authentication:** OFF (public client)
5. **Authorization:** OFF
6. **Authentication flow:** Check these:
   - ✅ Standard flow
   - ✅ Direct access grants
7. Click "Save"

**Configure Redirect URIs:**
1. Find the client you just created
2. Click "Settings" tab
3. **Valid redirect URIs:** Add both:
   - `http://localhost:5173/*`
   - `http://localhost:5173/callback`
4. **Valid post logout redirect URIs:** 
   - `http://localhost:5173/*`
5. **Web origins:** 
   - `http://localhost:5173`
6. Click "Save"

### 5. Create Backend Client

1. Go to "Clients" → "Create client"
2. Client ID: `workshelf-api`
3. Click "Next"
4. **Client authentication:** ON (confidential client)
5. **Authorization:** OFF
6. **Authentication flow:** Check:
   - ✅ Service accounts roles
   - ✅ Direct access grants
7. Click "Save"

**Get Client Secret:**
1. Go to "Credentials" tab
2. Copy the "Client secret"
3. Add to your `.env` file:
   ```bash
   KEYCLOAK_CLIENT_SECRET=<paste-secret-here>
   ```

### 6. Create Test User

1. Go to "Users" → "Add user"
2. Username: `testuser`
3. Email: `test@example.com`
4. Click "Create"

**Set Password:**
1. Go to "Credentials" tab
2. Click "Set password"
3. Password: `password` (for testing)
4. **Temporary:** OFF
5. Click "Save"

### 7. Test Environment Variables

Make sure your `.env` file has:

```bash
# Backend
KEYCLOAK_SERVER_URL=http://localhost:8080
KEYCLOAK_REALM=workshelf
KEYCLOAK_CLIENT_ID=workshelf-api
KEYCLOAK_CLIENT_SECRET=<your-secret-from-step-5>

# Frontend (Vite)
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=workshelf
VITE_KEYCLOAK_CLIENT_ID=workshelf-frontend
VITE_API_URL=http://localhost:8000
```

### 8. Start Development Servers

**Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 9. Test Authentication Flow

1. Open http://localhost:5173
2. Click "Sign In" or navigate to protected route
3. You should be redirected to Keycloak login
4. Login with: `testuser` / `password`
5. You should be redirected back to WorkShelf
6. Check browser console for auth logs

### Troubleshooting

**"Invalid redirect_uri":**
- Make sure you added `http://localhost:5173/callback` to Valid redirect URIs in Keycloak client settings

**"Invalid client" or "Client authentication failed":**
- Backend: Check that `KEYCLOAK_CLIENT_SECRET` matches the secret in Keycloak
- Frontend: Make sure `workshelf-frontend` client has "Client authentication" set to OFF

**CORS errors:**
- Add `http://localhost:5173` to Web origins in Keycloak client settings

**Token exchange fails:**
- Check that both clients exist in Keycloak
- Verify realm name matches (`workshelf`)
- Check browser console and backend logs for detailed errors

**Backend can't validate tokens:**
- Ensure backend `KEYCLOAK_SERVER_URL` is accessible from backend container
- If using Docker, it should be `http://keycloak:8080` (internal Docker network)
- If running backend locally, use `http://localhost:8080`

### Advanced Configuration

**Add User Attributes:**
1. Go to Users → Select user
2. "Attributes" tab
3. Add custom attributes (e.g., `display_name`, `bio`)

**Setup Groups:**
1. Go to "Groups"
2. Create groups for roles (e.g., `staff`, `moderators`)
3. Add users to groups

**Configure Token Lifespans:**
1. Go to Realm Settings → Tokens
2. Adjust:
   - Access Token Lifespan: 5 minutes (default)
   - Refresh Token Lifespan: 30 minutes

## Production Deployment

For production (Azure Container Apps):

1. Use environment variables from Azure Key Vault
2. Update `KEYCLOAK_SERVER_URL` to production Keycloak URL
3. Update `VITE_KEYCLOAK_URL` in frontend build
4. Configure proper redirect URIs for production domain
5. Use strong client secrets (auto-generated)
6. Enable SSL/TLS
7. Configure rate limiting
8. Set up monitoring and logging

## Next Steps

After authentication is working:

- [ ] Implement role-based access control (RBAC)
- [ ] Add user profile sync from Keycloak to database
- [ ] Configure email verification
- [ ] Set up password reset flow
- [ ] Add social login providers (Google, GitHub, etc.)
- [ ] Implement fine-grained permissions
