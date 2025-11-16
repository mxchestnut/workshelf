# 🔧 Setting Up Monitoring & Observability Tools

This guide walks you through setting up all the free/open-source monitoring tools for WorkShelf.

## ✅ Already Configured

### 1. Sentry (Error Tracking)
- **Status**: Configured ✅
- **URL**: https://sentry.io
- **What it does**: Captures all errors with full stack traces
- **Cost**: Free tier (5k errors/month)

## 📋 Setup Instructions

### 2. Terraform Cloud (Infrastructure Management)

**Why**: Auto-plan on PRs, auto-apply on merge, remote state storage

**Setup**:
1. Go to https://app.terraform.io
2. Create free account
3. Create organization: "workshelf"
4. Create workspace: "workshelf-production"
   - Choose "Version Control Workflow"
   - Connect to GitHub repo: `mxchestnut/workshelf`
   - Set working directory: `infrastructure/terraform`
5. Add environment variables:
   ```
   AWS_ACCESS_KEY_ID (sensitive)
   AWS_SECRET_ACCESS_KEY (sensitive)
   TF_VAR_domain_name = workshelf.dev
   ```
6. Update `backend.tf`:
   ```hcl
   terraform {
     cloud {
       organization = "workshelf"
       workspaces {
         name = "workshelf-production"
       }
     }
   }
   ```

**Result**: Every PR shows Terraform plan, merge auto-applies changes

---

### 3. Grafana Cloud (Logs & Metrics)

**Why**: Better log search than CloudWatch, beautiful dashboards, 50GB free

**Setup**:
1. Go to https://grafana.com/auth/sign-up/create-user
2. Create free account
3. Create stack (choose region close to us-east-1)
4. Go to "Connections" → "Add new connection" → "AWS CloudWatch"
5. Add CloudWatch data source:
   - Use AWS IAM role or access keys
   - Region: us-east-1
   - Log groups: `/ecs/workshelf/backend`
6. Create dashboard:
   - New Dashboard → Add visualization
   - Query: `{job="ecs-workshelf"} |= "ERROR"`
7. Set up alerts:
   - Alert rules → New alert rule
   - Condition: `count(rate({job="ecs-workshelf"} |= "ERROR"[5m])) > 10`
   - Send to: Email

**Bonus**: Install Loki agent on ECS:
```yaml
# Add to docker-compose or ECS task
loki:
  image: grafana/promtail:latest
  volumes:
    - /var/log:/var/log
  command: -config.file=/etc/promtail/config.yml
```

**Result**: Beautiful dashboards, instant log search, automatic alerting

---

### 4. pgAnalyze (PostgreSQL Monitoring)

**Why**: Detects slow queries automatically, suggests indexes, free for 1 database

**Setup**:
1. Go to https://pganalyze.com/signup
2. Create free account
3. Add database server:
   - Name: workshelf-production
   - Hostname: `workshelf-db.c47iwe0is948.us-east-1.rds.amazonaws.com`
   - Port: 5432
   - Database: workshelf_db
   - Username: (from secrets)
   - Password: (from secrets)
4. Install pganalyze collector (via Docker):
   ```bash
   docker run -d \
     --name pganalyze-collector \
     -e DB_HOST=workshelf-db.c47iwe0is948.us-east-1.rds.amazonaws.com \
     -e DB_NAME=workshelf_db \
     -e DB_USERNAME=workshelf_user \
     -e DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id workshelf/database-url --query SecretString --output text | cut -d: -f3 | cut -d@ -f1) \
     -e PGA_API_KEY=<your-api-key> \
     quay.io/pganalyze/collector:stable
   ```
5. Or add to ECS task definition (recommended for production)

**Result**: Automatic slow query detection, index recommendations, query performance history

---

### 5. Flagsmith (Feature Flags)

**Why**: Turn features on/off without deploying, A/B testing, gradual rollouts

**Option A: Cloud (Easiest)**
1. Go to https://flagsmith.com/signup
2. Create free account (50k requests/month)
3. Create project: "WorkShelf"
4. Create environments: "development", "production"
5. Get API keys from Settings
6. Add to backend `.env`:
   ```
   FLAGSMITH_API_KEY=<your-key>
   ```
7. Install SDK:
   ```bash
   pip install flagsmith
   ```
8. Use in code:
   ```python
   from flagsmith import Flagsmith
   
   flagsmith = Flagsmith(environment_key=os.getenv("FLAGSMITH_API_KEY"))
   
   if flagsmith.has_feature("new_project_ui"):
       # Show new UI
   ```

**Option B: Self-Hosted (Free Forever)**
1. Add to docker-compose.yml:
   ```yaml
   flagsmith:
     image: flagsmith/flagsmith:latest
     ports:
       - "8001:8000"
     environment:
       DATABASE_URL: postgresql://...
       DJANGO_SECRET_KEY: <generate-secret>
   ```
2. Access at http://localhost:8001
3. Use self-hosted API URL in backend

**Result**: Feature toggles, gradual rollouts, A/B testing, instant feature disable

---

### 6. GitHub Actions Secrets

**Why**: Secure storage for API keys, automatically injected into workflows

**Setup**:
1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Add repository secrets:
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   SENTRY_DSN
   ```
3. (Optional) Add environment-specific secrets:
   - Environment: production
   - Secrets: Same as above

**Result**: Workflows can access secrets securely, never exposed in logs

---

## 🎯 Recommended Setup Order

1. **Today**: 
   - ✅ Sentry (already done!)
   - GitHub Actions secrets
   - Pre-commit hooks: `make pre-commit-setup`

2. **This Week**:
   - Terraform Cloud (saves time on infrastructure changes)
   - Grafana Cloud (better than tailing logs)

3. **Next Week**:
   - pgAnalyze (catch slow queries before users complain)
   - Flagsmith (useful when you start A/B testing)

4. **Later**:
   - E2E tests (add as you build features)

---

## 📊 Summary

| Tool | Cost | Setup Time | Value |
|------|------|------------|-------|
| Sentry | Free | ✅ Done | 🔥 High - Catch errors instantly |
| GitHub Actions | Free | 10 min | 🔥 High - Auto-deploy, no manual work |
| Terraform Cloud | Free | 15 min | 🔥 High - Safe infrastructure changes |
| Pre-commit | Free | 5 min | 🔥 High - Catch issues before commit |
| Grafana Cloud | Free | 20 min | 💎 Medium - Better than CloudWatch |
| pgAnalyze | Free | 15 min | 💎 Medium - Find slow queries |
| Flagsmith | Free | 15 min | 💎 Medium - Feature control |
| Playwright E2E | Free | 30 min | 💎 Medium - Catch UI bugs |

**Total setup time**: ~2 hours
**Monthly cost**: $0 (all free tiers)
**Value**: Prevents hours of debugging, faster development, happier users

---

## 🚨 Security Checklist

Before pushing to GitHub:
- [ ] Scan for secrets: `make scan-secrets`
- [ ] No AWS keys in code
- [ ] No database passwords in code
- [ ] All secrets in AWS Secrets Manager or GitHub Secrets
- [ ] `.env` file in `.gitignore`
- [ ] Pre-commit hooks installed

---

## 🤝 Need Help?

All these tools have great documentation and free support:
- Sentry: https://docs.sentry.io
- Grafana: https://grafana.com/docs
- Terraform Cloud: https://developer.hashicorp.com/terraform/cloud-docs
- pgAnalyze: https://pganalyze.com/docs
- Flagsmith: https://docs.flagsmith.com
- Playwright: https://playwright.dev/docs

Most also have Slack communities where you can ask questions!
