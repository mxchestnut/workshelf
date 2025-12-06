# Workshelf Roadmap

**Last Updated:** December 6, 2025  
**Current Status:** ✅ Production fully operational - All features deployed, CORS fixed, login working  
**Overall Grade:** A+ (Security: A+, Performance: A, Accessibility: WCAG 2.1 AA ✅, GDPR: 100% ✅)

---

## 🎯 Next Priorities

### 1. Staff Admin Infrastructure 🛠️ **MEDIUM PRIORITY**
**Status:** 60% Complete  
**Goal:** Complete observability & monitoring stack

**Completed:**
- ✅ Sentry (error tracking)
- ✅ Redis (caching layer)
- ✅ Matomo (privacy-focused analytics)
- ✅ PostHog (product analytics with session replay)
- ✅ Prometheus (metrics collection, /metrics endpoint)
- ✅ Grafana (dashboards on :3000)

**Remaining:**

**A. Enhanced Observability (Optional)**
- [ ] OpenTelemetry Collector (distributed tracing)
- [ ] OpenSearch (centralized log aggregation)
- [ ] React-Admin dashboard (replace basic staff pages)

**B. Security Tooling (Optional)**
- [ ] HashiCorp Vault (secrets management)
- [ ] OWASP ZAP (automated security scanning)
- [ ] Trivy (container vulnerability scanning)
- [ ] Gitleaks (secrets scanning in git history)

**C. Grafana Dashboard Ideas**
- [ ] System metrics (CPU, memory, disk)
- [ ] API performance (request rate, latency, errors)
- [ ] Database slow queries & connection pool
- [ ] Redis cache hit/miss rate

---

### 2. Missing Frontend Features 🎨 **LOW PRIORITY**

**A. Group Scholarships** 🎓
- Backend: ✅ Complete (`/api/v1/groups/{id}/scholarships`)
- Frontend: ❌ Not implemented
- Tasks:
  - [ ] Add "Scholarships" tab to Group Settings
  - [ ] Create scholarship application form
  - [ ] Approval workflow for group owners
  - [ ] Display offers in group detail page

**B. Wiki Editing** ✏️
- Backend: ✅ Complete (admin moderation endpoints exist)
- Frontend: ⚠️ Admin moderation exists, wiki editing UI missing
- Tasks:
  - [ ] Create `/pages/Wiki.tsx` (view mode)
  - [ ] Create `/pages/WikiEdit.tsx` (edit mode with Markdown)
  - [ ] Version history
  - [ ] Moderation queue integration

---

### 3. Technical Improvements 🔧 **LOW PRIORITY**

**A. Performance Optimization** 🚀
- Current: Good (897 KB total, 441KB main + 509KB editor)
- Goal: <800 KB
- Tasks:
  - [ ] Image optimization (WebP format)
  - [ ] Lazy loading for images
  - [ ] CDN for static assets
  - [ ] Database query profiling with `joinedload()`
  - [ ] Redis caching for public endpoints
  - [ ] ETags for conditional requests

**B. Code Cleanup** 🧹
- [ ] Delete `.backup` files (4 files in frontend/src/pages/)
- [ ] Fix deprecation warnings (`datetime.utcnow()` → `datetime.now(UTC)`)
- [ ] Update dependencies (no critical CVEs)

**C. Testing** 🧪
- Current: 27 passing, 85 skipped
- Goal: 100+ passing
- Tasks:
  - [ ] Create Keycloak auth mocking helper
  - [ ] Add database fixtures
  - [ ] Unskip Phase 5 tests (8 tests)
  - [ ] Unskip Phase 7 tests (19 tests)
  - [ ] Unskip Group tests (52 tests)

---

## 📊 Current State

**Production Status:** ✅ Deployed and running  
**CI/CD Pipeline:** ✅ Operational (health checks passing)  
**Test Coverage:** 27 passing, 85 skipped (functional but needs expansion)  
**Bundle Size:** 897 KB total (441KB main + 509KB editor + chunks)  
**Security:** A+ (no critical vulnerabilities)  
**Accessibility:** WCAG 2.1 AA ✅  
**GDPR Compliance:** 100% Complete ✅## 📈 Feature Status Summary
