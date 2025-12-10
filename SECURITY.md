# Security & Safety Systems

This document describes the automated security and safety checks in place.

## 🔒 Automated Security Checks

### 1. Pre-Commit Hook (Automatic)
**When it runs:** Every `git commit`  
**What it checks:**
- ❌ Passwords, secrets, API keys, tokens
- ❌ `.env` files, `.pem` files, private keys
- ❌ Database connection strings with credentials
- ❌ Previously exposed credentials (blocks re-committing)
- ❌ Hardcoded production endpoints
- ⚠️  Commented-out credentials
- ⚠️  Security-related TODOs

**Location:** `.git/hooks/pre-commit`

**Result:** Commit is BLOCKED if secrets are detected.

**Example:**
```bash
$ git commit -m "Add config"

🔒 Running security audit...
❌ BLOCKED: Found potential secret in config.py
   Pattern: PASSWORD\s*=\s*["'][^"']+
+PASSWORD="mySecretPass123"

╔════════════════════════════════════════╗
║  ❌ COMMIT BLOCKED - SECURITY ISSUES  ║
╚════════════════════════════════════════╝
```

**To bypass (NOT RECOMMENDED):**
```bash
git commit --no-verify
```

### 2. Pre-Deployment Checklist (Manual)
**When to run:** Before EVERY production deployment  
**Command:** `./scripts/pre-deploy-checklist.sh`

**What it verifies:**
- ✅ Code tested locally
- ✅ All tests passing
- ✅ No uncommitted changes
- ✅ No secrets in recent commits
- ✅ Backups created (for auth/DB changes)
- ✅ New environment variables documented
- ✅ Rollback plan exists

**Result:** Deployment is BLOCKED if critical checks fail.

**Example:**
```bash
$ ./scripts/pre-deploy-checklist.sh

📋 Pre-Deployment Checklist
============================

SECTION 1: Code Quality & Testing
═══════════════════════════════════════
✅ No uncommitted changes
⏸  Have you tested these changes locally? (y/n): y
   ✅ Confirmed

SECTION 2: Security
═══════════════════════════════════════
✅ No obvious secrets in recent commits
⚠️  Changes involve authentication/Keycloak
   Latest backup: 15m old
   
SECTION 3: Backup & Safety
═══════════════════════════════════════
✅ Recent Keycloak backup found

╔════════════════════════════════════════╗
║    ✅ ALL CHECKS PASSED - SAFE TO     ║
║           DEPLOY TO PRODUCTION        ║
╚════════════════════════════════════════╝
```

### 3. Pull Request Template (GitHub)
**When it appears:** Creating a new PR  
**Location:** `.github/PULL_REQUEST_TEMPLATE.md`

**Checklists included:**
- Security checklist ✅
- Testing checklist 🧪
- Deployment checklist 📦
- Rollback plan 🔄

## 🛡️ What Gets Blocked

### Definitely Blocked (commit fails)
```python
# These will BLOCK your commit:
PASSWORD = "secret123"
SECRET_KEY = "sk-live-abc123def456..."
DATABASE_URL = "postgresql://user:password@host/db"
API_KEY = "pk_live_51H..."
TOKEN = "ghp_abc123def456..."

# Files that will BLOCK:
.env
.env.prod
id_rsa.pem
credentials.json
```

### Warnings (commit proceeds with caution)
```python
# These generate warnings but don't block:
# OLD_PASSWORD = "was_used_before"  # Commented credential
# TODO: Add proper authentication  # Security TODO
SERVER_IP = "34.239.176.138"  # Hardcoded IP
```

## 🔧 Setup (For New Team Members)

The pre-commit hook is automatically active in the repo. New clones need to make it executable:

```bash
# After cloning
chmod +x .git/hooks/pre-commit

# Verify it works
echo 'PASSWORD="test"' > test.txt
git add test.txt
git commit -m "test"
# Should be BLOCKED

# Clean up
git restore --staged test.txt && rm test.txt
```

## 📊 Security Incident Response

If the pre-commit hook was bypassed and secrets were pushed:

### Immediate Actions (< 5 minutes)
```bash
# 1. Force push to remove from history
git reset --hard HEAD~1  # Or the commit before the leak
git push --force

# 2. Notify team immediately
# Post in team chat, email, etc.
```

### Follow-up Actions (< 30 minutes)
```bash
# 3. Rotate ALL exposed credentials
./scripts/rotate-credentials.sh  # If script exists
# Or manually rotate:
# - Database passwords
# - SECRET_KEY
# - API keys
# - Keycloak admin password

# 4. Check GitHub secret scanning alerts
# Go to: https://github.com/mxchestnut/workshelf/security
```

### Post-Incident (< 24 hours)
```bash
# 5. Update documentation
# Document what happened, how it was fixed

# 6. Review .gitignore
# Ensure sensitive file patterns are excluded

# 7. Test pre-commit hook
# Verify it would have caught the issue
```

## 🧪 Testing the Security System

### Test 1: Secret Detection
```bash
# Create file with secret
echo 'PASSWORD="test123"' > test_secret.txt

# Try to commit
git add test_secret.txt
git commit -m "test"
# Expected: ❌ BLOCKED

# Clean up
git restore --staged test_secret.txt && rm test_secret.txt
```

### Test 2: .env File Protection
```bash
# Create .env file
echo 'SECRET_KEY=abc123' > .env

# Try to commit
git add .env
git commit -m "test"
# Expected: ❌ BLOCKED

# Clean up
git restore --staged .env && rm .env
```

### Test 3: Database URL Protection
```bash
# Create file with DB URL
echo 'DB_URL="postgresql://user:pass@host/db"' > config.py

# Try to commit
git add config.py
git commit -m "test"
# Expected: ❌ BLOCKED

# Clean up
git restore --staged config.py && rm config.py
```

## 📝 Workflow Summary

### Every Code Change
```bash
# 1. Make changes
vim backend/app/services/document_service.py

# 2. Commit (security audit runs automatically)
git add .
git commit -m "Fix document query"
# Security hook scans for secrets
# ✅ If clean, commit succeeds
# ❌ If secrets found, commit blocked

# 3. Push to GitHub
git push
```

### Before Deploying to Production
```bash
# 1. Run pre-deployment checklist
./scripts/pre-deploy-checklist.sh
# Answers interactive questions
# Verifies testing, backups, etc.
# ✅ Approved → proceed to deploy
# ❌ Issues found → fix before deploying

# 2. Deploy
./deploy-prod.sh
```

## 🚨 Bypassing Security (Emergency Only)

Sometimes you may need to commit something that triggers false positives:

```bash
# Bypass pre-commit hook (use with EXTREME caution)
git commit --no-verify -m "Update security patterns"

# Why you might need this:
# - Updating the security hook itself
# - Adding documentation with example patterns
# - Emergency hotfix when hook is buggy

# ⚠️ NEVER bypass to commit actual secrets!
```

## 📚 Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md) - PR checklist
- [scripts/pre-deploy-checklist.sh](./scripts/pre-deploy-checklist.sh) - Pre-deployment script
- [.git/hooks/pre-commit](./.git/hooks/pre-commit) - Pre-commit security hook

## 🔄 Continuous Improvement

This security system should evolve as we discover new patterns:

**To add a new secret pattern:**
1. Edit `.git/hooks/pre-commit`
2. Add pattern to `PATTERNS` array
3. Test it catches the secret
4. Document in this README

**To add a new pre-deployment check:**
1. Edit `scripts/pre-deploy-checklist.sh`
2. Add check in appropriate section
3. Test the check works
4. Update DEPLOYMENT.md if needed

---

**Remember:** These tools are here to help, not hinder. If they're getting in the way, let's improve them together rather than bypassing them! 🛡️
