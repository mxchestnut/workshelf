# Microsoft Entra ID (Azure AD) Integration Guide

## What Changed?

Azure AD B2C was phased out in May 2025. We're using **Microsoft Entra ID App Registration** instead, which is the current, fully-supported Microsoft authentication platform.

**Important:** This is NOT the deprecated Azure AD B2C. This is the standard Microsoft Entra ID (formerly Azure AD) with App Registration - fully supported and recommended by Microsoft.

## Your Azure AD Configuration

- **App Name:** WorkShelf
- **Client ID:** `44e80fc4-db05-4e6b-8732-7779311cb2c3`
- **Tenant ID:** `05b0173d-5c39-4799-889a-d522d3cbf86d`
- **Client Secret:** (stored in Azure Key Vault - see deploy/.env on VM)
- **Redirect URI:** `https://workshelf.dev/auth/callback`

## What's Been Implemented

### ✅ Frontend Changes

1. **MSAL Packages Added** ([frontend/package.json](frontend/package.json))
   - `@azure/msal-browser@^3.30.0`
   - `@azure/msal-react@^2.1.2`

2. **MSAL Configuration** ([frontend/src/config/authConfig.ts](frontend/src/config/authConfig.ts))
   - Contains your Azure AD client ID and tenant ID
   - Configured for popup-based login (can switch to redirect if needed)

3. **Auth Context** ([frontend/src/contexts/AuthContext.tsx](frontend/src/contexts/AuthContext.tsx))
   - `AuthProvider` wraps your app
   - Provides `useAuth()` hook with `login()`, `logout()`, `getAccessToken()`

4. **App Integration** ([frontend/src/main.tsx](frontend/src/main.tsx) + [frontend/src/App.tsx](frontend/src/App.tsx))
   - App wrapped with `MsalProvider` and `AuthProvider`
   - `ProtectedRoute` updated to use MSAL authentication state

5. **API Client** ([frontend/src/lib/apiClient.ts](frontend/src/lib/apiClient.ts))
   - New API client that automatically adds MSAL access tokens to requests

### ✅ Backend Changes

1. **Python Packages Added** ([backend/requirements.txt](backend/requirements.txt))
   - `msal==1.31.1` - Microsoft Authentication Library
   - `PyJWT==2.8.0` - JWT token verification

2. **Entra ID Auth Module** ([backend/app/core/azure_auth.py](backend/app/core/azure_auth.py))
   - `EntraIDAuth` class validates Microsoft Entra ID tokens
   - `get_current_user()` dependency for protected endpoints
   - Automatically creates/updates users in database

3. **User Model Updated** ([backend/app/models/user.py](backend/app/models/user.py))
   - Added `azure_object_id` column for Microsoft user IDs
   - Made `keycloak_id` nullable (for migration compatibility)

4. **Database Migration** ([backend/alembic/versions/2025_12_18_1300_add_azure_object_id_to_users.py](backend/alembic/versions/2025_12_18_1300_add_azure_object_id_to_users.py))
   - Adds `azure_object_id` column to users table
   - Makes `keycloak_id` nullable

## Deployment Steps

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Update Environment Variables

On Azure VM, update `/home/azureuser/workshelf/deploy/.env`:

```bash
# These should already be set:
AZURE_TENANT=05b0173d-5c39-4799-889a-d522d3cbf86d
AZURE_CLIENT_ID=44e80fc4-db05-4e6b-8732-7779311cb2c3
AZURE_CLIENT_SECRET=(your client secret - already set on VM)
```

### 3. Run Database Migration

SSH into Azure VM:

```bash
ssh azureuser@172.190.159.85
cd workshelf/deploy
docker compose exec backend alembic upgrade head
```

### 4. Update API Endpoints to Use Azure Auth

You'll need to update your FastAPI endpoints to use the new auth dependency. Example:

**Before (Keycloak):**
```python
from app.core.auth import get_current_user as get_current_user_keycloak

@router.get("/api/v1/me")
async def get_me(current_user: User = Depends(get_current_user_keycloak)):
    return current_user
```

**After (Microsoft Entra ID):**
```python
from app.core.azure_auth import get_current_user

@router.get("/api/v1/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

### 5. Update Frontend Pages to Use New Auth

Update pages that use the old `authService` to use the new `useAuth` hook:

**Before:**
```typescript
import { authService } from './services/auth'

const isAuthenticated = authService.isAuthenticated()
```

**After:**
```typescript
import { useAuth } from './contexts/AuthContext'

function MyComponent() {
  const { isAuthenticated, login, logout } = useAuth()
  // Use isAuthenticated, login(), logout()
}
```

### 6. Rebuild and Redeploy

```bash
# On your local machine
git add .
git commit -m "Integrate Microsoft Entra ID authentication"
git push origin main

# On Azure VM
ssh azureuser@172.190.159.85
cd workshelf
git pull origin main
cd deploy
docker compose down backend frontend
docker compose build --no-cache backend frontend
docker compose up -d
```

### 7. Add Subdomain DNS Records

Add these A records pointing to `172.190.159.85`:
- `www.workshelf.dev`
- `api.workshelf.dev`

Then get SSL certificates:

```bash
ssh azureuser@172.190.159.85
sudo certbot --nginx -d www.workshelf.dev -d api.workshelf.dev --non-interactive --agree-tos --email mxchestnut@gmail.com
```

## Testing the Integration

### Test Login Flow

1. Visit https://workshelf.dev
2. Click "Sign In" button
3. You should see a Microsoft login popup
4. Sign in with your Microsoft account
5. After successful login, you should be redirected back to the app

### Test API Calls

Open browser console and run:

```javascript
// Get the MSAL token
const token = await window.msal.acquireTokenSilent({...}).then(r => r.accessToken)

// Test API call
fetch('https://api.workshelf.dev/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json()).then(console.log)
```

## Common Issues

### Issue: "Token missing 'sub' claim"
**Solution:** The token needs to include the `sub` (subject) claim. Make sure your Azure AD app has the correct API permissions.

### Issue: "Invalid audience"
**Solution:** The token's `aud` claim must match your client ID. Check that the frontend is using the correct client ID.

### Issue: "401 Unauthorized"
**Solution:** The backend can't validate the token. Check:
- Backend has correct `AZURE_TENANT` and `AZURE_CLIENT_ID` in `.env`
- Backend can reach `https://login.microsoftonline.com`
- Token hasn't expired (tokens expire after 1 hour)

### Issue: Login popup blocked
**Solution:** Browser is blocking popups. Either:
- Allow popups for your site
- Switch to redirect mode by changing `loginPopup` to `loginRedirect` in the frontend code

## Migration from Keycloak

The system supports both Keycloak and Microsoft Entra ID during the transition:

- Users with `keycloak_id` will continue to work
- New users will get `azure_object_id`
- Users can be matched by email during migration

To fully remove Keycloak:

1. Ensure all active users have logged in with Microsoft Entra ID
2. Verify all users have `azure_object_id` populated
3. Remove Keycloak container from `docker-compose.prod.yml` (already done)
4. Delete old Keycloak auth code from `backend/app/core/auth.py`

## Additional Resources

- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [MSAL.js Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [MSAL Python Documentation](https://github.com/AzureAD/microsoft-authentication-library-for-python)
- [Azure Portal - App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
