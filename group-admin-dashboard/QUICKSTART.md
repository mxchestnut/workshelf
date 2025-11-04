# Group Admin Dashboard - Quick Start Guide

## For Group Owners/Admins

### 1. Access the Dashboard

```bash
# Local development
cd group-admin-dashboard
python3 -m http.server 8081
```

Visit: `http://localhost:8081`

### 2. Login

You'll need a valid Keycloak authentication token. Once Keycloak is set up:

1. Login through the main WorkShelf app
2. Your token will be stored automatically
3. Navigate to the Group Admin Dashboard

### 3. Select Your Group

Use the dropdown at the top to select which group you want to manage.

### 4. Dashboard Sections

#### **Overview Tab**
- View stats: total members, posts, subdomain status
- See group information
- Quick overview of your community

#### **Members Tab**
- See all group members
- View roles (Owner, Admin, Moderator, Member)
- Manage member roles (if you're Owner/Admin)
- Remove members (with proper permissions)

#### **Posts Tab**
- Create new announcements or discussions
- Pin important posts
- Delete inappropriate content
- View all group posts

#### **Settings Tab**
- Request a custom subdomain (e.g., `mygroup.workshelf.dev`)
- Track approval status
- Cancel pending requests

## Common Tasks

### Creating a Post
1. Go to **Posts** tab
2. Fill in title and content
3. Check "Pin this post" if it's important (Moderator+ only)
4. Click "Create Post"

### Managing Members
1. Go to **Members** tab
2. Find the member you want to manage
3. Click "Manage" to see options:
   - Change role (Owner/Admin only)
   - Remove from group (with hierarchy check)

### Requesting a Subdomain
1. Go to **Settings** tab
2. Enter desired subdomain (lowercase, alphanumeric, hyphens)
3. Click "Request Subdomain"
4. Wait for platform staff approval
5. Track status in the Settings tab

### Pinning Posts
1. Go to **Posts** tab
2. Find the post you want to pin
3. Click "Pin" button
4. Pinned posts appear at the top with a 📌 badge

## Role Permissions

| Action | Owner | Admin | Moderator | Member |
|--------|-------|-------|-----------|--------|
| Create posts | ✅ | ✅ | ✅ | ✅ |
| Pin posts | ✅ | ✅ | ✅ | ❌ |
| Delete any post | ✅ | ✅ | ✅ | Own only |
| Remove members | ✅ | ✅ | Lower roles | ❌ |
| Change roles | ✅ | ✅ (not Owner) | ❌ | ❌ |
| Request subdomain | ✅ | ✅ | ❌ | ❌ |

## Tips

### Best Practices
- **Pin important posts** like rules, announcements, and guidelines
- **Use descriptive titles** for posts to help members find content
- **Check subdomain availability** before requesting (3-50 characters)
- **Regular moderation** helps maintain a healthy community

### Subdomain Naming
✅ Good examples:
- `writers-circle`
- `book-club`
- `fantasy-fans`

❌ Avoid:
- Spaces (use hyphens instead)
- Special characters (only letters, numbers, hyphens)
- Too short (minimum 3 characters)
- Too long (maximum 50 characters)

### Member Management
- **Owners** should promote trusted members to Moderator/Admin
- **Moderators** help with day-to-day content moderation
- **Admins** handle member management and group settings
- You cannot remove or demote someone with equal/higher role

## Troubleshooting

### "Failed to load groups"
- Check that you're logged in
- Verify your auth token is valid
- Make sure you're a member of at least one group

### "Permission denied" errors
- Check your role in the group
- Some actions require Owner/Admin status
- Review the role permissions table above

### Subdomain request rejected
- Read the rejection reason in Settings tab
- Common issues: already taken, inappropriate name, too similar to existing
- Try a different subdomain name

### Posts not appearing
- Click "Refresh" button
- Check if group has any posts yet
- Verify you're viewing the correct group

## API Integration

This dashboard uses the following API endpoints:

```
GET    /group-admin/my-groups
GET    /group-admin/groups/{id}
GET    /group-admin/groups/{id}/members
PUT    /group-admin/groups/{id}/members/{user_id}/role
DELETE /group-admin/groups/{id}/members/{user_id}
GET    /group-admin/groups/{id}/posts
POST   /group-admin/groups/{id}/posts
PUT    /group-admin/groups/{id}/posts/{post_id}/pin
DELETE /group-admin/groups/{id}/posts/{post_id}
POST   /group-admin/groups/{id}/subdomain/request
DELETE /group-admin/groups/{id}/subdomain/request
```

All endpoints require Keycloak authentication.

## Support

For help or questions:
1. Check this guide first
2. Review the README.md for technical details
3. Contact platform staff for subdomain issues
4. Check API documentation for endpoint details
