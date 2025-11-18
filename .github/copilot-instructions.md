# Copilot Instructions - WorkShelf

## Project Overview
WorkShelf is a security-first, privacy-focused collaborative admin platform with TypeScript throughout. The project emphasizes:
- Zero bloat (no unnecessary code/dependencies)
- Obsessive security and privacy
- WCAG 2.1 AA accessibility compliance
- AWS-based infrastructure (mostly free/cheap tiers)
- Killer admin panel using react-admin

## Stack
- **Frontend**: React + TypeScript + react-admin + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Neon Postgres
- **Auth**: Keycloak
- **Secrets**: HashiCorp Vault
- **Observability**: Sentry + OpenTelemetry + Prometheus + Grafana + CloudWatch
- **Security**: Gitleaks + Trivy + OWASP ZAP
- **Analytics**: Matomo/PostHog (privacy-first)
- **Feature Flags**: Unleash
- **Infrastructure**: AWS CDK (Lambda, API Gateway, CloudFront, CloudWatch)

## Development Guidelines

### Credentials Management
- **ALL credentials go in a single `.env` file at the project root**
- Never hardcode secrets in code
- Use Vault for runtime secret management
- Reference environment variables from `.env` only

### Code Quality
- TypeScript strict mode everywhere
- ESLint + Prettier enforced
- No unused imports or variables
- Comprehensive type coverage

### Security
- Run Gitleaks before every commit
- Trivy scans in CI/CD
- OWASP ZAP for penetration testing
- Input validation on all endpoints
- CSRF protection enabled
- Security headers configured

### Accessibility
- WCAG 2.1 AA compliance mandatory
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Screen reader compatibility

### Privacy
- No third-party analytics (use self-hosted Matomo/PostHog)
- No unnecessary data collection
- Clear privacy controls in admin panel

## Monorepo Structure
```
/packages
  /frontend     # React + react-admin
  /backend      # NestJS API
  /infrastructure  # AWS CDK
  /shared       # Shared types/utils
```

## Workflow
1. Always check for security issues before suggesting code
2. Ensure accessibility in all UI components
3. Keep dependencies minimal
4. Document security-sensitive changes
5. Test with different user roles (RBAC)
