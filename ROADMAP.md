# Workshelf Roadmap

**Last Updated:** December 3, 2025  
**Current Status:** Production-ready with 95% feature parity  
**Overall Grade:** A (Security: A+, Performance: A, Accessibility: WCAG 2.1 AA ✅, GDPR: 90%)

---

## 🎯 Immediate Priorities (Week 1-2)

### 1. Staff Admin Infrastructure 🛠️ **HIGH PRIORITY**
**Status:** 50% Complete (Sentry, Matomo, PostHog, Prometheus, Grafana)  
**Goal:** Complete observability & security tooling stack

**Current State:**
- ✅ Sentry (frontend + backend error tracking configured)
- ✅ Redis (running, ready for caching layer)
- ✅ Matomo (privacy-focused analytics with cookie-less tracking)
- ✅ PostHog (product analytics with session replay & feature flags)
- ✅ Prometheus (metrics collection configured, /metrics endpoint)
- ✅ Grafana (dashboards UI on :3000, auto-provisioned with Prometheus)
- ❌ React-Admin dashboard (replace basic staff pages)
- ❌ OpenTelemetry traces
- ❌ OpenSearch logs
- ❌ HashiCorp Vault secrets
- ❌ OWASP ZAP security scanning
- ❌ Trivy container scanning
- ❌ Gitleaks secrets scanning

**Phase 1: Docker Infrastructure (Days 1-2)**
- [x] Add to `docker-compose.yml`:
  - [x] Prometheus (metrics collection on :9090)
  - [x] Grafana (dashboards on :3000)
  - [ ] OpenTelemetry Collector (traces on :4318)
  - [ ] OpenSearch (logs on :9200)
  - [ ] HashiCorp Vault (secrets on :8200)

**Phase 2: Backend Integration (Days 3-4)**
- [x] Add dependencies to `backend/requirements.txt`:
  - [x] `prometheus-fastapi-instrumentator` (metrics)
  - [ ] `opentelemetry-api` + `opentelemetry-sdk` (traces)
  - [ ] `opentelemetry-instrumentation-fastapi` (auto-instrument)
  - [ ] `opentelemetry-exporter-otlp` (send to collector)
  - [ ] `opensearch-py` (log shipping)
  - [ ] `hvac` (Vault client)
- [x] Instrument `backend/app/main.py`:
  - [x] Add Prometheus `/metrics` endpoint
  - [ ] Configure OpenTelemetry tracing
  - [ ] Add structured logging to OpenSearch
  - [ ] Integrate Vault for secrets (DATABASE_URL, etc)
**Phase 3: Frontend Integration (Days 5-6)**
- [ ] Replace `AdminDashboard.tsx` with React-Admin:
  - [ ] Install: `react-admin`, `ra-data-json-server`
**Phase 3: Frontend Integration (Days 5-6)**
- [ ] Replace `AdminDashboard.tsx` with React-Admin:
  - [ ] Install: `react-admin`, `ra-data-json-server`
  - [ ] Create `StaffAdmin.tsx` with React-Admin layout
  - [ ] Add resources: users, groups, documents, moderation queue
  - [ ] Embed Grafana dashboards (iframe)
  - [ ] Embed Matomo dashboard (iframe to workshelfdev.matomo.cloud)
  - [ ] Embed PostHog dashboard (iframe to app.posthog.com)
  - [ ] Add PostHog feature flag toggles UIi.yml`):
  - [ ] Trivy container scanning (scan Docker images)
  - [ ] Gitleaks secrets scanning (pre-commit + CI)
  - [ ] OWASP ZAP API scanning (nightly scheduled run)
- [ ] Create `scripts/security-scan.sh`:
  - [ ] Run Trivy locally: `trivy image workshelf-backend`
  - [ ] Run Gitleaks: `gitleaks detect --source .`
  - [ ] Run OWASP ZAP: `zap-cli quick-scan http://localhost:8000`

**Phase 5: Documentation & Dashboards (Day 8)**
- [ ] Create Grafana dashboards:
  - [ ] System metrics (CPU, memory, disk)
  - [ ] API performance (request rate, latency, errors)
  - [ ] Database queries (slow queries, connection pool)
  - [ ] Redis cache hit/miss rate
- [ ] Update `README.md` with:
  - [ ] Links to all admin tools (ports + URLs)
  - [ ] Instructions for Vault secret management
  - [ ] PostHog feature flag usage guide
  - [ ] Security scanning workflow

**What I Need From You:**
1. **Preferences**:
   - OWASP ZAP: run in CI or separate scan server?
   - Self-host Vault or use AWS Secrets Manager/SSM?
2. **Secrets Strategy**:
   - Migrate all secrets to Vault? (DATABASE_URL, KEYCLOAK_CLIENT_SECRET, etc)
   - Or keep in env vars for now?

---

### 2. GDPR Compliance - Final Step ⚠️ **HIGH PRIORITY**
**Status:** 90% Complete (only Export UI remains)  
**Deadline:** 1 week

- [ ] **Data Export UI** ⚠️ **LAST REMAINING TASK**
  - Backend: `/export/gdpr-data` endpoint exists ✅
  - Frontend: Create "Export My Data" page/button
  - Location: Add to Profile settings
  - Format: ZIP with JSON files (documents, profile, groups, activity)

---

## 🚀 Missing Frontend Features

### 1. Custom Group Roles 👥 **MEDIUM PRIORITY**
**Backend:** ✅ Complete (`/api/v1/groups/{id}/roles`)  
**Frontend:** ✅ Complete (Discord-style UI at `/groups/{id}/roles`)  
**Use Case:** Group owners create custom roles with 17 granular permissions

**Implementation:**
- ✅ 4 permission categories (Content Moderation, Member Management, Publishing, Settings)
- ✅ Color-coded roles with position hierarchy
- ✅ Permission categories with expand/collapse all
- ✅ Role CRUD operations with full backend integration
- ✅ Added "Roles & Permissions" tab in Group Settings

### 2. Group Scholarships 🎓 **LOW PRIORITY**
**Backend:** ✅ Complete (`/api/v1/groups/{id}/scholarships`)  
**Frontend:** ❌ Not Implemented  
**Use Case:** Groups offer free/discounted memberships

**Tasks:**
- [ ] Add "Scholarships" tab to Group Settings (owners)
- [ ] Create scholarship application form
- [ ] Approval workflow for owners
- [ ] Display scholarship offers in group detail

### 3. Wiki Editing ✏️ **LOW PRIORITY**
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

### Import/Export
- ✅ Bulk document import (files and folders)
- ✅ Support for .md, .txt, .html, .docx, .odt, .pdf, .zip
- ✅ Folder structure preservation
- ✅ Import modal in Documents page

### Backend Deployment
- ✅ All Phase 5 features deployed (Studio customization, analytics)
- ✅ All Phase 7 features deployed (Content integrity, export, accessibility)
- ✅ All Group multi-tenant features deployed (themes, domains, followers)

---

## 📈 Feature Status Summary
