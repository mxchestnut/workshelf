## Description
<!-- Brief description of what this PR does -->

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Infrastructure/deployment change

## Security Checklist ✅
- [ ] No credentials, secrets, or API keys in code
- [ ] No hardcoded passwords or tokens
- [ ] No `.env` or `.pem` files committed
- [ ] No database connection strings with credentials
- [ ] No IP addresses or production endpoints hardcoded
- [ ] Environment variables used for all sensitive config
- [ ] Pre-commit security hook passed

## Testing Checklist 🧪
- [ ] Tested locally with `docker-compose.local.yml`
- [ ] All existing tests pass (`pytest tests/`)
- [ ] Added tests for new functionality (if applicable)
- [ ] Manual testing completed
- [ ] No console errors in browser (for frontend changes)

## Deployment Checklist 📦
- [ ] Changes are backward compatible OR migration plan documented
- [ ] Database migrations included (if schema changes)
- [ ] Keycloak backup taken (if auth changes) via `scripts/backup-keycloak.sh`
- [ ] `.env.prod.template` updated (if new env vars added)
- [ ] DEPLOYMENT.md updated (if deployment process changes)

## Rollback Plan 🔄
<!-- How to rollback if this breaks production -->
- [ ] Can rollback via `git reset --hard <previous-commit>` + redeploy
- [ ] Database changes are reversible OR backup exists
- [ ] No data loss expected from rollback

## Related Issues
<!-- Link to related issues: Fixes #123, Relates to #456 -->

## Screenshots/Logs
<!-- If applicable, add screenshots or relevant log output -->

---

## For Reviewers
**Areas that need extra attention:**
<!-- Highlight specific parts of the code that need careful review -->

**Questions for reviewer:**
<!-- Any specific questions or concerns -->
