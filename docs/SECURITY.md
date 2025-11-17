# Security & Secrets Documentation

## ✅ Public Information (Safe in Git)

These values are **PUBLIC** and safe to commit:

### Frontend Configuration
- **Keycloak URL**: `https://auth.workshelf.dev`
  - This is a public OAuth endpoint
  - Anyone can access the login page
  - No secret required to view it

- **API URL**: `https://api.workshelf.dev`
  - Public API endpoint
  - Authentication required for protected routes
  - The URL itself is not sensitive

- **Matrix URL**: `https://matrix.workshelf.dev`
  - Public Matrix homeserver endpoint
  - Required for chat functionality
  - Server name: `workshelf.dev`

- **Client ID**: `workshelf-client`
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

### Backend Secrets (All stored in AWS Secrets Manager)
- ❌ Database passwords (RDS)
- ❌ Keycloak admin password
- ❌ Backend client secret
- ❌ Matrix registration shared secret
- ❌ Matrix admin access token
- ❌ Stripe API keys
- ❌ Anthropic API key
- ❌ Sentry DSN
- ❌ JWT signing keys
- ❌ Encryption keys
- ❌ User passwords

### Where Secrets Live
- ✅ AWS Secrets Manager (production)
- ✅ Local `.env` files (gitignored)
- ✅ Kit's Notes/credentials.md (gitignored)
- ❌ **NEVER in source code**

---

## 🛡️ Security Best Practices

### ✅ Already Protected
- [x] Database credentials in AWS Secrets Manager
- [x] `.env` files in `.gitignore`
- [x] credentials.md in `.gitignore`  
- [x] Backend client secret in AWS Secrets Manager
- [x] ECS tasks use IAM roles to access secrets
- [x] HTTPS everywhere (TLS 1.2+)
- [x] Private subnets for databases
- [x] Security groups with minimal access

### 🔄 When Adding New Secrets
1. **NEVER** hardcode in source files
2. **ADD** to `.env.example` with dummy values
3. **STORE** actual values in:
   - Local: `.env` file (gitignored)
   - Production: AWS Secrets Manager
4. **REFERENCE** via environment variables
5. **DOCUMENT** in Kit's Notes/credentials.md (gitignored)

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
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Update AWS Secrets Manager
aws secretsmanager update-secret --secret-id workshelf/db-password --secret-string "$NEW_PASSWORD"

# Update RDS instance
aws rds modify-db-instance --db-instance-identifier workshelf-db --master-user-password "$NEW_PASSWORD" --apply-immediately

# Restart backend service
aws ecs update-service --cluster workshelf-cluster --service workshelf-backend --force-new-deployment
```

**Matrix Password**:
```bash
# Similar process for Matrix database
aws secretsmanager update-secret --secret-id workshelf/matrix/db-password --secret-string "$NEW_PASSWORD"
aws rds modify-db-instance --db-instance-identifier workshelf-matrix-db --master-user-password "$NEW_PASSWORD" --apply-immediately
aws ecs update-service --cluster workshelf-cluster --service workshelf-matrix --force-new-deployment
```

---

## 📖 References

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [GitGuardian Docs](https://docs.gitguardian.com/)
- See `Kit's Notes/production-infrastructure.md` for full infrastructure details
- [Azure Key Vault Best Practices](https://docs.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Keycloak Security](https://www.keycloak.org/docs/latest/server_admin/#_security_hardening)

---

**Last Updated**: November 5, 2025  
**Reviewed By**: Kit
