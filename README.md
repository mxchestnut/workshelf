# 🔒 WorkShelf Admin Platform

A **security-first, privacy-focused** collaborative web application with a killer admin panel. Built with TypeScript throughout, emphasizing zero bloat, obsessive security, and WCAG 2.1 AA accessibility compliance.

## 🎯 Features

### Security & Privacy
- 🔐 **Keycloak** authentication with SSO support
- 🗝️ **HashiCorp Vault** for secrets management
- 🔍 **Gitleaks** for secret scanning
- 🛡️ **Trivy** for vulnerability scanning
- 🕵️ **OWASP ZAP** for penetration testing
- 🔒 **All credentials in single `.env` file**

### Observability
- 📊 **Sentry** for error tracking and performance monitoring
- 📈 **OpenTelemetry** for distributed tracing
- 📉 **Prometheus** for metrics collection
- 📊 **Grafana** for visualization dashboards
- ☁️ **AWS CloudWatch** for centralized logging

### Privacy-First Analytics
- 📊 **PostHog** (self-hosted) for product analytics
- 🚫 No third-party tracking
- ✅ Full data ownership

### Development Experience
- ⚡ **Vite** for blazing-fast frontend builds
- 🎨 **Tailwind CSS** + **shadcn/ui** for beautiful, accessible UI
- 🎯 **react-admin** for powerful admin interface
- 🏗️ **NestJS** for robust backend architecture
- 🔄 **Feature flags** with Unleash

## 📦 Tech Stack

### Frontend
- React 18 + TypeScript
- react-admin
- Tailwind CSS + shadcn/ui
- Vite
- Sentry React SDK

### Backend
- NestJS + TypeScript
- Neon Postgres (serverless)
- Passport.js (JWT + Local)
- TypeORM
- Sentry Node SDK

### Infrastructure
- AWS CDK (Infrastructure as Code)
- AWS Lambda + API Gateway
- AWS CloudFront + S3
- AWS CloudWatch

### Security & Observability
- Keycloak (Auth)
- HashiCorp Vault (Secrets)
- Gitleaks (Secret Scanning)
- Trivy (Vulnerability Scanning)
- OWASP ZAP (Penetration Testing)
- Sentry (Error Tracking)
- OpenTelemetry (Tracing)
- Prometheus + Grafana (Metrics)

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 8.x or higher
- **Docker** & **Docker Compose**
- **AWS CLI** (for deployment)
- **Neon Account** (for production database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "Work Shelf 2.0"
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

4. **Start local services** (Keycloak, Vault, Postgres, etc.)
   ```bash
   pnpm docker:up
   ```

5. **Build all packages**
   ```bash
   pnpm build
   ```

6. **Start development servers**
   ```bash
   # Terminal 1 - Frontend
   cd packages/frontend
   pnpm dev

   # Terminal 2 - Backend
   cd packages/backend
   pnpm dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api
   - API Docs: http://localhost:4000/api/docs
   - Keycloak: http://localhost:8080
   - Vault: http://localhost:8200
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001

## 🗂️ Project Structure

```
.
├── .github/
│   ├── copilot-instructions.md    # GitHub Copilot configuration
│   └── workflows/                  # GitHub Actions CI/CD
│       ├── ci-cd.yml
│       ├── dependency-audit.yml
│       └── security.yml
├── packages/
│   ├── shared/                     # Shared types, constants, validators
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── validators.ts
│   │   └── package.json
│   ├── frontend/                   # React + react-admin
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── providers/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── backend/                    # NestJS API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   └── health/
│   │   └── package.json
│   └── infrastructure/             # AWS CDK
│       ├── bin/
│       ├── lib/
│       └── package.json
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── docker-compose.yml              # Local development services
├── prometheus.yml                  # Prometheus configuration
├── .gitleaks.toml                  # Gitleaks secret scanning rules
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # pnpm workspace config
├── tsconfig.json                   # Root TypeScript config
├── .eslintrc.js                    # ESLint configuration
├── .prettierrc.json                # Prettier configuration
└── README.md
```

## 🔐 Security

### Credentials Management

**ALL credentials are stored in a single `.env` file at the project root.**

1. Copy `.env.example` to `.env`
2. Fill in your actual credentials
3. **NEVER commit `.env` to version control**
4. Use Vault for runtime secrets management

### Security Scanning

Run security scans before committing:

```bash
# Check for leaked secrets
pnpm security:gitleaks

# Scan for vulnerabilities
pnpm security:trivy

# Run both
pnpm security:scan
```

### Pre-commit Hooks (Recommended)

Install Gitleaks as a pre-commit hook:

```bash
# Install Gitleaks
brew install gitleaks  # macOS
# or download from: https://github.com/gitleaks/gitleaks/releases

# Add to git hooks
echo "gitleaks protect --staged" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run E2E tests
pnpm test:e2e
```

## 📊 Observability

### Sentry Setup

1. Create a Sentry account at https://sentry.io
2. Create projects for frontend and backend
3. Add DSN to `.env`:
   ```
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### Prometheus + Grafana

Access Grafana at http://localhost:3001 (default password: admin)

1. Add Prometheus data source: http://prometheus:9090
2. Import dashboards from `grafana-dashboards/` (TODO)
3. Monitor metrics in real-time

## 🚢 Deployment

### AWS Deployment

1. **Configure AWS credentials**
   ```bash
   aws configure
   # or use AWS SSO
   ```

2. **Update `.env` with production values**
   ```bash
   AWS_ACCOUNT_ID=123456789012
   AWS_REGION=us-east-1
   DATABASE_URL=postgresql://user:pass@your-neon-db.neon.tech/db
   ```

3. **Deploy infrastructure**
   ```bash
   cd packages/infrastructure
   pnpm deploy
   ```

4. **Deploy via GitHub Actions**
   - Push to `main` branch
   - GitHub Actions will automatically deploy

### Environment Variables for GitHub Actions

Add these secrets to your GitHub repository:

- `AWS_ROLE_ARN` - AWS IAM Role for OIDC
- `AWS_REGION` - AWS Region
- `DATABASE_URL` - Neon Postgres connection string
- `JWT_SECRET` - JWT secret key
- `SENTRY_DSN` - Sentry DSN
- `SENTRY_AUTH_TOKEN` - Sentry auth token
- `SENTRY_ORG` - Sentry organization
- `SENTRY_PROJECT` - Sentry project

## ♿ Accessibility

This project follows **WCAG 2.1 AA** standards:

- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Color contrast compliance

Run accessibility audits:

```bash
# Using axe-core (recommended)
npm install -g @axe-core/cli
axe http://localhost:3000
```

## 📝 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Run checks before pushing**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm security:scan
   pnpm test
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature
   ```

5. **CI/CD will automatically run**
   - Linting
   - Type checking
   - Security scanning
   - Tests
   - Build

## 🛠️ Useful Commands

```bash
# Development
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier
pnpm type-check       # Type check all packages

# Security
pnpm security:scan    # Run all security scans
pnpm security:gitleaks # Scan for secrets
pnpm security:trivy   # Scan for vulnerabilities

# Docker
pnpm docker:up        # Start local services
pnpm docker:down      # Stop local services

# AWS
pnpm cdk:deploy       # Deploy to AWS
pnpm cdk:synth        # Synthesize CloudFormation
pnpm cdk:diff         # Show deployment diff
```

## 📚 Documentation

- [Frontend Documentation](./packages/frontend/README.md)
- [Backend Documentation](./packages/backend/README.md)
- [Infrastructure Documentation](./packages/infrastructure/README.md)
- [Security Guidelines](./.github/SECURITY.md)
- [Contributing Guidelines](./.github/CONTRIBUTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and security scans
5. Submit a pull request

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

## 🆘 Support

- 📧 Email: support@yourplatform.com
- 💬 Discord: https://discord.gg/yourserver
- 📖 Documentation: https://docs.yourplatform.com

## 🎯 Roadmap

- [ ] Multi-factor authentication (MFA)
- [ ] Real-time collaboration with Yjs
- [ ] Mobile app (React Native)
- [ ] Advanced RBAC with custom policies
- [ ] Integration with more identity providers
- [ ] Advanced analytics dashboards
- [ ] Automated backups and disaster recovery

---

**Built with ❤️ for security, privacy, and accessibility**
