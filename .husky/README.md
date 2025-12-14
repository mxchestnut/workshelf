# Pre-commit Hooks Setup

This directory contains the pre-commit hooks configuration.

## What's Configured

### Frontend (Husky + lint-staged)
- ✅ ESLint auto-fix on commit
- ✅ Prettier formatting
- ✅ TypeScript type checking
- ✅ npm security audit
- ✅ Console.log detection

### Backend (pre-commit framework)
- ✅ Black code formatting
- ✅ Flake8 linting
- ✅ Bandit security scanning
- ✅ Trailing whitespace removal
- ✅ YAML/JSON validation
- ✅ Large file detection

### Security
- ✅ Gitleaks secret scanning
- ✅ AWS key detection
- ✅ Stripe key detection
- ✅ GitHub token detection
- ✅ Database connection string detection

## Usage

The hooks run automatically on every `git commit`. If checks fail, the commit is blocked.

### Skip Hooks (Emergency Only)
```bash
git commit --no-verify -m "Emergency fix"
```

### Manually Run All Checks
```bash
cd backend
pre-commit run --all-files
```

### Update Hooks
```bash
cd backend
pre-commit autoupdate
```

## Troubleshooting

### "Husky not found"
```bash
cd frontend
npm install
```

### "pre-commit not found"
```bash
pip3 install pre-commit
cd backend
pre-commit install
```

### Hooks not running
```bash
# Reinstall hooks
cd backend
pre-commit uninstall
pre-commit install -f
```
