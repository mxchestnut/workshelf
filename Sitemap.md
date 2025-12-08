````markdown
// filepath: SITEMAP.md
# 📍 Workshelf Site Map

**Last Updated:** December 8, 2025  
**Purpose:** Complete navigation structure and page functionality reference

---

## 🌐 Public Pages (No Authentication Required)

### `/` - Landing Page
**Purpose:** First impression & conversion  
**Features:**
- Hero section with value proposition
- Feature highlights showcase
- Call-to-action buttons (Sign Up / Sign In)
- Footer with links and legal info

**User Actions:**
- Click "Sign Up" → Redirects to Keycloak registration
- Click "Sign In" → Redirects to Keycloak login
- Browse feature information
- View community stats (future)

---

### `/login` - Login Page
**Purpose:** Authentication entry point  
**Features:**
- Keycloak OAuth integration
- Automatic redirect to authorization flow

**User Actions:**
- Redirects immediately to Keycloak
- Handles OAuth authorization code flow

---

### `/auth/callback` - OAuth Callback Handler
**Purpose:** Complete authentication flow  
**Features:**
- Processes Keycloak redirect
- Exchanges authorization code for tokens
- Stores JWT in secure storage
- Handles first-time user onboarding

**User Actions:**
- Automatic processing (no user interaction)
- Redirects to intended destination or `/feed`
- New users → Onboarding flow (set username)

---

## 🔐 Authenticated Pages

### `/feed` - Main Feed (Home)
**Purpose:** Central hub for content discovery  
**Current Status:** ✅ Fully functional

**Tabs:**
- **Personal:** Posts from groups you've joined
- **Global:** All public posts across the platform
- **Discover:** Algorithm-recommended content

**Features:**
- Post display with voting (upvote/downvote)
- Vote count display with visual feedback
- Sort options:
  - 🆕 Newest (default)
  - ⬆️ Top Voted (highest score)
  - 🔥 Controversial (mixed reactions)
- **Tag filtering** (AO3-style):
  - ✅ Include tags (green chips) - posts must have ALL
  - ❌ Exclude tags (red chips) - posts must have NONE
  - Tag usage counts displayed
  - Clear all filters button
- Tag display on posts (clickable chips)
- Reply button (opens post detail)
- Save button (adds to collection)
- **Pin/Unpin button** (staff only):
  - Pin to personal/global/discover feeds
  - Visual "Pinned" badge on pinned posts

**User Actions:**
- Browse posts across different feeds
- Vote on posts (up/down arrows)
- Filter by include/exclude tags
- Click tags to add them to filters
- Save interesting posts to collections
- Reply to posts (navigates to post detail)
- **Staff:** Pin posts to specific feeds

**Permissions:**
- Anyone: View, vote, save, reply
- Staff (`is_staff: true`): Pin to any feed

---

### `/bookshelf` - Your Personal Library
**Purpose:** Manage saved content and collections  
**Current Status:** ⚠️ Partially implemented

**Features:**
- Collections organization
- Saved posts display
- Saved ebooks (future)
- Saved articles (future)
- Collection management

**User Actions:**
- View all saved content
- Browse by type (posts/ebooks/articles)
- Organize into collections
- Create new collections
- Edit collection details
- Remove items from collections

**Planned Features:**
- [ ] Reading progress tracking
- [ ] Notes and highlights
- [ ] Sharing collections publicly

---

### `/studio` - Content Creation Studio
**Purpose:** Manage your created content  
**Current Status:** ⚠️ Basic implementation

**Features:**
- List of all your posts
- Analytics dashboard (future)
- Draft management (future)
- Engagement metrics (future)

**User Actions:**
- View all posts you've created
- See engagement metrics (views, votes, replies)
- Manage drafts
- Edit published content
- Delete your posts

**Planned Features:**
- [ ] Analytics graphs (views over time)
- [ ] Revenue tracking (for paid content)
- [ ] Audience insights
- [ ] Collaboration tools

---

### `/groups` - Groups Hub
**Purpose:** Discover and manage group memberships  
**Current Status:** ✅ Fully functional

**Sections:**
1. **My Groups** - Groups you've joined
2. **Discover Groups** - Browse public groups
3. **Create Group** button

**Features:**
- Grid/list view of groups
- Group preview cards with:
  - Banner image
  - Avatar
  - Name and description
  - Member count
  - Activity indicators
- Search/filter groups (future)
- Sort by: Recent, Popular, Alphabetical

**User Actions:**
- Browse groups you're a member of
- Discover and join new groups
- Create a new group (opens modal/form)
- Click group → Navigate to group detail page

---

### `/groups/{slug}` - Group Detail Page
**Purpose:** Group homepage and activity feed  
**Current Status:** ✅ Fully functional with tagging

**Header Section:**
- Banner image (customizable)
- Group avatar
- Group name and description
- Member count & follower count
- **Join/Leave** button (for non-members/members)
- **Follow/Unfollow** button (for non-members to get updates)
- **Settings** gear icon (owner/admin/moderator only)

**Feed Section:**
- Posts created in this group
- **Create Post** button (members only):
  - Title input
  - Content textarea (Markdown support)
  - **Tag input** (up to 10 tags):
    - Autocomplete search (300ms debounce)
    - Create new tags inline
    - Visual tag chips with remove buttons
    - Keyboard navigation (Enter, Backspace)
  - Submit button
- Post cards with:
  - Author info (avatar, username)
  - Post content preview
  - **Tags display** (clickable blue chips)
  - Vote count + up/down arrows
  - Reply/Save/Pin buttons
  - Timestamp

**Sidebar:**
- Member list (avatars)
- Group info
- Activity stats

**User Actions:**
- **Anyone:**
  - View group content
  - Follow group (non-members)
- **Members:**
  - Join/leave group
  - Create posts with up to 10 tags
  - Vote on posts
  - Reply to posts
  - Save posts
- **Moderator/Admin/Owner:**
  - Access group settings
  - Pin/unpin posts to group feed
  - Lock/unlock posts (disable replies)
  - Delete posts
  - Manage members
- **Staff:**
  - Pin posts to specific feeds (personal/global/discover)
  - Moderate any group

---

### `/groups/{slug}/settings` - Group Settings
**Purpose:** Configure group and manage members  
**Current Status:** ✅ Functional  
**Access:** Owner, Admin, Moderator (limited)

**Tabs:**

1. **Profile**
   - Edit group name
   - Edit description (Markdown)
   - Upload banner image
   - Upload avatar
   - Change slug (URL)
   - Save button

2. **Members**
   - Member list with roles
   - Role badges (Owner, Admin, Moderator, Member)
   - **Promote/Demote** actions:
     - Member → Moderator
     - Moderator → Admin
     - Admin → Owner (owner only)
   - **Ban/Unban** button
   - **Remove from group** button

3. **Moderation**
   - Configure group visibility (Public/Private)
   - Content moderation settings
   - Post approval workflow (future)
   - Spam filters (future)

4. **Scholarships** (Backend complete, frontend TODO)
   - Create scholarship offers
   - Manage applications
   - Approve/reject applicants

5. **Danger Zone**
   - Delete group (owner only)
   - Archive group (future)
   - Transfer ownership (future)

**Permissions:**
- **Owner:** Full access to all settings
- **Admin:** Most settings (cannot delete group or change owner)
- **Moderator:** Limited moderation tools only

---

### `/groups/{slug}/posts/{id}` - Post Detail Page
**Purpose:** View and interact with individual post  
**Current Status:** ✅ Fully functional with tag editing

**Post Display:**
- Full post content (Markdown rendered)
- Author info with avatar
- Post metadata:
  - Created date
  - Edited date (if edited)
  - Group name (linked)
- **Tags display:**
  - Blue chips below content
  - Clickable (adds to feed filter)
  - Shows usage count on hover
- Vote count with up/down arrows
- **Edit button** (post author only):
  - Edit post content
  - **Edit tags** (add/remove up to 10)
  - Save/Cancel buttons

**Action Buttons:**
- **Reply** - Opens reply form (future: threaded comments)
- **Save** - Adds to collection (opens modal)
- **Edit** (author only) - Enables edit mode
- **Pin/Unpin** (moderator+):
  - Dropdown to select feeds:
    - Group feed
    - Personal feed
    - Global feed
    - Discover feed
    - Updates feed
    - Beta feed
  - Multiple selections allowed
  - Shows count badge: "Pinned (3)"
- **Lock/Unlock** (moderator+) - Disable/enable replies
- **Delete** (moderator+ or author) - Remove post

**Reply Section (Future):**
- Threaded comment display
- Reply to specific comments
- Vote on comments
- Markdown support

**User Actions:**
- **Anyone:**
  - Read full post
  - Vote on post
  - Click tags to filter feed
  - Reply to post (future)
  - Save to collection
- **Post Author:**
  - Edit post content
  - Edit tags (add/remove up to 10)
  - Delete post
- **Moderator/Admin/Owner:**
  - Pin to group feed
  - Lock/unlock comments
  - Delete post
- **Staff:**
  - Pin to specific feeds (personal/global/discover)
  - Moderate any post

---

### `/store` - Marketplace
**Purpose:** Browse and purchase digital content  
**Current Status:** ⚠️ Backend partially implemented, minimal frontend

**Planned Features:**
- [ ] Browse ebooks by category
- [ ] Search digital content
- [ ] Purchase flow (Stripe integration)
- [ ] Download purchased content
- [ ] Seller dashboard
- [ ] Revenue analytics for creators
- [ ] Review and rating system

**Seller Features (Future):**
- [ ] Upload ebooks (EPUB, PDF, MOBI)
- [ ] Set pricing and discounts
- [ ] Manage listings
- [ ] View sales analytics
- [ ] Withdraw earnings

---

### `/search` - Global Search
**Purpose:** Find content across the platform  
**Current Status:** ⚠️ Basic implementation

**Search Types:**
- Posts
- Groups
- Users
- Ebooks (future)
- Articles (future)

**Filters:**
- Content type selector
- Date range
- Sort by relevance/date
- **Tag-based search:**
  - Include specific tags
  - Exclude specific tags
  - Combine multiple tags (AND/OR logic)

**User Actions:**
- Search across all content
- Filter by type and tags
- Save searches (future)
- Set up search alerts (future)

---

### `/profile/{username}` - User Profile
**Purpose:** View user's public activity and info  
**Current Status:** ⚠️ Basic implementation

**Profile Header:**
- Avatar
- Display name
- Username (@handle)
- Bio (Markdown)
- Join date
- Follow/Unfollow button

**Tabs:**
1. **Posts** - User's public posts
2. **Groups** - Groups they're in (public)
3. **Collections** - Public collections (future)
4. **About** - Extended bio, links, badges

**User Actions:**
- View user's public activity
- Follow/unfollow user
- Message user (future)
- Report user (future)

---

### `/settings` - Account Settings
**Purpose:** Manage account and preferences  
**Current Status:** ⚠️ Basic implementation

**Tabs:**

1. **Profile**
   - Upload avatar
   - Edit display name
   - Edit bio (Markdown)
   - Social media links

2. **Account**
   - Change email
   - Change password (Keycloak managed)
   - Connected accounts (GitHub, Google, etc.)
   - Two-factor authentication (future)

3. **Privacy**
   - Profile visibility (Public/Private)
   - Show email to others
   - Allow direct messages
   - Activity visibility

4. **Notifications**
   - Email notifications toggle
   - Push notifications (future)
   - Notification frequency
   - Specific event triggers

5. **Data & Privacy**
   - Download your data (GDPR)
   - Delete account
   - Cookie preferences
   - Privacy policy link

---

### `/collections` - Your Collections
**Purpose:** Manage all your collections  
**Current Status:** ⚠️ Partially implemented

**Features:**
- Grid/list view of collections
- Collection cards with:
  - Cover image (first item or custom)
  - Collection name
  - Item count
  - Public/Private indicator
- Create new collection button
- Sort by: Recent, Alphabetical, Most items

**User Actions:**
- View all your collections
- Create new collection
- Edit collection details
- Delete collections
- Toggle public/private
- Share public collections

---

### `/collections/{id}` - Collection Detail
**Purpose:** View and manage collection contents  
**Current Status:** ⚠️ Partially implemented

**Header:**
- Collection name (editable)
- Description (editable)
- Public/Private toggle
- Share button
- Settings dropdown

**Content List:**
- Saved items grouped by type:
  - Posts
  - Ebooks
  - Articles
- Item cards with preview
- Remove button (owner only)
- Reorder items (drag-and-drop, future)

**User Actions:**
- **Owner:**
  - View all items
  - Remove items
  - Edit name/description
  - Delete collection
  - Share collection
- **Visitors (if public):**
  - View items
  - Save collection (copy to own library, future)

---

## 🛡️ Staff-Only Pages

### `/staff` - Staff Dashboard
**Purpose:** Site-wide administration and moderation  
**Current Status:** ⚠️ Basic implementation  
**Access:** Users with `is_staff: true`

**Sections:**

1. **Moderation Queue**
   - Reported posts
   - Reported users
   - Flagged content
   - Action buttons (approve/delete/ban)

2. **User Management**
   - User search
   - View user details
   - Ban/unban users
   - Grant/revoke staff status
   - View user activity logs

3. **Analytics**
   - Site-wide metrics
   - User growth charts
   - Content creation trends
   - Engagement metrics

4. **System Health**
   - Link to Grafana dashboards
   - Database connection pool status
   - Redis cache stats
   - API error rates

**Staff Actions:**
- Moderate any content
- Pin posts to any feed
- Access any group settings
- Ban users site-wide
- View system metrics

---

## 🔌 Technical/System Routes

### `/api/v1/*` - Backend API
**Purpose:** RESTful API for all operations  
**Documentation:** OpenAPI/Swagger available

**Key Endpoint Groups:**
- `/auth` - Authentication (login, logout, token refresh)
- `/users` - User profiles and management
- `/groups` - Group CRUD and membership
- `/posts` - Post CRUD and interactions
- `/feed` - Feed generation and filtering
- `/content-tags` - Tag management and filtering
- `/collections` - Collection management
- `/store` - Marketplace operations (future)

**Authentication:**
- Bearer token (JWT from Keycloak)
- Token refresh via `/auth/refresh`
- CORS enabled for `workshelf.dev`

---

### `/metrics` - Prometheus Metrics
**Purpose:** System observability  
**Access:** Internal network only (Grafana)

**Metrics Exposed:**
- HTTP request rate and latency
- Database query performance
- Redis cache hit/miss rate
- Error rates by endpoint
- Custom business metrics

---

## Ideas

**READER:**
- ebook /article reader 