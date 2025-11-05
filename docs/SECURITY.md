# Security & Secrets Documentation

## ✅ Public Information (Safe in Git)

These values are **PUBLIC** and safe to commit:

### Frontend Configuration
- **Keycloak URL**: `https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io`
  - This is a public OAuth endpoint
  - Anyone can access the login page
  - No secret required to view it

- **API URL**: `https://api.workshelf.dev`
  - Public API endpoint
  - Authentication required for protected routes
  - The URL itself is not sensitive

- **Client ID**: `workshelf-frontend`
  - Public OAuth client (PKCE flow)
  - Designed to be known by browsers
  - No client secret for public clients

- **Realm Name**: `workshelf`
  - Public realm identifier
  - Part of the OAuth URLs
  - Not a secret

### Why These Are Safe
Frontend code is **always public** - users can:
- View page source
- Inspect network requests  
- Read compiled JavaScript
- Use browser dev tools

Therefore, anything in frontend code must be considered public.

---

## 🔐 Actual Secrets (NEVER Commit)

These values are **NEVER** safe to commit:

### Backend Secrets
- ❌ Database passwords (`npg_c2ZCF0THgyzS`)
- ❌ Keycloak admin password (`e00NiIf26fJzdkdBt1kw`)
- ❌ Backend client secret (`WTWM9Ahl5e95eIqnIf6PcnfFrr3oM9Bp`)
- ❌ SendGrid API keys
- ❌ JWT signing keys
- ❌ Encryption keys
- ❌ User passwords

### Where Secrets Live
- ✅ Azure Key Vault (production)
- ✅ GitHub Secrets (CI/CD)
- ✅ Local `.env` files (gitignored)
- ✅ Kit's Notes/Credentials.md (gitignored)
- ❌ **NEVER in source code**

---

## 🛡️ GitGuardian False Positives

GitGuardian flagged commit `92876d9` for:

### 1. Generic Password Pattern
**Location**: `infrastructure/bicep/main.bicep`
```bicep
param postgresAdminPassword string = ''
```
**Why Safe**: This is a Bicep parameter definition, not an actual password. The actual password is passed at deployment time from Azure Key Vault.

### 2. High Entropy Secret Pattern  
**Location**: `frontend/src/services/auth.ts`
```typescript
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 
  'https://workshelf-keycloak.wonderfulstone-7c41e05e.centralus.azurecontainerapps.io'
```
**Why Safe**: This is a public URL. The subdomain contains random characters (Azure-generated), triggering GitGuardian's entropy detection. It's not a secret.

### Resolution
Created `.gitguardian.yaml` to mark these as false positives.

---

## 📋 Security Checklist

### ✅ Already Protected
- [x] Database credentials in Azure Key Vault
- [x] `.env` files in `.gitignore`
- [x] Credentials.md in `.gitignore`  
- [x] Backend client secret in Azure App Settings
- [x] GitHub Actions use encrypted secrets

### 🔄 When Adding New Secrets
1. **NEVER** hardcode in source files
2. **ADD** to `.env.example` with dummy values
3. **STORE** actual values in:
   - Local: `.env` file (gitignored)
   - Production: Azure Key Vault
   - CI/CD: GitHub Secrets
4. **REFERENCE** via environment variables
5. **DOCUMENT** in Kit's Notes/Credentials.md (gitignored)

---

## 🚨 If You Accidentally Commit a Secret

1. **DO NOT** just delete it in a new commit (it's still in history!)
2. **ROTATE** the secret immediately (generate new password/key)
3. **USE** `git filter-branch` or BFG Repo Cleaner to remove from history
4. **FORCE PUSH** to overwrite history (coordinate with team)
5. **UPDATE** all systems with new secret

### Quick Secret Rotation Commands

**Database Password**:
```bash
# In Neon dashboard, rotate password
# Update Azure Key Vault
# Restart backend containers
```

**Keycloak Admin Password**:
```bash
# In Keycloak admin console, change password
# Update Kit's Notes/Credentials.md
```

**Backend Client Secret**:
```bash
# In Keycloak, regenerate client secret
# Update Azure App Settings: KEYCLOAK_CLIENT_SECRET
# Restart backend
```

---

## 📖 References

- [GitGuardian Docs](https://docs.gitguardian.com/)
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Keycloak Security](https://www.keycloak.org/docs/latest/server_admin/#_security_hardening)

---

**Last Updated**: November 5, 2025  
**Reviewed By**: Kit
