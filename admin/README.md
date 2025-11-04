# Work Shelf Admin Dashboard

**Internal Platform Administration Tool**

🔒 **Security**: This admin dashboard is designed to be accessed only via **Tailscale** network. It should NOT be exposed to the public internet.

## Overview

The admin dashboard provides platform staff with tools to:

- ✅ Approve/reject group subdomain requests
- ✅ Approve/reject custom domain requests  
- 📊 Monitor platform statistics
- 🔍 Review pending requests in real-time

## Features

### Group Subdomain Approval

Groups can request custom subdomains (e.g., `writers.workshelf.dev`). Admins can:

- View all pending subdomain requests
- See group details (name, owner, member count, creation date)
- Approve requests (creates the subdomain)
- Reject requests with a reason

### Dashboard Stats

Real-time statistics showing:
- Pending group subdomain requests
- Pending custom domain requests
- Approvals completed today
- Total groups, studios, and users

## API Endpoints

All admin endpoints are under `/api/v1/admin` and include:

- `GET /admin/stats` - Dashboard statistics
- `GET /admin/groups/pending` - List pending subdomain requests
- `POST /admin/groups/{id}/subdomain/approve` - Approve/reject subdomain
- `GET /admin/domains/pending` - List pending custom domains
- `POST /admin/domains/{id}/approve` - Approve/reject custom domain

## Deployment

### Tailscale Setup

1. Install Tailscale on your admin machine
2. Access the admin dashboard via Tailscale network only
3. The dashboard connects to the API at `https://api.workshelf.dev`

### Local Development

To run the admin dashboard locally:

```bash
# Option 1: Simple HTTP server (Python)
cd admin
python3 -m http.server 8080

# Option 2: Simple HTTP server (Node.js)
cd admin
npx serve

# Then open: http://localhost:8080
```

### Database Migration

Apply the new migration to add subdomain approval fields:

```bash
cd backend
alembic upgrade head
```

## Security Notes

⚠️ **IMPORTANT**: This dashboard has NO authentication built-in. It relies on:

1. **Network-level security** via Tailscale
2. **API endpoint protection** (should also verify Tailscale network)
3. **No public exposure** of the admin frontend

### Recommended Security Enhancements

For production, consider adding:

- Admin user authentication
- RBAC (Role-Based Access Control)
- Audit logging for all approval actions
- Rate limiting on admin endpoints
- IP allowlist verification

## Usage

1. Open the admin dashboard via Tailscale network
2. View pending requests on the main page
3. Click "Approve" or "Reject" on any request
4. For rejections, provide a reason
5. Confirm the action
6. The page auto-refreshes every 30 seconds

## Future Enhancements

- [ ] Email notifications to group owners
- [ ] Batch approval/rejection
- [ ] Subdomain history and audit trail
- [ ] DNS automation for approved subdomains
- [ ] Custom domain SSL certificate management
- [ ] Analytics and reporting
- [ ] User management tools

## Tech Stack

- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy
- **Database**: PostgreSQL (Neon)
- **Security**: Tailscale network isolation
