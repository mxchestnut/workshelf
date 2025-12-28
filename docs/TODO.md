# WorkShelf Development TODO List
**Generated:** December 28, 2024  
**Status:** Post-cleanup and CI fixes

---

## 🔥 HIGH PRIORITY - Today's Focus

### 1. Complete Keycloak Integration (Authentication Fix)
**Status:** Stub implementation in place  
**Priority:** CRITICAL  
**Files:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/config/authConfig.ts`

The Azure MSAL authentication has been removed and replaced with a basic Keycloak stub. This needs proper implementation:
- [ ] Implement OAuth2 authorization code flow with Keycloak
- [ ] Handle callback route (`/callback`) for token exchange
- [ ] Implement token refresh logic
- [ ] Store and retrieve user info properly
- [ ] Test login/logout flow end-to-end
- [ ] Update environment variables (`.env`, `.env.example`)

**Impact:** Users cannot currently authenticate properly.

---

### 2. Fix Frontend Code Quality Issues
**Status:** Multiple ESLint/TypeScript warnings  
**Priority:** HIGH

#### A. Promise.resolve() Anti-pattern (9 files)
Replace `return Promise.resolve()` with direct returns in catch blocks:
- [ ] `frontend/src/pages/Author.tsx:86`
- [ ] `frontend/src/pages/DeleteAccount.tsx:46`
- [ ] `frontend/src/pages/Documents.tsx:45`
- [ ] `frontend/src/pages/FreeBooks.tsx:40`
- [ ] `frontend/src/pages/GroupRoles.tsx:141`
- [ ] `frontend/src/pages/Groups.tsx:46`
- [ ] `frontend/src/pages/GroupSettings.tsx:50`
- [ ] `frontend/src/pages/Messages.tsx:101`
- [ ] `frontend/src/pages/Store.tsx:74`
- [ ] `frontend/src/pages/StudioV2.tsx:69`

#### B. `window` → `globalThis` Migration
Replace all `window.` references with `globalThis.` for better compatibility:
- [ ] `frontend/src/pages/DeleteAccount.tsx` (lines 62, 123)
- [ ] `frontend/src/pages/Documents.tsx:288`
- [ ] `frontend/src/pages/Groups.tsx:108`
- [ ] `frontend/src/pages/GroupSettings.tsx` (lines 37, 101, 201, 227, 286)

#### C. Accessibility Issues
- [ ] Add keyboard handlers to clickable divs (Documents.tsx, GroupRoles.tsx)
- [ ] Add `htmlFor` to form labels (GroupRoles.tsx, Groups.tsx, GroupSettings.tsx)
- [ ] Fix array index keys in DeleteAccount.tsx

#### D. React Hook Dependencies
Add missing dependencies to `useEffect` hooks:
- [ ] `frontend/src/pages/staff/SystemSettings.tsx:16` - add `checkAccess`
- [ ] `frontend/src/pages/staff/GlobalModeration.tsx:16` - add `checkAccess`
- [ ] `frontend/src/pages/StudioV2.tsx:58` - add `loadProjects`
- [ ] `frontend/src/pages/ReadPage.tsx:36` - add `checkIfInVault`, `loadStoreItem`
- [ ] `frontend/src/pages/MyBetaRequests.tsx:26` - add `load`
- [ ] `frontend/src/pages/MyBetaProfile.tsx:68` - add `loadProfile`
- [ ] `frontend/src/pages/Invite.tsx:42` - add `verifyInvitation`
- [ ] `frontend/src/pages/Feed.tsx:190` - add `login`, `user`
- [ ] `frontend/src/pages/DeleteAccount.tsx:42` - add `fetchDeletionInfo`

#### E. Fix Fast Refresh Warning
- [ ] Split out auth types and helpers from `AuthContext.tsx` into separate files

---

### 3. Backend Security & Deprecation Issues
**Priority:** MEDIUM-HIGH

#### A. Pydantic V2 Migration
Multiple models using deprecated class-based `config`. Migrate to `ConfigDict`:
- [ ] `backend/app/api/authors.py:66` - EditResponse
- [ ] `backend/app/api/epub_uploads.py:77` - SubmissionResponse
- [ ] `backend/app/api/store.py:28, 86` - StoreItemResponse, PurchaseResponse
- [ ] `backend/app/api/admin.py` - Multiple response models (lines 35, 55, 91, 104, 1048, 1059)
- [ ] `backend/app/api/admin_store.py:25, 36` - Response models
- [ ] `backend/app/api/admin_moderation.py:20` - PendingEditResponse
- [ ] `backend/app/api/group_admin.py:31, 53, 73` - Response models
- [ ] `backend/app/api/feed.py:34` - FeedPost
- [ ] `backend/app/api/invitations.py:26` - InvitationResponse
- [ ] `backend/app/api/collections.py:43, 54` - Response models

**Example migration:**
```python
# OLD (deprecated)
class MyModel(BaseModel):
    class Config:
        from_attributes = True

# NEW (Pydantic V2)
from pydantic import ConfigDict

class MyModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
```

#### B. FastAPI Query Parameter Updates
Replace deprecated `regex` with `pattern`:
- [ ] `backend/app/api/free_books.py:25, 188`
- [ ] `backend/app/api/admin.py:651`

---

## 📋 MEDIUM PRIORITY

### 4. Complete TODO Comments in Code
**Found:** 10 TODO items in codebase

#### Frontend TODOs:
- [ ] `frontend/src/components/Editor.tsx:437` - Implement send functionality
- [ ] `frontend/src/pages/AdminDashboard.tsx:1075` - Add make staff endpoint call
- [ ] `frontend/src/pages/staff/StoreAnalytics.tsx:131` - Open modal or navigate to add item page
- [ ] `frontend/src/pages/staff/StoreAnalytics.tsx:143` - Implement backend endpoint for audiobook generation
- [ ] `frontend/src/pages/ReadPage.tsx:310` - Integrate with Stripe checkout
- [ ] `frontend/src/pages/Vault.tsx:260, 592` - Implement reading list management & add to vault
- [ ] `frontend/src/pages/Feed.tsx:572` - Filter feed by tag
- [ ] `frontend/src/pages/Projects.tsx:142, 243` - Add real progress tracking, show project menu

#### Backend/Deployment TODOs:
- [ ] `safe-deploy.sh:14-15` - Set staging and production database URLs
- [ ] Enable AI templates API if needed (currently disabled in v1.py)

---

### 5. Remove Deprecated Code
**Priority:** MEDIUM (cleanup)

- [ ] Delete `backend/app/models/author_follows.py` (marked DEPRECATED, consolidated into Author + UserFollowsAuthor)
- [ ] Clean up `backend/app/schemas/collaboration.py` - remove deprecated `is_public` fields (lines 155, 166)

---

### 6. Environment & Configuration
**Priority:** MEDIUM

- [ ] Review and update `.env.example` for Keycloak variables
- [ ] Document Keycloak setup in README
- [ ] Update deployment scripts for Keycloak (currently references Azure)
- [ ] Review and test Matrix integration setup
- [ ] Document MinIO/S3 storage configuration

---

## 🔍 LOW PRIORITY

### 7. Testing & Quality
- [ ] Add tests for Keycloak authentication flow
- [ ] Review skipped/disabled tests (test_jwt_verification.py is marked skip)
- [ ] Add integration tests for vault/bookshelf functionality
- [ ] Test Matrix chat integration
- [ ] Review and update pre-commit hooks

### 8. Documentation
- [ ] Update main README.md (still references "NPC" in some places)
- [ ] Document the bookshelf → vault migration
- [ ] Create API documentation for new endpoints
- [ ] Document role-based access control
- [ ] Create user guide for WorkShelf Store

### 9. Performance & Optimization
- [ ] Review database indexes (especially for vault_articles table)
- [ ] Optimize feed query performance
- [ ] Review and optimize S3/MinIO storage usage
- [ ] Add caching for frequently accessed data

### 10. Security Hardening
- [ ] Review SECURITY.md and implement recommendations
- [ ] Audit all API endpoints for proper authentication
- [ ] Review CORS configuration
- [ ] Set up rate limiting
- [ ] Review and fix backend vulnerabilities (npm audit shows issues)

---

## 🎯 RECOMMENDED TODAY'S WORK ORDER

1. **Morning (2-3 hours):** Implement proper Keycloak authentication
   - Get login/logout working
   - Test token flow
   - Update environment variables

2. **Midday (1-2 hours):** Fix critical frontend issues
   - Fix Promise.resolve() anti-pattern (quick wins)
   - Add missing React Hook dependencies
   - Fix window → globalThis

3. **Afternoon (2-3 hours):** Backend Pydantic V2 migration
   - Create a helper script to automate the migration
   - Update all models systematically
   - Test API endpoints

4. **End of day:** Code review & testing
   - Run full CI pipeline
   - Test authentication flow end-to-end
   - Document what was completed

---

## 📊 METRICS

- **Total TODO comments:** 10
- **ESLint/TypeScript issues:** ~50
- **Deprecated code patterns:** 25+
- **Files needing refactoring:** ~30
- **Critical path items:** 3 (Keycloak auth, code quality, Pydantic migration)

---

## 🔗 RELATED DOCUMENTS

- `SECURITY.md` - Security guidelines and requirements
- `README.md` - Project setup and deployment
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docs/` - Additional documentation (add more as needed)
