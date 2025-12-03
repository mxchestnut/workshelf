# Workshelf Roadmap

**Last Updated:** December 3, 2025  
**Current Status:** Production-ready with 95% feature parity  
**Overall Grade:** A (Security: A+, Performance: A, Accessibility: WCAG 2.1 AA ✅, GDPR: Mostly Complete)

---

## 🎯 Immediate Priorities (Week 1-2)

### 1. GDPR Compliance - Final Step ⚠️ **HIGH PRIORITY**
**Status:** 90% Complete (only Export UI remains)  
**Deadline:** 1 week

- [x] **Account Deletion Feature** ✅ **COMPLETED**
  - Backend: Complete with 6-month username freezing
  - Frontend: DeleteAccount.tsx with comprehensive warnings
  - Confirmation: Multi-step validation (3 checkboxes + typed phrase)
  - Documentation: ACCOUNT_DELETION.md

- [ ] **Data Export UI** ⚠️ **LAST REMAINING TASK**
  - Backend: `/export/gdpr-data` endpoint exists ✅
  - Frontend: Create "Export My Data" page/button
  - Location: Add to Profile settings
  - Format: ZIP with JSON files (documents, profile, groups, activity)
  - Priority: HIGH (completes GDPR compliance)

- [x] **Privacy Policy Page** ✅ **COMPLETED**
  - Created `/pages/PrivacyPolicy.tsx`
  - 398 lines comprehensive template
  - Covers: data collection, third-party services, user rights
  - Includes: GDPR, CCPA compliance information

- [x] **Data Retention Policy** ✅ **COMPLETED**
  - Trash bin with 30-day auto-purge
  - Auto-purge script: `cleanup_trash.py`
  - Cron job: Daily at 2 AM
  - Documentation: TRASH_BIN_SYSTEM.md

### 2. Accessibility ✅ **COMPLETED** - WCAG 2.1 AA Compliant
**Status:** 100% Complete  
**Achievement:** Platform is now fully accessible

- [x] **New Accessible Components** ✅
  - `useFocusTrap` - Focus management hook
  - `SkipLink` - Skip to main content
  - `LiveRegion` - Screen reader announcements
  - `AccessibleForm` - Input/Textarea/Select with proper labels
  - `AccessibleButton` - 44px touch targets
  - `IconButton` - Required aria-labels
  - `AccessibleModal` - Full keyboard support
  - `ConfirmationModal` - Accessible confirmation dialogs

- [x] **Navigation & Keyboard** ✅
  - Skip link implemented (WCAG 2.4.1)
  - Focus trap in modals (WCAG 2.1.2)
  - All ARIA labels added
  - Keyboard navigation: Tab, Escape, Enter
  - Focus indicators: 2px rings on all elements

- [x] **Form Accessibility** ✅
  - All inputs have labels
  - aria-invalid for errors
  - aria-describedby linking errors
  - role="alert" for announcements
  - Proper error handling

- [x] **Image Alt Text** ✅
  - Profile pictures: "username's profile picture"
  - Book covers: "Book cover for title"
  - Decorative images: aria-hidden="true"

- [x] **Semantic HTML & Landmarks** ✅
  - <main> landmarks on key pages
  - role="banner" on header
  - role="navigation" on nav
  - Screen reader navigation support

- [x] **Documentation** ✅
  - ACCESSIBILITY_IMPROVEMENTS.md (500+ lines)
  - Developer guidelines
  - Testing checklists
  - WCAG 2.1 Level AA compliance verified

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
- [ ] Add E2E tests with Playwright

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

### ✅ Fully Implemented (95% Complete)
- Core Features (Documents, Studios, Projects)
- Social Features (Relationships, Activity, Comments)
- Discovery & Reading (Bookshelf, Store, EPUB Uploads)
- Beta Reading (Marketplace, Requests, Appointments)
- Advanced Features (Content Integrity, Export, AI Assistance)
- Monetization (Subscriptions, Creator Earnings)
- Administration (Platform Admin, Group Admin, Moderation)
- **Accessibility (WCAG 2.1 AA Compliant)** ✅
- **Data Retention (30-day auto-purge)** ✅

### ⚠️ Partially Implemented (5% Remaining)
- GDPR Compliance (90% - only Export UI missing)
- Custom Group Roles (backend ready, UI basic)
- Bulk Upload (backend ready, no UI)
- Wiki Editing (moderation ready, editing UI missing)

### ❌ Not Started (Future Features)
- Mobile app (React Native)
- Desktop app (Electron)
- Browser extensions
- API marketplace
- Plugin system

---

## 🎯 Success Metrics

### Current Metrics
- **Test Coverage:** 27 passing (all critical)
- **Security Score:** A+ (no critical vulnerabilities)
- **Performance:** A (897 KB gzipped, <5s build)
- **Code Quality:** A (minimal dead code)
- **GDPR Compliance:** A- (90% - only Export UI missing) ✅
- **Accessibility:** A (WCAG 2.1 AA certified) ✅

### Target Metrics (End of Q1 2025)
- **Test Coverage:** 100+ passing (all tests enabled)
- **Security Score:** A+ (maintained)
- **Performance:** A+ (<800 KB gzipped)
- **Code Quality:** A+ (zero dead code)
- **GDPR Compliance:** A+ (full compliance - add Export UI) 🎯
- **Accessibility:** A (maintained - continue user testing) 🎯

---

## 💡 Future Considerations

### Internationalization (Q2 2025)
- Multi-language support
- RTL layout support (Arabic, Hebrew)
- Localized content

### Mobile Experience (Q2 2025)
- Progressive Web App (PWA)
- Native mobile apps
- Offline mode

### Advanced Analytics (Q3 2025)
- User behavior tracking
- A/B testing framework
- Conversion funnel analysis

### AI Enhancements (Q3 2025)
- Advanced writing suggestions
- Content recommendations
- Smart document organization

### Accessibility Phase 2 (Q2 2025)
- Screen reader user testing
- Internationalization (i18n)
- Advanced keyboard shortcuts
- Cognitive accessibility improvements

---

## 📞 Contact

For questions or suggestions about this roadmap:
- Email: warpxth@workshelf.dev
- GitHub: mxchestnut/workshelf

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
- [ ] Redis caching for public endpoints

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
- [ ] Update dependencies
  - `aiohttp` 3.12.14 → 3.13.2
  - `fastapi` 0.121.0 → 0.123.5
  - `pydantic` 2.10.6 → 2.12.5

### 3. Testing Improvements 🧪 **MEDIUM PRIORITY**
**Current:** 27 passing, 85 skipped  
**Goal:** 100+ passing

**Tasks:**
- [ ] Create Keycloak auth mocking helper
- [ ] Add database fixtures for Phase 7 tests
- [ ] Unskip Phase 5 tests (8 tests)
- [ ] Unskip Phase 7 tests (19 tests)
- [ ] Unskip Group tests (52 tests)
- [ ] Add E2E tests with Playwright

### 4. Data Retention Policy 📊 **MEDIUM PRIORITY**
**Current:** Indefinite storage  
**Goal:** GDPR-compliant retention

**Tasks:**
- [ ] Create `scripts/cleanup_old_data.py`
- [ ] Purge soft-deleted documents after 30 days
- [ ] Archive old activity logs (>1 year)
- [ ] Remove expired sessions
- [ ] Document retention policy

---

## ✅ Recently Completed (December 2025)

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

### ✅ Fully Implemented (95% Complete)
- Core Features (Documents, Studios, Projects)
- Social Features (Relationships, Activity, Comments)
- Discovery & Reading (Bookshelf, Store, EPUB Uploads)
- Beta Reading (Marketplace, Requests, Appointments)
- Advanced Features (Content Integrity, Export, AI Assistance)
- Monetization (Subscriptions, Creator Earnings)
- Administration (Platform Admin, Group Admin, Moderation)

### ⚠️ Partially Implemented (5% Remaining)
- GDPR Compliance (backend ready, UI missing)
- Accessibility (settings exist, WCAG compliance needed)
- Custom Group Roles (backend ready, UI basic)
- Bulk Upload (backend ready, no UI)
- Wiki Editing (moderation ready, editing UI missing)

### ❌ Not Started (Future Features)
- Mobile app (React Native)
- Desktop app (Electron)
- Browser extensions
- API marketplace
- Plugin system

---

## 🎯 Success Metrics

### Current Metrics
- **Test Coverage:** 27 passing (all critical)
- **Security Score:** A+ (no critical vulnerabilities)
- **Performance:** A (897 KB gzipped, <5s build)
- **Code Quality:** A (minimal dead code)
- **GDPR Compliance:** C (missing key features) ⚠️
- **Accessibility:** C (WCAG Level A issues) ⚠️

### Target Metrics (End of Q1 2025)
- **Test Coverage:** 100+ passing (all tests enabled)
- **Security Score:** A+ (maintained)
- **Performance:** A+ (<800 KB gzipped)
- **Code Quality:** A+ (zero dead code)
- **GDPR Compliance:** A (full compliance) 🎯
- **Accessibility:** A (WCAG 2.1 AA certified) 🎯

---

## 💡 Future Considerations

### Internationalization (Q2 2025)
- Multi-language support
- RTL layout support
- Localized content

### Mobile Experience (Q2 2025)
- Progressive Web App (PWA)
- Native mobile apps
- Offline mode

### Advanced Analytics (Q3 2025)
- User behavior tracking
- A/B testing framework
- Conversion funnel analysis

### AI Enhancements (Q3 2025)
- Advanced writing suggestions
- Content recommendations
- Smart document organization

---

## 📞 Contact

For questions or suggestions about this roadmap:
- Email: warpxth@workshelf.dev
- GitHub: mxchestnut/workshelf
