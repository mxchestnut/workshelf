# Keycloak → Azure AD B2C Migration Guide

## Decision Summary
**Switching from Keycloak to Azure AD B2C**

### Benefits
- ✅ **Frees 498MB RAM** (entire Keycloak container eliminated)
- ✅ **No more schema rebuilds** - managed service handles updates
- ✅ **Microsoft enterprise security** (SOC 2, ISO 27001, HIPAA)
- ✅ **Free tier**: Up to 50,000 monthly active users
- ✅ **Built-in features**: MFA, social logins, custom branding
- ✅ **99.9% uptime SLA** - no more OOM crashes

### Migration Effort
- **Time**: 3-4 hours
- **Complexity**: Moderate (code changes in frontend + backend)
- **Timing**: Perfect - doing it now with few users vs later with thousands

---

## Phase 1: Azure AD B2C Setup (30 minutes)

### 1.1 Create Azure AD B2C Tenant
```bash
# In Azure Portal
1. Search "Azure AD B2C"
2. Click "Create Azure AD B2C Tenant"
3. Configuration:
   - Organization name: WorkShelf
   - Initial domain: workshelf.onmicrosoft.com
   - Location: United States
   - Pricing: Free tier (50k MAU)
```

### 1.2 Register Application
```bash
# In your new B2C tenant
1. Go to "App registrations" → "New registration"
2. Settings:
   - Name: WorkShelf Web App
   - Supported account types: Accounts in this organizational directory only
   - Redirect URI: https://workshelf.dev/auth/callback
   
3. After creation, note:
   - Application (client) ID: [save this]
   - Directory (tenant) ID: [save this]

4. Under "Certificates & secrets":
   - New client secret → Description: "WorkShelf Backend"
   - Expires: 24 months
   - Copy secret value immediately (only shown once)

5. Under "API permissions":
   - Add Microsoft Graph permissions:
     - User.Read
     - openid
     - profile
     - email
```

### 1.3 Create User Flows
```bash
# Sign up and sign in flow
1. Go to "User flows" → "New user flow"
2. Select: "Sign up and sign in"
3. Configuration:
   - Name: signupsignin1
   - Local accounts: Email signup
   - MFA: Optional (enabled but not required)
   
4. User attributes to collect:
   - Email Address (required)
   - Display Name (required)
   - Given Name (optional)
   - Surname (optional)
   
5. Application claims (returned in token):
   - Email Addresses
   - Display Name
   - Given Name
   - Surname
   - User's Object ID
```

---

## Phase 2: Frontend Migration (1.5 hours)

### 2.1 Install MSAL Library
```bash
cd frontend
npm install @azure/msal-browser
```

### 2.2 Create MSAL Configuration
**File**: `frontend/src/config/msal.config.ts`
```typescript
import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://${import.meta.env.VITE_AZURE_TENANT}.b2clogin.com/${import.meta.env.VITE_AZURE_TENANT}.onmicrosoft.com/B2C_1_signupsignin1`,
    knownAuthorities: [`${import.meta.env.VITE_AZURE_TENANT}.b2clogin.com`],
    redirectUri: window.location.origin + '/auth/callback',
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
};
```

### 2.3 Create Auth Context
**File**: `frontend/src/contexts/MsalAuthContext.tsx`
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/msal.config';

interface AuthContextType {
  account: AccountInfo | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const msalInstance = new PublicClientApplication(msalConfig);

export const MsalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<AccountInfo | null>(null);

  useEffect(() => {
    msalInstance.initialize().then(() => {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    });
  }, []);

  const login = async () => {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      setAccount(response.account);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    await msalInstance.logoutPopup();
    setAccount(null);
  };

  const getAccessToken = async () => {
    if (!account) return null;
    
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (error) {
      // Token expired, try interactive
      const response = await msalInstance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        account,
        isAuthenticated: !!account,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useMsalAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useMsalAuth must be used within MsalAuthProvider');
  }
  return context;
};
```

### 2.4 Update Environment Variables
**File**: `frontend/.env.production`
```bash
VITE_AZURE_CLIENT_ID=<your-client-id>
VITE_AZURE_TENANT=workshelf
```

### 2.5 Update API Client
**File**: `frontend/src/services/api.ts`
```typescript
// Replace Keycloak token logic with MSAL
import { useMsalAuth } from '../contexts/MsalAuthContext';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const auth = useMsalAuth();
  const token = await auth.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Phase 3: Backend Migration (1 hour)

### 3.1 Install Azure Identity Library
```bash
cd backend
pip install azure-identity msal
```

Update `requirements.txt`:
```
azure-identity==1.15.0
msal==1.26.0
```

### 3.2 Update Auth Dependency
**File**: `backend/app/core/auth.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from msal import ConfidentialClientApplication
import jwt
from jwt import PyJWKClient
import os

security = HTTPBearer()

# Azure AD B2C configuration
AZURE_TENANT = os.getenv("AZURE_TENANT", "workshelf")
AZURE_CLIENT_ID = os.getenv("AZURE_CLIENT_ID")
AZURE_POLICY = "B2C_1_signupsignin1"

# JWKS endpoint for token validation
JWKS_URL = f"https://{AZURE_TENANT}.b2clogin.com/{AZURE_TENANT}.onmicrosoft.com/{AZURE_POLICY}/discovery/v2.0/keys"
jwks_client = PyJWKClient(JWKS_URL)

async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)) -> dict:
    """
    Validate Azure AD B2C access token and return user info
    """
    token = credentials.credentials
    
    try:
        # Get signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and validate token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=AZURE_CLIENT_ID,
            issuer=f"https://{AZURE_TENANT}.b2clogin.com/{AZURE_TENANT}.onmicrosoft.com/v2.0/"
        )
        
        return {
            "id": payload.get("oid"),  # Object ID
            "email": payload.get("emails", [None])[0],
            "name": payload.get("name"),
            "given_name": payload.get("given_name"),
            "family_name": payload.get("family_name"),
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
```

### 3.3 Update Environment Variables
**File**: `deploy/.env`
```bash
# Remove Keycloak variables:
# KC_ADMIN=admin
# KC_ADMIN_PASSWORD=...
# KC_DB_URL=...
# KEYCLOAK_URL=...
# KEYCLOAK_REALM=...
# KEYCLOAK_CLIENT_ID=...
# KEYCLOAK_CLIENT_SECRET=...

# Add Azure AD B2C variables:
AZURE_TENANT=workshelf
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

### 3.4 Update User Profile Creation
**File**: `backend/app/services/user_service.py`
```python
async def get_or_create_user(azure_user: dict, db: Session):
    """
    Get or create user from Azure AD B2C token
    """
    user = db.query(User).filter(User.email == azure_user["email"]).first()
    
    if not user:
        user = User(
            id=azure_user["id"],  # Use Azure Object ID
            email=azure_user["email"],
            username=azure_user["email"].split("@")[0],  # Generate from email
            display_name=azure_user["name"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user
```

---

## Phase 4: Database Migration (30 minutes)

### 4.1 Update Users Table
```sql
-- No need to store hashed passwords anymore (Azure handles auth)
-- Users table can be simplified

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE users DROP COLUMN IF EXISTS keycloak_id;

-- Add Azure AD B2C identifier
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_object_id VARCHAR(255) UNIQUE;

-- Update existing users (if any) - manual process
-- Will need to have users re-authenticate to link accounts
```

### 4.2 Create Migration Script
**File**: `backend/alembic/versions/xxx_migrate_to_azure_ad_b2c.py`
```python
"""Migrate to Azure AD B2C authentication

Revision ID: xxx
Revises: previous_revision
Create Date: 2025-12-18

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Remove Keycloak columns
    op.drop_column('users', 'password_hash', if_exists=True)
    op.drop_column('users', 'keycloak_id', if_exists=True)
    
    # Add Azure AD B2C column
    op.add_column('users', sa.Column('azure_object_id', sa.String(255), unique=True))
    
    # Create index for faster lookups
    op.create_index('ix_users_azure_object_id', 'users', ['azure_object_id'])

def downgrade():
    op.drop_index('ix_users_azure_object_id', 'users')
    op.drop_column('users', 'azure_object_id')
    op.add_column('users', sa.Column('keycloak_id', sa.String(255)))
    op.add_column('users', sa.Column('password_hash', sa.String(255)))
```

---

## Phase 5: Docker Cleanup (15 minutes)

### 5.1 Update docker-compose.prod.yml
```yaml
# REMOVE entire keycloak service block:
# keycloak:
#   image: quay.io/keycloak/keycloak:23.0
#   environment:
#     - KC_DB=postgres
#     ...
#   ports:
#     - "8080:8080"
#   ...

# Update backend environment - remove Keycloak vars, add Azure
services:
  backend:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - AZURE_TENANT=${AZURE_TENANT}
      - AZURE_CLIENT_ID=${AZURE_CLIENT_ID}
      - AZURE_CLIENT_SECRET=${AZURE_CLIENT_SECRET}
      # Remove:
      # - KEYCLOAK_URL=...
      # - KEYCLOAK_REALM=...
      # - KEYCLOAK_CLIENT_ID=...
```

### 5.2 Remove Keycloak Nginx Config
```bash
# On Azure server (after migration)
sudo rm /etc/nginx/sites-available/keycloak.conf
sudo rm /etc/nginx/sites-enabled/keycloak.conf
sudo nginx -t
sudo systemctl reload nginx

# Remove Let's Encrypt certificate
sudo certbot delete --cert-name keycloak.workshelf.dev
```

---

## Phase 6: Testing Checklist (30 minutes)

### 6.1 Local Testing
- [ ] Frontend builds without errors
- [ ] Login popup appears correctly
- [ ] User can sign up with email
- [ ] User can sign in with existing account
- [ ] JWT token is included in API requests
- [ ] Backend validates tokens correctly
- [ ] User profile loads after login
- [ ] Logout works correctly

### 6.2 Production Testing
- [ ] Deploy frontend to Azure
- [ ] Deploy backend to Azure
- [ ] Test full authentication flow
- [ ] Verify user data persists correctly
- [ ] Test API endpoints with authentication
- [ ] Check browser console for errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

---

## Phase 7: DNS & Cleanup (15 minutes)

### 7.1 Update DNS (if needed)
```bash
# Remove keycloak subdomain (no longer needed)
# In your DNS provider (Cloudflare, Route53, etc.)
# Delete A record: keycloak.workshelf.dev → 52.202.80.210
```

### 7.2 Clean Up Old Keycloak Data
```bash
# After 1 week of stable Azure AD B2C operation
docker-compose -f docker-compose.prod.yml down keycloak
docker volume rm workshelf_keycloak_data
```

---

## Cost Comparison

### Old: Keycloak (Self-Hosted)
- **RAM**: 498MB (12.5% of 4GB instance)
- **Storage**: ~2GB volume
- **Maintenance**: 2-3 hours/month (schema issues, updates, crashes)
- **Uptime**: ~95% (OOM crashes, manual restarts)

### New: Azure AD B2C (Managed)
- **RAM**: 0MB (external service)
- **Cost**: FREE for <50k monthly active users
- **Paid tier**: $0.00325 per user/month (50k+ users = ~$163/mo)
- **Maintenance**: 0 hours (fully managed)
- **Uptime**: 99.9% SLA

### Break-even Analysis
- Current users: ~10-20
- Projected 1 year: ~1,000 users
- Cost at 1k users: **$0** (still under free tier)
- Cost at 50k users: **$0** (free tier limit)
- Cost at 100k users: ~$325/month
- **Recommendation**: You won't pay anything for years

---

## Rollback Plan (If Needed)

If something goes wrong:

1. **Keep old Keycloak container** (don't delete until 1 week stable)
2. **Database backup** before migration
3. **Quick rollback**:
   ```bash
   # Revert frontend to use Keycloak
   git revert <azure-migration-commit>
   
   # Restart Keycloak container
   docker-compose -f docker-compose.prod.yml up -d keycloak
   
   # Restore nginx config
   sudo ln -s /etc/nginx/sites-available/keycloak.conf /etc/nginx/sites-enabled/
   sudo systemctl reload nginx
   ```

---

## Migration Timeline

**Total Time**: ~4 hours

1. **Hour 1**: Azure AD B2C setup + user flows (Phase 1)
2. **Hour 2**: Frontend code migration (Phase 2)
3. **Hour 3**: Backend code migration (Phase 3)
4. **Hour 4**: Database migration, Docker cleanup, testing (Phases 4-6)

---

## Next Steps

1. **Confirm decision**: Ready to start migration?
2. **Azure subscription**: Ensure Azure account is active with credits
3. **Backup database**: Create Neon snapshot before any changes
4. **Start Phase 1**: Create Azure AD B2C tenant together
5. **Code migration**: Frontend → Backend → Database → Docker
6. **Deploy to Azure**: Fresh deployment with Azure AD B2C
7. **Monitor**: Watch for 1 week before removing Keycloak

---

## Security Notes

### Azure AD B2C Security Features
- ✅ **Brute force protection**: Automatic account lockout after failed attempts
- ✅ **DDoS protection**: Microsoft's global network
- ✅ **Threat detection**: Real-time monitoring for suspicious activity
- ✅ **Compliance**: SOC 2, ISO 27001, HIPAA, GDPR ready
- ✅ **MFA built-in**: SMS, authenticator app, email codes
- ✅ **Social logins**: Google, Facebook, GitHub (optional)
- ✅ **Custom domains**: Can use auth.workshelf.dev instead of B2C subdomain
- ✅ **Audit logs**: 30-day retention of all auth events
- ✅ **Password policies**: Complexity requirements enforced

### Keycloak Security Features (Lost)
- ❌ Self-hosted control (but causes maintenance burden)
- ❌ Custom flows (not needed for your use case)
- ❌ Advanced federation (not using LDAP/SAML)

**Verdict**: Azure AD B2C provides equal or better security with zero maintenance.
