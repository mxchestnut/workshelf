# Git Worktree Guide for WorkShelf Projects

**Last Updated:** December 14, 2025

## Overview

This guide explains how to use Git worktrees to manage multiple independent projects within the WorkShelf repository, specifically for developing the **Cyarika** roleplay project alongside the main WorkShelf application.

## What are Git Worktrees?

Git worktrees allow you to check out multiple branches simultaneously in different directories. Instead of constantly switching branches with `git checkout`, you can have multiple working directories, each with its own branch checked out.

### Benefits for WorkShelf Development

- **Parallel Development**: Work on Cyarika features without affecting main WorkShelf development
- **Easy Context Switching**: Switch between projects by changing directories, not branches
- **Independent Testing**: Run both projects simultaneously without interference
- **Preserved State**: Each worktree maintains its own working directory state
- **Shared Git History**: All worktrees share the same `.git` repository, saving disk space

---

## Project Structure

### Main Repository (WorkShelf)
```
~/Code/workshelf/              # Main worktree
├── .git/                      # Shared Git repository
├── backend/
├── frontend/
├── docs/
└── ...
```

### Cyarika Project (Independent Worktree)
```
~/Code/cyarika/                # Separate worktree
├── backend/                   # Cyarika-specific backend
├── frontend/                  # Cyarika-specific frontend
├── database/                  # Separate database config
└── deploy/                    # cyarika.com deployment
```

---

## Setup Instructions

### 1. Create a Cyarika Branch

First, create a new branch for the Cyarika project:

```bash
cd ~/Code/workshelf
git checkout -b cyarika-main
git push -u origin cyarika-main
```

### 2. Create a Worktree for Cyarika

Create a new worktree in a separate directory:

```bash
cd ~/Code/workshelf
git worktree add ~/Code/cyarika cyarika-main
```

This creates a new directory at `~/Code/cyarika` with the `cyarika-main` branch checked out.

### 3. Verify Worktree Setup

List all worktrees:

```bash
cd ~/Code/workshelf
git worktree list
```

Output should show:
```
/Users/kit/Code/workshelf    <commit-hash>  [main]
/Users/kit/Code/cyarika      <commit-hash>  [cyarika-main]
```

### 4. Configure Cyarika Environment

```bash
cd ~/Code/cyarika

# Create Cyarika-specific environment file
cp .env.example .env.cyarika

# Edit .env.cyarika with Cyarika-specific settings:
# - Different database name (cyarika_db)
# - Different ports (8001 for backend, 5174 for frontend)
# - Different domain (cyarika.com)
# - Separate Keycloak realm (cyarika)
```

---

## Daily Workflow

### Switching Between Projects

**Option 1: Change directories**
```bash
cd ~/Code/workshelf    # Work on main WorkShelf
cd ~/Code/cyarika      # Work on Cyarika
```

**Option 2: Use IDE workspace switching**
- VS Code: Open different workspaces for each project
- Keep both open in separate windows

### Making Changes in Each Project

**In WorkShelf:**
```bash
cd ~/Code/workshelf
git checkout main
# Make changes
git add .
git commit -m "feat: add new feature to WorkShelf"
git push
```

**In Cyarika:**
```bash
cd ~/Code/cyarika
# Already on cyarika-main branch
# Make changes
git add .
git commit -m "feat: implement roleplay feature"
git push
```

### Syncing Changes Between Projects

If you need to pull changes from main into Cyarika:

```bash
cd ~/Code/cyarika
git fetch origin
git merge origin/main
# Resolve conflicts if any
git push
```

### Running Both Projects Simultaneously

**Terminal 1 (WorkShelf):**
```bash
cd ~/Code/workshelf
docker-compose up
# Access at http://localhost:5173
```

**Terminal 2 (Cyarika):**
```bash
cd ~/Code/cyarika
# Create and edit Cyarika-specific compose file (see Cyarika-Specific Setup section)
docker-compose -f docker-compose.cyarika.yml up
# Access at http://localhost:5174
```

---

## Advanced Worktree Management

### Creating Feature Branches in Worktrees

**For Cyarika features:**
```bash
cd ~/Code/cyarika
git checkout -b feature/character-sheets
# Work on feature
git push -u origin feature/character-sheets
```

**Create a worktree for a specific feature:**
```bash
cd ~/Code/workshelf
git worktree add ~/Code/cyarika-feature feature/character-sheets
cd ~/Code/cyarika-feature
# Work on isolated feature
```

### Listing All Worktrees

```bash
git worktree list
```

### Removing a Worktree

When done with a feature worktree:

```bash
cd ~/Code/workshelf
git worktree remove ../cyarika-feature
# Or if directory is already deleted:
git worktree prune
```

### Moving a Worktree

If you need to relocate a worktree:

```bash
# Move the directory
mv ~/Code/cyarika ~/Projects/cyarika

# Update Git's worktree tracking
cd ~/Code/workshelf
git worktree repair
```

---

## Project Separation Strategy

### Database Separation

**WorkShelf Database:**
```yaml
# docker-compose.yml
POSTGRES_DB: workshelf_db
POSTGRES_USER: workshelf_user
```

**Cyarika Database:**
```yaml
# docker-compose.cyarika.yml
POSTGRES_DB: cyarika_db
POSTGRES_USER: cyarika_user
```

### Authentication Separation

**WorkShelf Keycloak:**
- Realm: `workshelf`
- Client ID: `workshelf-frontend`
- Domain: `workshelf.com`

**Cyarika Keycloak:**
- Realm: `cyarika`
- Client ID: `cyarika-frontend`
- Domain: `cyarika.com`

### Deployment Separation

**WorkShelf Deployment:**
```bash
# Deploy to workshelf.com
cd ~/Code/workshelf
./deploy-to-prod.sh workshelf
```

**Cyarika Deployment:**
```bash
# Deploy to cyarika.com
cd ~/Code/cyarika
./deploy-to-prod.sh cyarika
```

---

## AWS Route 53 Configuration

### Setting Up Cyarika Domain

1. **Create Hosted Zone in Route 53:**
   ```
   Domain: cyarika.com
   Type: Public hosted zone
   ```

2. **Add DNS Records:**
   ```
   Type: A
   Name: cyarika.com
   Value: <Lightsail-IP>
   TTL: 300
   
   Type: A
   Name: www.cyarika.com
   Value: <Lightsail-IP>
   TTL: 300
   
   Type: A
   Name: api.cyarika.com
   Value: <Lightsail-IP>
   TTL: 300
   ```

3. **Update Nameservers:**
   Point your domain registrar to Route 53 nameservers

---

## Best Practices

### ✅ Do's

- **Keep worktrees in separate directories** (e.g., `~/Code/workshelf` and `~/Code/cyarika`)
- **Use descriptive branch names** for worktrees (e.g., `cyarika-main`, `cyarika-feature/xyz`)
- **Commit regularly** in each worktree to avoid confusion
- **Use separate environment files** (`.env.workshelf` vs `.env.cyarika`)
- **Run separate Docker Compose configs** with different ports
- **Document environment differences** in each project's README

### ❌ Don'ts

- **Don't nest worktrees** inside each other
- **Don't checkout the same branch** in multiple worktrees
- **Don't share configuration files** between projects (use separate `.env` files)
- **Don't run services on the same ports** in both projects
- **Don't forget to prune** deleted worktrees with `git worktree prune`

---

## Troubleshooting

### Issue: "Branch is already checked out"

**Problem:** Trying to create a worktree with a branch that's already checked out elsewhere.

**Solution:**
```bash
# List current worktrees
git worktree list

# Either remove the other worktree or use a different branch
git worktree remove /path/to/other/worktree
```

### Issue: "Cannot remove worktree, changes not saved"

**Problem:** Worktree has uncommitted changes.

**Solution:**
```bash
cd /path/to/worktree
git add .
git commit -m "Save work before removing worktree"
# Or stash changes
git stash
```

### Issue: Ports already in use

**Problem:** Both projects trying to use the same ports.

**Solution:**
```bash
# Edit docker-compose.cyarika.yml
ports:
  - "8001:8000"  # Backend (was 8000)
  - "5174:5173"  # Frontend (was 5173)
  - "5433:5432"  # PostgreSQL (was 5432)
```

### Issue: Worktree directory deleted but still tracked

**Problem:** Manually deleted worktree directory.

**Solution:**
```bash
cd ~/Code/workshelf
git worktree prune
```

---

## Migration Checklist

### Moving from Branch Switching to Worktrees

- [ ] Commit all changes in current branch
- [ ] Create Cyarika branch: `git checkout -b cyarika-main`
- [ ] Create worktree: `git worktree add ../cyarika cyarika-main`
- [ ] Copy and customize environment: `cp .env .env.cyarika`
- [ ] Update Docker Compose ports in Cyarika worktree
- [ ] Create separate Keycloak realm for Cyarika
- [ ] Set up Route 53 for cyarika.com
- [ ] Test both projects running simultaneously
- [ ] Update IDE workspace configurations
- [ ] Document project-specific setup in each README

---

## Cyarika-Specific Setup

### Initial Cyarika Configuration

```bash
cd ~/Code/cyarika

# 1. Update environment variables
cat > .env << EOF
# Database
POSTGRES_DB=cyarika_db
POSTGRES_USER=cyarika_user
POSTGRES_PASSWORD=cyarika_pass

# Backend
BACKEND_PORT=8001
API_URL=http://localhost:8001

# Frontend
FRONTEND_PORT=5174
VITE_API_URL=http://localhost:8001

# Keycloak
KEYCLOAK_REALM=cyarika
KEYCLOAK_CLIENT_ID=cyarika-frontend
KEYCLOAK_PORT=8081

# Domain
DOMAIN=cyarika.com
EOF

# 2. Create Cyarika-specific Docker Compose file
cp docker-compose.yml docker-compose.cyarika.yml

# 3. Update ports in docker-compose.cyarika.yml
# Edit the file manually to change:
#   - Backend: 8000:8000 -> 8001:8000
#   - Frontend: 5173:5173 -> 5174:5173
#   - Keycloak: 8080:8080 -> 8081:8080
#   - PostgreSQL: 5432:5432 -> 5433:5432
#   - Redis: 6379:6379 -> 6380:6379

# 4. Start Cyarika services
docker-compose -f docker-compose.cyarika.yml up -d

# 5. Initialize Cyarika database
docker-compose -f docker-compose.cyarika.yml exec backend alembic upgrade head

# 6. Set up Keycloak realm
./setup-keycloak.sh cyarika
```

### Roleplay Features Development

Focus areas for Cyarika worktree:

1. **Character Management** (`backend/app/models/roleplay.py`)
2. **Passage Posting** (`backend/app/api/roleplay.py`)
3. **Scene Organization** (`frontend/src/pages/RoleplayStudio.tsx`)
4. **Lore Wiki** (`frontend/src/components/LoreWiki.tsx`)
5. **Dice Rolling** (`frontend/src/components/DiceRoller.tsx`)

---

## Resources

### Git Documentation
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [Pro Git Book - Worktrees](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging)

### Related Files
- `/backend/docs/ROLEPLAY_ARCHITECTURE.md` - Cyarika data model
- `/backend/docs/ROLEPLAY_API.md` - API endpoints
- `/docs/DATABASE_SAFETY.md` - Database management
- `/deploy/README.md` - Deployment instructions

---

## Quick Reference

### Common Commands

```bash
# Create worktree
git worktree add <path> <branch>

# List worktrees
git worktree list

# Remove worktree
git worktree remove <path>

# Clean up deleted worktrees
git worktree prune

# Move to worktree directory
cd ~/Code/cyarika

# Check current branch in worktree
git branch --show-current
```

### Cyarika Development Shortcuts

```bash
# Start Cyarika
alias cyarika-start='cd ~/Code/cyarika && docker-compose up'

# Stop Cyarika
alias cyarika-stop='cd ~/Code/cyarika && docker-compose down'

# Cyarika logs
alias cyarika-logs='cd ~/Code/cyarika && docker-compose logs -f'

# Switch to Cyarika
alias cyarika='cd ~/Code/cyarika'

# Switch to WorkShelf
alias workshelf='cd ~/Code/workshelf'
```

---

## Contact & Support

For questions or issues with worktree setup:
- Check Git documentation: `git worktree --help`
- Review this guide's troubleshooting section
- Consult team members who have experience with worktrees

**Last Updated:** December 14, 2025  
**Maintainer:** Kit (mxchestnut)
