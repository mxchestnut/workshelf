# Group Admin Dashboard

A comprehensive dashboard for group owners and admins to manage their WorkShelf communities.

## Features

### 📊 Overview
- View group statistics (total members, posts, subdomain status)
- Group information display
- Quick access to key metrics

### 👥 Member Management
- View all group members
- See member roles (Owner, Admin, Moderator, Member)
- Update member roles (Owner/Admin only)
- Remove members (with role hierarchy protection)
- View join dates and member details

### 📝 Post Management
- Create new group posts
- Pin/unpin important posts (Moderator+)
- Delete posts (author or Moderator+)
- View all group posts chronologically
- Pinned posts appear first

### ⚙️ Settings
- Request custom subdomains (e.g., `mygroup.workshelf.dev`)
- Track subdomain approval status
- View rejection reasons if applicable
- Cancel pending subdomain requests

## Access Levels

### Owner
- Full control over group
- Can promote/demote admins
- Can remove any member
- Can manage all posts
- Can request/manage subdomain

### Admin
- Manage members (except owners)
- Moderate posts
- Pin/unpin posts
- Request subdomain

### Moderator
- Remove regular members
- Pin/unpin posts
- Delete inappropriate posts

### Member
- Create posts
- View group content

## Setup

### 1. Authentication Required
This dashboard requires Keycloak authentication. Users must:
- Have a valid Keycloak JWT token
- Be a member of the group they want to manage

### 2. Serving the Dashboard

**Local Development:**
```bash
cd group-admin-dashboard
python3 -m http.server 8081
```

Then visit: `http://localhost:8081`

**Production:**
This dashboard should be served as part of your main frontend application at a route like `/admin/groups` or similar.

### 3. Authentication Token

The dashboard expects an auth token in localStorage:
```javascript
localStorage.setItem('auth_token', 'YOUR_KEYCLOAK_JWT_TOKEN');
```

For production, implement proper Keycloak authentication flow.

## API Endpoints Used

### Group Information
- `GET /group-admin/my-groups` - List user's groups
- `GET /group-admin/groups/{id}` - Get group details

### Member Management
- `GET /group-admin/groups/{id}/members` - List members
- `PUT /group-admin/groups/{id}/members/{user_id}/role` - Update role
- `DELETE /group-admin/groups/{id}/members/{user_id}` - Remove member

### Post Management
- `GET /group-admin/groups/{id}/posts` - List posts
- `POST /group-admin/groups/{id}/posts` - Create post
- `PUT /group-admin/groups/{id}/posts/{post_id}/pin` - Toggle pin
- `DELETE /group-admin/groups/{id}/posts/{post_id}` - Delete post

### Subdomain Management
- `POST /group-admin/groups/{id}/subdomain/request` - Request subdomain
- `DELETE /group-admin/groups/{id}/subdomain/request` - Cancel request

## Role Hierarchy

The system enforces a role hierarchy for safety:

```
OWNER (4) > ADMIN (3) > MODERATOR (2) > MEMBER (1)
```

Rules:
- You cannot remove someone with equal or higher role
- Only owners can change other owners' roles
- Moderators can only remove regular members

## UI Features

### Responsive Design
- Mobile-friendly layout
- Tailwind CSS styling
- WorkShelf brand colors

### Real-time Updates
- Manual refresh buttons
- Auto-loads data on group selection
- Success/error notifications

### User Experience
- Tab-based navigation
- Confirmation modals for destructive actions
- Clear status indicators
- Helpful error messages

## Development Notes

### Colors
- Primary: `#B34B0C` (brand orange)
- Primary Dark: `#7C3306`
- Neutrals: `#37322E` to `#F5F4F2`

### State Management
- Uses vanilla JavaScript
- Simple state tracking with global variables
- LocalStorage for auth token persistence

### Error Handling
- Try-catch blocks on all API calls
- User-friendly error messages
- Console logging for debugging

## Next Steps

### Planned Features
- [ ] Member invitation system
- [ ] Post reactions and comments
- [ ] Group analytics dashboard
- [ ] Email notifications
- [ ] Advanced moderation tools
- [ ] Content filtering
- [ ] Group theme customization
- [ ] Export member/post data

### Integration
- Integrate with main WorkShelf frontend
- Add to navigation menu
- Implement proper Keycloak SSO
- Add email notifications for moderation actions

## Security Notes

- All endpoints require Keycloak authentication
- Role-based permission checks on backend
- XSS protection via content escaping
- CSRF protection through JWT tokens
- No sensitive data in localStorage (only JWT)

## Support

For issues or questions:
1. Check API endpoint documentation
2. Verify Keycloak token is valid
3. Check browser console for errors
4. Ensure user has proper group membership/role
