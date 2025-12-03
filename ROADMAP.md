# Workshelf Roadmap

**Last Updated:** December 3, 2025  
**Current Status:** Production-ready with 95% feature parity  
**Overall Grade:** A (Security: A+, Performance: A, Accessibility: WCAG 2.1 AA ✅, GDPR: 90%)

---

## 🎯 Immediate Priorities (Week 1-2)

### 1. GDPR Compliance - Final Step ⚠️ **HIGH PRIORITY**
**Status:** 90% Complete (only Export UI remains)  
**Deadline:** 1 week

- [ ] **Data Export UI** ⚠️ **LAST REMAINING TASK**
  - Backend: `/export/gdpr-data` endpoint exists ✅
  - Frontend: Create "Export My Data" page/button
  - Location: Add to Profile settings
  - Format: ZIP with JSON files (documents, profile, groups, activity)

---

## 🚀 Missing Frontend Features

### 1. Bulk Upload 📦 **MEDIUM PRIORITY**
**Backend:** ✅ Complete (`/api/v1/bulk-upload`)  
**Frontend:** ❌ Not Implemented  
**Use Case:** Import Obsidian vaults, Notion exports

**Tasks:**
- [ ] Create `/pages/BulkUpload.tsx`
- [ ] File upload interface (drag & drop)
- [ ] Support formats: `.zip`, `.md` folders
- [ ] Progress bar for upload
- [ ] Preview imported documents
- [ ] Map to projects/folders

### 2. Custom Group Roles 👥 **MEDIUM PRIORITY**
**Backend:** ✅ Complete (`/api/v1/groups/{id}/roles`)  
**Frontend:** ⚠️ Partial (basic roles only)  
**Use Case:** Group owners create custom roles

**Tasks:**
- [ ] Add "Roles" tab to Group Settings
- [ ] Create `RoleEditor` component
- [ ] Permission checkboxes (read, write, moderate, invite)
- [ ] Assign roles to members
- [ ] Role inheritance system

### 3. Group Scholarships 🎓 **LOW PRIORITY**
**Backend:** ✅ Complete (`/api/v1/groups/{id}/scholarships`)  
**Frontend:** ❌ Not Implemented  
**Use Case:** Groups offer free/discounted memberships

**Tasks:**
- [ ] Add "Scholarships" tab to Group Settings (owners)
- [ ] Create scholarship application form
- [ ] Approval workflow for owners
- [ ] Display scholarship offers in group detail

### 4. Wiki Editing ✏️ **LOW PRIORITY**
**Backend:** ✅ Complete (admin moderation endpoints)  
**Frontend:** ⚠️ Admin moderation exists, wiki editing missing  
**Use Case:** Community knowledge base

**Tasks:**
- [ ] Create `/pages/Wiki.tsx` (view mode)
- [ ] Create `/pages/WikiEdit.tsx` (edit mode)
- [ ] Markdown editor for wiki pages
- [ ] Version history
- [ ] Moderation queue integration

---

## 🔧 Technical Improvements

### 1. Performance Optimization 🚀 **LOW PRIORITY**
**Current:** Good (897 KB gzipped total)  
**Goal:** Better (reduce to <800 KB)

**Tasks:**
- [ ] Image optimization (WebP format)
- [ ] Lazy loading for images
- [ ] CDN for static assets
- [ ] Database query profiling
- [ ] Add `joinedload()` to prevent N+1 queries
- [ ] Redis caching for public endpoints (`/groups`, `/free-books`)
- [ ] Implement ETags for conditional requests

### 2. Code Cleanup 🧹 **LOW PRIORITY**
**Current:** Mostly clean  
**Goal:** Pristine

**Tasks:**
- [ ] Delete backup files (`.backup` extension)
  - `frontend/src/pages/BetaMarketplace.tsx.backup`
  - `frontend/src/pages/Dashboard.tsx.backup`
  - `frontend/src/pages/Profile.tsx.backup`
  - `frontend/src/pages/Store.tsx.backup`
- [ ] Fix deprecation warnings
  - Replace `datetime.utcnow()` with `datetime.now(UTC)`
  - Update deprecated Pydantic validators
- [ ] Update dependencies (no critical CVEs)
  - `aiohttp` 3.12.14 → latest
  - `fastapi` 0.121.0 → latest
  - `pydantic` 2.10.6 → latest

### 3. Testing Improvements 🧪 **MEDIUM PRIORITY**
**Current:** 27 passing, 85 skipped  
**Goal:** 100+ passing

**Tasks:**
- [ ] Create Keycloak auth mocking helper
- [ ] Add database fixtures for Phase 7 tests
- [ ] Unskip Phase 5 tests (8 tests)
- [ ] Unskip Phase 7 tests (19 tests)
- [ ] Unskip Group tests (52 tests)
---

## ✅ Recently Completed (December 2025)

### GDPR Compliance (90% Complete)
- ✅ Privacy Policy page (comprehensive template)
- ✅ Account Deletion feature (6-month username freeze)
- ✅ Trash Bin system (30-day auto-purge)
- ✅ Data retention policy documented
- ✅ Auto-purge cron job script

### Accessibility (100% Complete - WCAG 2.1 AA)
- ✅ 8 new accessible components created
- ✅ Skip link for keyboard navigation
- ✅ Focus trap in modals
- ✅ All ARIA labels added
- ✅ Form accessibility complete
- ✅ Image alt text descriptive
- ✅ Semantic HTML and landmarks
- ✅ 44px minimum touch targets
- ✅ Comprehensive documentation

### Security & Stability
- ✅ Comprehensive security audit (no critical vulnerabilities)
- ✅ Python 3.9/3.13 compatibility fixes
- ✅ Dependency updates (lxml, email-validator)
- ✅ Vite Dockerfile parse error fixed

### Group Features
- ✅ Group privacy protection (private groups cannot become public)
- ✅ "My Groups" navigation section with settings icons
- ✅ Group member count display
- ✅ Group settings page

### Backend Deployment
- ✅ All Phase 5 features deployed (Studio customization, analytics)
- ✅ All Phase 7 features deployed (Content integrity, export, accessibility)
- ✅ All Group multi-tenant features deployed (themes, domains, followers)

---

## 📈 Feature Status Summary
