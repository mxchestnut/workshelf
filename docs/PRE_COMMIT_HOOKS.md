# Pre-commit Hooks Documentation

## Overview

Pre-commit hooks are automated checks that run **before** each Git commit to catch errors, enforce code standards, and prevent security issues from being committed to the repository.

## What Gets Checked

### Frontend (TypeScript/React)
Every commit that touches frontend files runs:

1. **ESLint** - Catches JavaScript/TypeScript errors
2. **Prettier** - Auto-formats code
3. **TypeScript** - Type checking (no compilation errors)
4. **npm audit** - Checks for security vulnerabilities
5. **Console Detection** - Prevents `console.log` statements

### Backend (Python/FastAPI)
Every commit that touches backend files runs:

1. **Black** - Auto-formats Python code
2. **Flake8** - Python linting and style checking
3. **Bandit** - Security vulnerability scanning
4. **File Checks** - Trailing whitespace, YAML/JSON validation
5. **Large File Detection** - Prevents accidentally committing huge files

### Security (All Files)
Every commit runs:

1. **Gitleaks** - Scans for accidentally committed secrets:
   - AWS keys
   - Stripe keys
   - GitHub tokens
   - Database passwords
   - API keys
   - JWT secrets

## How to Use

### Normal Commits (Automatic)

Just commit as usual:

```bash
git add .
git commit -m "Your commit message"
```

The hooks run automatically. If they pass ✅, your commit succeeds. If they fail ❌, the commit is blocked and you'll see what needs to be fixed.

### Emergency Commits (Skip Hooks)

⚠️ **Use sparingly!** Only when absolutely necessary:

```bash
git commit --no-verify -m "Emergency hotfix"
```

### Manual Testing (Before Committing)

Test hooks before committing:

```bash
# Frontend checks
cd frontend
npm run lint
npm run type-check

# Backend checks
cd backend
pre-commit run --all-files
```

## Installation

Already done! But if you need to reinstall:

```bash
./scripts/setup-pre-commit.sh
```

Or manually:

```bash
# Frontend
cd frontend
npm install
npm run prepare

# Backend
cd backend
pip3 install pre-commit
pre-commit install
```

## Troubleshooting

### "Husky not found" or hooks not running

```bash
cd frontend
npm install
npm run prepare
```

### "pre-commit command not found"

```bash
pip3 install pre-commit
cd backend
pre-commit install -f
```

### "Unable to git add" after auto-fixes

The hooks auto-fixed your files! Just add and commit again:

```bash
git add .
git commit -m "Your message"
```

### Hooks running twice

This is normal - both Husky (frontend) and pre-commit (backend) run. If you only changed frontend files, only Husky runs. If you changed backend files, only pre-commit runs.

### False positive from secret scanner

Add to `.gitleaks.toml` allowlist:

```toml
[allowlist]
regexes = [
    '''your-specific-false-positive-pattern''',
]
```

## What Happens on Failure

### ESLint/TypeScript Errors

```
❌ ESLint found errors in src/components/MyComponent.tsx:42
   Expected '===' and instead saw '=='
```

**Fix**: Correct the errors and commit again.

### Console.log Detected

```
❌ Found console statements in staged files
   src/pages/Dashboard.tsx:123: console.log('debug')
```

**Fix**: Remove the console.log or use `console.error`/`console.warn` for intentional logging.

### Security Vulnerability

```
⚠️  Security vulnerabilities found
   high severity vulnerability in package 'lodash'
```

**Fix**: Run `npm audit fix` or update the package.

### Secret Detected

```
❌ Gitleaks detected secrets
   File: config.ts
   Secret: AWS Access Key
```

**Fix**:
1. Remove the secret from the file
2. Use environment variables instead
3. Rotate the compromised key immediately

### Python Formatting

```
❌ Black would reformat backend/app/main.py
```

**Fix**: Black auto-fixes this! Just:

```bash
git add .
git commit -m "Same message"
```

## Configuration Files

- **Frontend**: [`frontend/.husky/pre-commit`](frontend/.husky/pre-commit ) - The hook script
- **Frontend**: [`frontend/package.json`](frontend/package.json ) - lint-staged config
- **Backend**: [`backend/.pre-commit-config.yaml`](backend/.pre-commit-config.yaml ) - pre-commit config
- **Security**: [`.gitleaks.toml`](.gitleaks.toml ) - Secret detection rules

## Updating Hooks

### Update pre-commit hooks to latest versions

```bash
cd backend
pre-commit autoupdate
```

### Update npm packages

```bash
cd frontend
npm update husky lint-staged
```

## Best Practices

1. **Don't skip hooks** unless it's a true emergency
2. **Fix issues immediately** - don't let them pile up
3. **Run manual checks** before committing if you've made big changes
4. **Keep dependencies updated** - run `npm audit` and update packages regularly
5. **Review auto-fixes** - Black and Prettier will change your code, make sure it looks good

## Performance

Hooks typically add 5-15 seconds to commit time:
- Small commits: ~5 seconds
- Large commits: ~15 seconds
- First commit after install: ~30 seconds (downloading dependencies)

This is worth it to catch bugs before they reach production!

## Disabling Hooks (Not Recommended)

If you absolutely must disable hooks:

```bash
# Temporarily
git commit --no-verify

# Permanently (NOT RECOMMENDED)
cd backend
pre-commit uninstall
cd ../frontend
rm -rf .husky
```

## Getting Help

If hooks are failing and you're not sure why:

1. Read the error message carefully
2. Check this documentation
3. Try running the check manually to get more detail
4. Ask a team member
5. As a last resort, skip with `--no-verify` but create an issue to fix later

## Adding New Checks

Want to add more checks? Edit these files:

- Frontend: [`frontend/package.json`](frontend/package.json ) → `lint-staged` section
- Backend: [`backend/.pre-commit-config.yaml`](backend/.pre-commit-config.yaml ) → add new repo/hook
- Security: [`.gitleaks.toml`](.gitleaks.toml ) → add new rules

Then test with:

```bash
cd backend
pre-commit run --all-files
```
