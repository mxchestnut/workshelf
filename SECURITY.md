# WorkShelf Security & Compliance Setup

## 🔒 Security-First Architecture

This document outlines the comprehensive security measures implemented in WorkShelf.

## Table of Contents

1. [Secrets Management](#secrets-management)
2. [Authentication & Authorization](#authentication--authorization)
3. [Security Scanning](#security-scanning)
4. [Observability & Monitoring](#observability--monitoring)
5. [Privacy-First Analytics](#privacy-first-analytics)
6. [Network Security](#network-security)

## Secrets Management

### HashiCorp Vault

- **Purpose**: Centralized secrets management
- **Access**: https://admin.workshelf.dev/vault
- **Configuration**: Dev mode with root token stored in AWS Secrets Manager
- **Production**: Use auto-unseal with AWS KMS

### AWS Secrets Manager

- Stores credentials for:
  - Keycloak admin credentials
  - Database passwords
  - Vault root token
  - Service-to-service authentication

### Environment Variables

- **NEVER commit `.env` to git**
- Use `.env.example` as template
- All credentials loaded from environment at runtime
- No hardcoded secrets in code

## Authentication & Authorization

### Keycloak

- **URL**: https://keycloak.workshelf.dev
- **Features**:
  - OIDC/OAuth2 provider
  - SAML 2.0 support
  - Matrix/Synapse integration via OIDC
  - Role-Based Access Control (RBAC)
  - MFA support

### Keycloak ↔ Matrix Integration

1. **Keycloak Configuration**:
   - Create client: `matrix-synapse`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `https://chat.workshelf.dev/_synapse/client/oidc/callback`
2. **Synapse Configuration**:
   ```yaml
   oidc_providers:
     - idp_id: keycloak
       idp_name: WorkShelf SSO
       issuer: 'https://keycloak.workshelf.dev/realms/workshelf'
       client_id: 'matrix-synapse'
       client_secret: '${KEYCLOAK_CLIENT_SECRET}'
       scopes: ['openid', 'profile', 'email']
       user_mapping_provider:
         config:
           localpart_template: '{{ user.preferred_username }}'
           display_name_template: '{{ user.name }}'
   ```

### Tailscale (Admin Access Only)

- **Purpose**: Secure access to admin.workshelf.dev
- **Configuration**: Keycloak SSO integration
- **Authorized User**: warpath only
- **Implementation**: Tailscale sidecar in ECS tasks

## Security Scanning

### Gitleaks

- **Purpose**: Prevent secret leaks in git
- **Usage**: Pre-commit and CI/CD
- **Installation**: `brew install gitleaks`
- **Run**: `gitleaks detect --no-git -v`

### Trivy

- **Purpose**: Container vulnerability scanning
- **Scans**: Docker images, IaC, filesystems
- **CI Integration**: Automated on every PR/push
- **Run**: `trivy image <image-name>`

### OWASP ZAP

- **Purpose**: Web application penetration testing
- **Mode**: Baseline and full scan
- **CI Integration**: Weekly full scans
- **Run**: `docker run -v $(pwd):/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://admin.workshelf.dev`

## Observability & Monitoring

### Sentry

- **Purpose**: Error tracking and performance monitoring
- **Access**: https://admin.workshelf.dev/sentry
- **Features**:
  - Real-time error tracking
  - Performance monitoring
  - Release tracking
  - Source map support

### OpenTelemetry

- **Purpose**: Distributed tracing and metrics
- **Exporters**: Prometheus, Jaeger
- **Configuration**: OTLP endpoint at http://localhost:4318

### Prometheus

- **Purpose**: Metrics collection and alerting
- **Access**: https://admin.workshelf.dev/prometheus
- **Scrape Targets**:
  - Backend API metrics
  - ECS task metrics
  - RDS metrics
  - ALB metrics

### Grafana

- **Purpose**: Metrics visualization
- **Access**: https://admin.workshelf.dev/grafana
- **Data Sources**:
  - Prometheus
  - CloudWatch
  - OpenSearch

### OpenSearch

- **Purpose**: Log aggregation and search
- **Access**: https://admin.workshelf.dev/opensearch
- **Use Cases**:
  - Centralized logging
  - Log analysis
  - Security event monitoring

## Privacy-First Analytics

### Matomo

- **Purpose**: Privacy-respecting web analytics
- **Access**: https://admin.workshelf.dev/matomo
- **Features**:
  - Self-hosted (no data to third parties)
  - GDPR compliant
  - Cookie-free tracking option
  - IP anonymization

### PostHog

- **Purpose**: Product analytics and feature flags
- **Access**: https://admin.workshelf.dev/posthog
- **Features**:
  - Self-hosted
  - Session recording (with privacy controls)
  - Feature flags
  - A/B testing

### Unleash

- **Purpose**: Feature flag management
- **Access**: https://admin.workshelf.dev/unleash
- **Features**:
  - Feature toggles
  - Gradual rollouts
  - A/B testing
  - Kill switches

## Network Security

### AWS Infrastructure

- **VPC**: Default VPC with public/private subnets
- **Security Groups**:
  - ALB: 80, 443 (public)
  - ECS Tasks: Internal only
  - RDS: 5432 (ECS tasks only)

### SSL/TLS

- **Certificate**: AWS ACM wildcard cert for `*.workshelf.dev`
- **Provider**: Amazon
- **Renewal**: Automatic
- **Protocols**: TLS 1.2, TLS 1.3 only

### CloudFront

- **Purpose**: CDN for static frontend
- **Features**:
  - HTTPS only
  - HTTP → HTTPS redirect
  - WAF integration (future)
  - DDoS protection

### Application Load Balancers

1. **Keycloak ALB**: `keycloak.workshelf.dev`
2. **Synapse ALB**: `chat.workshelf.dev`
3. **Admin Tools ALB**: `admin.workshelf.dev/*`
   - `/vault` → Vault
   - `/grafana` → Grafana
   - `/prometheus` → Prometheus
   - `/posthog` → PostHog
   - `/unleash` → Unleash
   - `/sentry` → Sentry
   - `/opensearch` → OpenSearch
   - `/matomo` → Matomo

## Security Best Practices

### Pre-Commit Checklist

- [ ] Run `gitleaks detect --no-git -v`
- [ ] No secrets in code
- [ ] All deps up to date
- [ ] Tests passing
- [ ] Linter passing

### Deployment Checklist

- [ ] Secrets rotated
- [ ] Trivy scan passed
- [ ] OWASP ZAP baseline passed
- [ ] All services healthy
- [ ] Monitoring alerts configured
- [ ] Backup verified

### Incident Response

1. **Detection**: Sentry, CloudWatch, Prometheus alerts
2. **Investigation**: Check logs in OpenSearch
3. **Mitigation**: Feature flags (Unleash) for quick rollback
4. **Communication**: Matrix for team coordination
5. **Post-Mortem**: Document in admin panel

## Access Control Matrix

| Service        | Public    | Authenticated | Admin (warpath) |
| -------------- | --------- | ------------- | --------------- |
| Frontend       | ✓         | ✓             | ✓               |
| Backend API    | -         | ✓             | ✓               |
| Keycloak       | ✓ (login) | ✓             | ✓               |
| Matrix/Synapse | -         | ✓             | ✓               |
| Admin Panel    | -         | -             | ✓ (Tailscale)   |
| Vault          | -         | -             | ✓               |
| Grafana        | -         | -             | ✓               |
| Prometheus     | -         | -             | ✓               |
| Sentry         | -         | -             | ✓               |
| OpenSearch     | -         | -             | ✓               |
| Matomo         | -         | -             | ✓               |
| PostHog        | -         | -             | ✓               |
| Unleash        | -         | -             | ✓               |

## Compliance

### WCAG 2.1 AA

- All UI components are accessible
- Keyboard navigation supported
- Screen reader compatible
- Color contrast verified

### GDPR

- Privacy policy implemented
- Cookie consent (where applicable)
- Data deletion capability
- Data export capability
- Self-hosted analytics (no data to third parties)

### SOC 2 (Future)

- Audit logging implemented
- Access controls documented
- Incident response plan
- Regular security assessments

## Credential Rotation Schedule

| Credential       | Frequency           | Last Rotated | Method                   |
| ---------------- | ------------------- | ------------ | ------------------------ |
| DB Passwords     | 90 days             | [Date]       | AWS Secrets Manager      |
| Keycloak Admin   | 90 days             | [Date]       | Manual + Secrets Manager |
| Vault Root Token | Never (seal/unseal) | N/A          | Auto-unseal with KMS     |
| AWS Keys         | 90 days             | [Date]       | IAM                      |
| API Keys         | 180 days            | [Date]       | Per-service              |

## Emergency Contacts

- **Security Lead**: [Your Name]
- **On-Call**: [Rotation]
- **AWS Support**: Premium Support Plan
- **Keycloak**: Community / Commercial Support

---

**Last Updated**: November 18, 2025  
**Next Review**: February 18, 2026
