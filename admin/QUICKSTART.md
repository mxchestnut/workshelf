# Admin Dashboard - Quick Start Guide

## 🎯 What You Have

You now have a complete **admin dashboard** for approving group subdomain requests, secured behind **Tailscale**.

### Components Created:

1. **Backend API** (`backend/app/api/admin.py`)
   - `/api/v1/admin/stats` - Dashboard statistics
   - `/api/v1/admin/groups/pending` - List pending subdomain requests
   - `/api/v1/admin/groups/{id}/subdomain/approve` - Approve/reject requests
   - `/api/v1/admin/domains/pending` - List pending custom domains
   - `/api/v1/admin/domains/{id}/approve` - Approve/reject domains

2. **Database Migration** (`backend/alembic/versions/002_*.py`)
   - Adds subdomain approval fields to `groups` table:
     - `subdomain_requested` - The requested subdomain
     - `subdomain_approved` - Approval status
     - `subdomain_approved_at` - Timestamp
     - `subdomain_approved_by` - Admin user ID
     - `subdomain_rejection_reason` - Rejection reason

3. **Admin Frontend** (`admin/index.html`)
   - Clean dashboard with your custom color scheme
   - Real-time stats
   - Approve/reject interface
   - Auto-refreshes every 30 seconds

## 🚀 How to Access It

### Currently Running Locally:

The admin dashboard is running at: **http://localhost:8080**

You should see:
- ✅ Stats cards showing pending requests
- ✅ List of pending group subdomain requests
- ✅ Approve/Reject buttons for each request

### API Endpoints:

The admin API is accessible at: **https://api.workshelf.dev/api/v1/admin/**

Try it:
```bash
curl https://api.workshelf.dev/api/v1/admin/stats | jq
```

## 🧪 Testing the Flow

### Step 1: Apply Database Migration

First, apply the migration to add the new fields:

```bash
cd backend

# Check migration status
alembic current

# Apply migration
alembic upgrade head
```

### Step 2: Create Test Data

Run the test data script to create sample groups with subdomain requests:

```bash
cd backend
python scripts/create_admin_test_data.py
```

This will create 4 test groups requesting subdomains:
- Science Fiction Writers Guild → `scifi.workshelf.dev`
- Poetry Corner → `poetry.workshelf.dev`
- NaNoWriMo 2025 → `nano2025.workshelf.dev`
- Beta Reading Exchange → `betareaders.workshelf.dev`

### Step 3: View in Admin Dashboard

1. Open http://localhost:8080
2. You should see the pending requests
3. Click "Approve" or "Reject" on any request
4. For rejections, provide a reason
5. Confirm the action

### Step 4: Verify Approval

Check the API to see the approved subdomain:

```bash
curl https://api.workshelf.dev/api/v1/admin/groups/pending | jq
```

## 🔒 Tailscale Setup (For Production)

To secure this admin dashboard in production:

1. **Install Tailscale** on your admin machine:
   ```bash
   # macOS
   brew install tailscale
   
   # Start Tailscale
   sudo tailscale up
   ```

2. **Deploy admin dashboard** to a Tailscale-only server:
   - The admin frontend should ONLY be accessible via Tailscale IP
   - Never expose it to the public internet

3. **Protect API endpoints** with Tailscale verification:
   - Add middleware to check if requests come from Tailscale network
   - Verify `X-Tailscale-User-*` headers

## 📋 Next Steps

### Essential:
- [ ] Apply the database migration to production
- [ ] Test the approval flow with real data
- [ ] Set up Tailscale network access

### Nice to Have:
- [ ] Add email notifications when groups are approved/rejected
- [ ] Implement DNS automation (create actual subdomains)
- [ ] Add audit logging for all admin actions
- [ ] Build similar UI for custom domain approvals

### Future:
- [ ] Multi-admin support with RBAC
- [ ] Batch approval/rejection
- [ ] Analytics dashboard
- [ ] User management tools

## 🎨 Design

The admin dashboard uses your custom color palette:
- **Primary**: `#B34B0C` (warm orange-brown)
- **Primary Dark**: `#7C3306`
- **Neutrals**: Various grays from `#37322E` to `#B3B2B0`

Clean, professional interface focused on efficiency.

## 🐛 Troubleshooting

**Admin dashboard shows "Error loading requests":**
- Check that the backend API is running
- Verify CORS is configured correctly
- Check browser console for errors

**Migration fails:**
- Ensure database connection is working
- Check if columns already exist
- Review Alembic migration history

**No pending requests showing:**
- Run the test data script
- Check database directly: `SELECT * FROM groups WHERE subdomain_requested IS NOT NULL;`
- Verify API endpoint: `curl https://api.workshelf.dev/api/v1/admin/groups/pending`

## 📝 Notes

- The admin dashboard is intentionally simple (no auth) because it relies on Tailscale network security
- For production, add proper authentication and RBAC
- The API endpoints should also verify Tailscale network membership
- Auto-refresh is set to 30 seconds - adjust as needed

---

**Status**: ✅ Ready to test locally
**Next**: Apply migration and create test data
