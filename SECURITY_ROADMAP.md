# WorkShelf Security & Operations Roadmap

## 🟢 Phase 1: IMPLEMENTED ✅

### HashiCorp Vault - Secrets Management
- **Status:** ✅ Added to docker-compose.yml
- **Access:** http://localhost:8200 (dev mode)
- **Root Token:** Set via `VAULT_ROOT_TOKEN` env var (default: workshelf-dev-token)
- **Usage:**
  ```bash
  # Store secrets
  vault kv put secret/workshelf/db password=supersecret
  
  # Read secrets
  vault kv get secret/workshelf/db
  ```
- **Integration:** Backend can read secrets via Vault API
- **Production:** Switch to production mode with proper storage backend

### Trivy - Security Scanner
- **Status:** ✅ Integrated into GitHub Actions CI
- **Features:**
  - Scans filesystem for vulnerabilities
  - Scans configuration files (docker-compose, Kubernetes, etc.)
  - Results uploaded to GitHub Security tab
  - Runs on every push/PR
- **Reports:** Available in GitHub Security → Code scanning alerts

### ModSecurity - Web Application Firewall
- **Status:** ✅ Integrated into Nginx frontend
- **Features:**
  - OWASP Core Rule Set v4 (Paranoia Level 1)
  - SQL Injection protection
  - XSS protection
  - Path traversal prevention
  - Rate limiting (100 req/min per IP)
  - Audit logging
- **Logs:** `/var/log/nginx/modsec_audit.log` in container
- **Configuration:** `frontend/modsecurity.conf`

---

## 🟡 Phase 2: Important (Requires Bigger Instance)

**Prerequisites:**
- Upgrade EC2: t3.medium → **t3.xlarge** (4 vCPU, 16GB RAM)
- Estimated cost: ~$120/month (up from ~$30/month)

### 1. OpenTelemetry - Distributed Tracing & Observability
**Why:** Understand request flows across microservices

**Implementation:**
- Add OpenTelemetry Collector container
- Instrument FastAPI backend with auto-instrumentation
- Instrument React frontend with web SDK
- Connect to existing Prometheus/Grafana

**Features:**
- Distributed tracing (see full request path)
- Performance metrics
- Error tracking with context
- Custom business metrics

**Resources:**
- CPU: 0.5 cores
- RAM: 512MB
- Storage: 1GB

**Configuration:**
```yaml
# docker-compose.yml addition
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  command: ["--config=/etc/otel-collector-config.yaml"]
  volumes:
    - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
  ports:
    - "4317:4317"  # OTLP gRPC
    - "4318:4318"  # OTLP HTTP
```

**Integration:**
- Backend: `pip install opentelemetry-instrumentation-fastapi`
- Frontend: `npm install @opentelemetry/sdk-web`

---

### 2. Unleash - Feature Flags
**Why:** Roll out features safely, A/B testing, gradual rollouts

**Implementation:**
- Add Unleash server container
- Add Unleash admin UI
- Integrate SDKs in frontend/backend

**Features:**
- Toggle features without deployment
- Gradual rollouts (10% → 50% → 100%)
- User-based targeting
- A/B testing built-in

**Resources:**
- CPU: 0.5 cores
- RAM: 512MB
- Storage: PostgreSQL (uses existing)

**Configuration:**
```yaml
unleash:
  image: unleashorg/unleash-server:latest
  environment:
    DATABASE_URL: ${UNLEASH_DATABASE_URL}
    DATABASE_SSL: "false"
  ports:
    - "4242:4242"
```

**Usage:**
```typescript
// Frontend
import { useFlag } from '@unleash/proxy-client-react';

function MyComponent() {
  const newFeatureEnabled = useFlag('roleplay-maps');
  return newFeatureEnabled ? <MapsFeature /> : <LegacyView />;
}
```

---

### 3. Matomo - Self-Hosted Analytics
**Why:** Privacy-friendly analytics, GDPR compliant

**Implementation:**
- Add Matomo container
- Add MariaDB for Matomo data
- Configure tracking script

**Features:**
- Page views, user flows
- Event tracking
- Heatmaps (with plugin)
- E-commerce tracking
- Privacy controls (anonymize IP, respect DNT)

**Resources:**
- CPU: 1 core
- RAM: 2GB
- Storage: 10GB (grows with data)

**Configuration:**
```yaml
matomo:
  image: matomo:latest
  environment:
    MATOMO_DATABASE_HOST: postgres
    MATOMO_DATABASE_DBNAME: matomo
  ports:
    - "127.0.0.1:8888:80"
  volumes:
    - matomo_data:/var/www/html
```

**Integration:**
```html
<!-- Add to frontend/index.html -->
<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="//matomo.workshelf.dev/";
    _paq.push(['setTrackerUrl', u+'matomo.php']);
    _paq.push(['setSiteId', '1']);
  })();
</script>
```

---

## 🟠 Phase 3: Nice to Have (Consider Managed Services)

### 1. PostHog - Product Analytics (Cloud Recommended)
**Why:** User behavior analytics, session replay

**Cloud Option (Recommended):**
- Use PostHog Cloud: $0-$450/month depending on volume
- No infrastructure burden
- Already have API key in .env

**Self-Hosted Option:**
- Requires: 8GB RAM minimum
- 3-5 containers (PostHog, ClickHouse, Redis, Worker, Plugins)
- Complex to maintain

**Recommendation:** Keep using PostHog Cloud

---

### 2. SonarQube - Code Quality Analysis
**Why:** Code smells, bugs, security hotspots, technical debt

**Cloud Option (Recommended):**
- SonarCloud: Free for open source
- $10/month for private repos

**Self-Hosted Option:**
- Requires: 4GB RAM minimum
- PostgreSQL database
- Heavy on startup (2-3 minutes)

**Configuration (Self-Hosted):**
```yaml
sonarqube:
  image: sonarqube:community
  environment:
    SONAR_JDBC_URL: jdbc:postgresql://postgres:5432/sonarqube
  ports:
    - "127.0.0.1:9000:9000"
  volumes:
    - sonarqube_data:/opt/sonarqube/data
```

**Recommendation:** Use SonarCloud unless you need self-hosted

---

### 3. OpenSearch - Log Aggregation & Search
**Why:** Centralized logging, powerful search, visualizations

**Requirements:**
- **Minimum:** 4GB RAM dedicated
- **Recommended:** 8GB RAM
- ElasticSearch-compatible
- 3 components: OpenSearch, OpenSearch Dashboards, Logstash/Fluentd

**Alternative (Better for your scale):**
- Use **Grafana Loki** instead (already have Grafana!)
- Much lighter: 512MB RAM
- Integrates with existing Prometheus/Grafana
- Purpose-built for logs (not general search)

**Loki Configuration:**
```yaml
loki:
  image: grafana/loki:latest
  ports:
    - "127.0.0.1:3100:3100"
  volumes:
    - loki_data:/loki

promtail:
  image: grafana/promtail:latest
  volumes:
    - /var/log:/var/log
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
  command: -config.file=/etc/promtail/config.yml
```

**Recommendation:** Use Grafana Loki instead of OpenSearch

---

## 📊 Resource Summary

### Current Infrastructure:
- **EC2 Instance:** t3.medium (2 vCPU, 4GB RAM)
- **Monthly Cost:** ~$30
- **Containers:** 9

### After Phase 1:
- **EC2 Instance:** t3.medium (same)
- **Monthly Cost:** ~$30
- **Containers:** 10 (+Vault)
- **Impact:** Minimal (Vault is lightweight)

### After Phase 2:
- **EC2 Instance:** t3.xlarge (4 vCPU, 16GB RAM)
- **Monthly Cost:** ~$120
- **Containers:** 14 (+OTel, Unleash, Matomo, MariaDB)
- **Impact:** Moderate load

### After Phase 3 (Full):
- **EC2 Instance:** t3.2xlarge (8 vCPU, 32GB RAM)
- **Monthly Cost:** ~$240
- **Containers:** 18-20
- **Impact:** High - not recommended

### After Phase 3 (Smart):
- **EC2 Instance:** t3.xlarge (same as Phase 2)
- **Monthly Cost:** ~$120 + ~$50 cloud services = ~$170
- **Containers:** 16 (+Loki, Promtail)
- **Cloud Services:** PostHog, SonarCloud
- **Impact:** Manageable

---

## 🎯 Recommended Implementation Timeline

### Week 1: Phase 1 (Current)
- ✅ HashiCorp Vault
- ✅ Trivy scanning
- ✅ ModSecurity WAF

### Week 2-3: Phase 2 Core
1. Upgrade EC2 to t3.xlarge
2. Add OpenTelemetry
3. Add Unleash feature flags

### Week 4: Phase 2 Analytics
4. Add Matomo analytics
5. Configure dashboards

### Week 5: Phase 3 Logging
6. Add Grafana Loki + Promtail
7. Integrate logs with Grafana

### Ongoing: Cloud Services
- Keep PostHog Cloud (already using)
- Sign up for SonarCloud
- Set up Loki log queries

---

## 🔧 Maintenance Considerations

### Daily Monitoring:
- Vault health checks
- Trivy scan results in GitHub
- ModSecurity blocked requests
- Resource usage (disk, memory, CPU)

### Weekly Reviews:
- Security scan results
- Feature flag usage
- Analytics insights
- Log patterns

### Monthly Tasks:
- Update Docker images
- Review Vault secrets rotation
- Check cost vs. budget
- Performance optimization

---

## 🚀 Quick Start Commands

### After Phase 1:
```bash
# Start Vault
docker-compose up -d vault

# Access Vault
docker exec -it workshelf-vault sh
vault login workshelf-dev-token
vault kv put secret/test value=hello

# View ModSecurity logs
docker exec workshelf-frontend-1 tail -f /var/log/nginx/modsec_audit.log

# Check Trivy results
# Go to: https://github.com/YOUR_REPO/security/code-scanning
```

### After Phase 2:
```bash
# Check OpenTelemetry traces
# Go to: http://localhost:16686 (Jaeger UI)

# Access Unleash admin
# Go to: http://localhost:4242
# Default: admin / unleash4all

# View Matomo analytics
# Go to: http://localhost:8888
```

### After Phase 3:
```bash
# Query Loki logs
# Go to: http://localhost:3000 (Grafana)
# Add Loki data source
# Query: {container="workshelf-backend"}
```

---

## 📞 External Service Sign-ups Needed

### Phase 2:
- None (all self-hosted)

### Phase 3 (Cloud Option):
1. **SonarCloud** (Recommended)
   - Sign up: https://sonarcloud.io
   - Connect GitHub repo
   - Free for open source

2. **PostHog Cloud** (Already using)
   - You have: phc_GnJ8zb09tygMcjttDyBrcY3lULGThdeQc8IpP695rpb
   - Dashboard: https://app.posthog.com

### No Sign-up Needed:
- Trivy (runs in CI)
- GitGuardian (you have pre-commit hooks)
- All self-hosted services

---

## 💰 Cost Comparison

| Option | Infrastructure | Cloud Services | Total/Month |
|--------|---------------|----------------|-------------|
| **Current** | $30 (t3.medium) | $0 | $30 |
| **Phase 1** | $30 (t3.medium) | $0 | $30 |
| **Phase 2** | $120 (t3.xlarge) | $0 | $120 |
| **Phase 3 (Full Self-Host)** | $240 (t3.2xlarge) | $0 | $240 |
| **Phase 3 (Smart Cloud)** | $120 (t3.xlarge) | $50 | $170 |

**Recommendation:** Smart Cloud approach saves $70/month vs. full self-host

---

## ✅ Success Metrics

### Security:
- Zero secrets in code (Vault)
- Zero high/critical CVEs (Trivy)
- 90%+ blocked attacks (ModSecurity)

### Observability:
- <500ms P95 latency (OpenTelemetry)
- 99.9% uptime
- Log search <2s (Loki)

### Product:
- 5+ active feature flags (Unleash)
- User analytics coverage (Matomo)
- Session replay enabled (PostHog)

---

## 🎓 Learning Resources

### Vault:
- Docs: https://developer.hashicorp.com/vault/docs
- Tutorial: https://learn.hashicorp.com/vault

### Trivy:
- Docs: https://aquasecurity.github.io/trivy/
- GitHub Action: https://github.com/marketplace/actions/aqua-security-trivy

### ModSecurity:
- Core Rule Set: https://coreruleset.org/
- Rules: https://github.com/coreruleset/coreruleset

### OpenTelemetry:
- Docs: https://opentelemetry.io/docs/
- Python: https://opentelemetry.io/docs/instrumentation/python/

### Unleash:
- Docs: https://docs.getunleash.io/
- React SDK: https://docs.getunleash.io/sdks/react

### Grafana Loki:
- Docs: https://grafana.com/docs/loki/
- LogQL: https://grafana.com/docs/loki/latest/query/

---

**Last Updated:** December 14, 2025
**Next Review:** After Phase 1 deployment testing
