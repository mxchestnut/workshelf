# Workshelf Roadmap

**Last Updated:** December 3, 2025  
**Current Status:** Production-ready with 95% feature parity

---

## 🎯 Immediate Priorities (Week 1-2)

### 1. GDPR Compliance ⚠️ **HIGH PRIORITY**
**Status:** Not Started  
**Deadline:** 2 weeks

- [ ] **Account Deletion Feature**
  - Backend: Cascade delete or anonymize user data
  - Frontend: Add "Delete Account" button in Profile settings
  - Confirmation dialog with password verification
  - Email notification before deletion

- [ ] **Data Export UI**
  - Backend: `/export/gdpr-data` endpoint exists ✅
  - Frontend: Create "Download My Data" page
  - Export format: ZIP with JSON files
  - Include: profile, documents, groups, activity

- [ ] **Privacy Policy Page**
  - Create `/pages/PrivacyPolicy.tsx`
  - Document data collection practices
  - List third-party services (Stripe, Anthropic, Matrix)
  - User rights (GDPR, CCPA compliance)
  - Contact information for data requests

- [ ] **Cookie Consent Banner**
  - Essential cookies disclosure
  - Analytics opt-in/opt-out
  - Remember user preference

### 2. Accessibility (WCAG Level A) ⚠️ **HIGH PRIORITY**
**Status:** Partial Implementation  
**Deadline:** 2 weeks

- [ ] **Icon Button Labels**
  - Add `aria-label` to all icon-only buttons
  - Example: `<button aria-label="Close menu"><X /></button>`
  - Audit: 50+ icon buttons need labels

- [ ] **Image Alt Text**
  - Add descriptive alt text to book covers
  - Add descriptive alt text to user avatars
  - Format: `alt="${username}'s profile picture"`

- [ ] **Form Error Announcements**
  - Add `aria-invalid` to error inputs
  - Add `aria-describedby` to link errors
  - Add `role="alert"` to error messages

- [ ] **Color Contrast**
  - Fix text on gray backgrounds
  - Ensure 4.5:1 contrast ratio (WCAG AA)
  - Test with contrast checker tool

- [ ] **Keyboard Navigation**
  - Add skip link to main content
  - Fix focus traps in modals
  - Test all features keyboard-only

- [ ] **Screen Reader Testing**
  - Test with VoiceOver (macOS)
  - Test with NVDA (Windows)
  - Document screen reader issues

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
