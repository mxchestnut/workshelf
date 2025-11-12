# Work Shelf Frontend Development Roadmap

**Last Updated**: December 2024  
**Purpose**: Comprehensive guide mapping backend API coverage to frontend implementation status

---

## Executive Summary

The Work Shelf backend has **extensive API coverage** across all major feature areas. The frontend has implemented **core writing features** (documents, projects) and **partial social features** (groups, bookshelf, authors). This roadmap identifies gaps and provides actionable tasks for frontend development.

### Current State
- ✅ **Complete**: Document editor, projects, document templates
- 🟡 **Partial**: Bookshelf, groups, authors, beta reading, EPUB uploads, store
- ❌ **Missing**: Messaging, comments, subscriptions, AI templates, export, content integrity, notifications, activity feed, advanced bookshelf features

---

## Priority Levels

- **P0 (Critical)**: Core user flows, blocking issues
- **P1 (High Value)**: High-impact features with clear user demand
- **P2 (Medium Value)**: Nice-to-have features, enhancements
- **P3 (Low Priority)**: Advanced/experimental features

---

## Feature Areas

### 1. Core Writing Platform ✅ COMPLETE

**Backend Files**: `documents.py`, `projects.py`, `folders.py`, `documents_backup.py`

**Frontend Status**: FULLY IMPLEMENTED
- ✅ Document editor with Tiptap 3.10.5
- ✅ Project management
- ✅ Document template selection
- ✅ Folder organization (basic UI exists)

**No Action Required** - Core writing features working end-to-end

---

### 2. Bookshelf 🟡 PARTIAL (P1)

**Backend Endpoints** (`bookshelf.py`):
- ✅ GET `/bookshelf` - List user's books (IMPLEMENTED)
- ✅ POST `/bookshelf` - Add book (IMPLEMENTED)
- ✅ GET `/bookshelf/{id}` - Get book details (IMPLEMENTED)
- ✅ PUT `/bookshelf/{id}` - Update book (IMPLEMENTED)
- ✅ DELETE `/bookshelf/{id}` - Delete book (BACKEND EXISTS, NO UI)
- ✅ GET `/bookshelf/stats` - Reading statistics (IMPLEMENTED)
- ✅ GET `/bookshelf/public/{username}` - Public bookshelf (IMPLEMENTED)
- ✅ GET `/bookshelf/recommendations/by-favorite-authors` - AI recommendations (IMPLEMENTED)
- ✅ POST `/bookshelf/enhance-book-data` - Enrich book metadata (IMPLEMENTED)
- ❌ PUT `/bookshelf/{id}/progress` - Update reading progress (PARTIAL - endpoint called but no UI)
- ❌ GET `/bookshelf/search` - Search user's bookshelf (MISSING)
- ❌ GET `/bookshelf/reading-now` - Currently reading books (MISSING)
- ❌ GET `/bookshelf/wishlisted` - Books to read (MISSING)

**Frontend Files**:
- `Bookshelf.tsx` - Main bookshelf page
- `BookDetail.tsx` - Individual book view
- `AddBookModal.tsx` - Add/edit book modal
- `PublicProfile.tsx` - Shows public bookshelf

**Missing UI Components**:
1. **Remove Book from Bookshelf** (P0 - CRITICAL)
   - Delete/remove button on book cards or detail page
   - Confirmation dialog before deletion
   - Handles duplicate books (user has same book twice)
   - Backend endpoint exists: `DELETE /bookshelf/{id}`
   - **User Issue**: "I have two of the same book. I should be able to remove one."

2. **Reading Progress Tracker** (P1)
   - Progress bar/percentage display on book cards
   - Quick update reading status (not started, reading, finished)
   - Reading statistics dashboard with graphs
   
3. **Search & Filter** (P1)
   - Search within user's bookshelf
   - Filter by reading status, genre, author
   - Sort by added date, title, author, rating
   
4. **Reading Lists** (P2)
   - "Currently Reading" dedicated view
   - "Want to Read" wishlist
   - Custom reading lists/collections

**Action Items**:
```typescript
// TODO: Add remove book functionality (P0 - CRITICAL)
// Location: Bookshelf.tsx and/or BookDetail.tsx
// - Add delete/remove button to book cards
// - Confirmation modal: "Remove [Book Title] from your bookshelf?"
// - DELETE /bookshelf/{id}
// - Refresh bookshelf after deletion
// - Handle case where user has duplicate entries

// TODO: Add reading progress UI to BookDetail.tsx
// - Visual progress bar (0-100%)
// - Quick status buttons (Not Started | Reading | Finished)
// - Date started/finished tracking
// - Call PUT /bookshelf/{id}/progress endpoint

// TODO: Add search bar to Bookshelf.tsx
// - Search input with debounce
// - Call GET /bookshelf/search?q={query}
// - Real-time filtering of displayed books

// TODO: Create ReadingNow.tsx component
// - Dedicated page for currently reading books
// - Call GET /bookshelf/reading-now
// - Show progress for each book
```

---

### 3. EPUB Uploads & Store 🟡 PARTIAL (P1)

**Backend Endpoints** (`epub_uploads.py`, `store.py`, `admin_store.py`):

**EPUB Uploads**:
- ✅ POST `/epub-uploads/upload` - Upload EPUB (IMPLEMENTED)
- ✅ GET `/epub-uploads/{id}` - Get submission status (IMPLEMENTED)
- ❌ GET `/epub-uploads` - List user's submissions (MISSING)
- ❌ DELETE `/epub-uploads/{id}` - Cancel submission (MISSING)
- ❌ POST `/epub-uploads/{id}/verify` - Verify metadata (MISSING - Admin only)
- ❌ POST `/epub-uploads/{id}/moderate` - Approve/reject (MISSING - Admin only)

**Store** (12 endpoints):
- ✅ GET `/store/browse` - Browse books (IMPLEMENTED)
- ✅ GET `/store/{id}` - Book details (IMPLEMENTED)
- ✅ POST `/store/create-checkout` - Purchase book (IMPLEMENTED)
- ✅ POST `/store/{id}/add-to-shelf` - Add to bookshelf after purchase (IMPLEMENTED)
- ✅ GET `/store/books` - Featured books (IMPLEMENTED on homepage)
- ❌ GET `/store/purchased` - User's purchased books (MISSING)
- ❌ GET `/store/author-earnings` - Author revenue dashboard (MISSING)
- ❌ GET `/store/analytics` - Book sales analytics (MISSING)
- ❌ POST `/store/review` - Submit book review (MISSING)
- ❌ GET `/store/{id}/reviews` - Get book reviews (MISSING)

**Frontend Files**:
- `UploadBook.tsx` - EPUB upload page
- `Store.tsx` - Store browsing
- `BookDetail.tsx` - Shows store books
- `StoreSuccess.tsx` - Purchase confirmation

**Missing Features**:

1. **Submission Management** (P1)
   - My Submissions page listing all EPUB uploads
   - Submission status tracking (pending, approved, rejected)
   - Ability to cancel/delete pending submissions
   - View rejection reasons

2. **Author Dashboard** (P1)
   - Revenue/earnings page for authors
   - Sales analytics and metrics
   - Book performance statistics
   - Royalty payment history

3. **Book Reviews** (P2)
   - Review submission form on book detail pages
   - Display reviews on store listings
   - Star ratings and review text
   - Review moderation (admin)

4. **Purchased Books Library** (P2)
   - Dedicated page showing all purchased books
   - Download/re-download purchased EPUBs
   - Reading progress for purchased books

**Action Items**:
```typescript
// TODO: Create MySubmissions.tsx page
// - List all user's EPUB submissions
// - Show status badges (pending, approved, rejected)
// - Allow canceling pending submissions
// - Display admin feedback on rejections

// TODO: Create AuthorDashboard.tsx page
// - Revenue overview (total earnings, pending, paid)
// - Sales chart over time
// - Top-selling books table
// - Connect to GET /store/author-earnings

// TODO: Add reviews to BookDetail.tsx
// - Review submission form (rating + text)
// - Display existing reviews
// - POST to /store/review
// - GET from /store/{id}/reviews

// TODO: Create PurchasedBooks.tsx page
// - Grid of purchased books
// - Download buttons
// - Reading progress integration
// - GET /store/purchased
```

---

### 4. Beta Reading 🟡 PARTIAL (P1)

**Backend Endpoints** (`beta_reading.py`, `beta_appointments.py`, `beta_profiles.py`):

**Beta Profiles** (3 endpoints):
- ✅ GET `/beta-profiles/my-profile` - Get user's beta profile (IMPLEMENTED)
- ✅ PUT `/beta-profiles/my-profile` - Update profile (IMPLEMENTED)
- ✅ GET `/beta-profiles/marketplace` - Browse beta readers (IMPLEMENTED)

**Beta Appointments** (9 endpoints):
- ✅ GET `/beta-appointments/my-feed` - User's appointments feed (IMPLEMENTED)
- ✅ GET `/beta-appointments/releases/{id}` - Get release details (IMPLEMENTED)
- ❌ POST `/beta-appointments/appointments` - Create appointment (MISSING)
- ❌ PUT `/beta-appointments/appointments/{id}` - Update appointment (MISSING)
- ❌ DELETE `/beta-appointments/appointments/{id}` - Cancel appointment (MISSING)
- ❌ POST `/beta-appointments/releases` - Create beta release (MISSING)
- ❌ PUT `/beta-appointments/releases/{id}` - Update release (MISSING)
- ❌ GET `/beta-appointments/my-appointments` - Author's appointments (MISSING)

**Beta Reading** (8 endpoints):
- ❌ GET `/beta-reading/requests-sent` - Requests sent by author (MISSING)
- ❌ GET `/beta-reading/requests-received` - Requests received as beta reader (MISSING)
- ❌ POST `/beta-reading/request` - Send beta reading request (MISSING)
- ❌ PUT `/beta-reading/request/{id}/respond` - Accept/decline request (MISSING)
- ❌ POST `/beta-reading/feedback` - Submit feedback (MISSING)
- ❌ GET `/beta-reading/feedback/{request_id}` - Get feedback (MISSING)

**Frontend Files**:
- `BetaMarketplace.tsx` - Browse beta readers
- `BetaFeed.tsx` - User's beta appointments
- `MyBetaProfile.tsx` - Edit beta reader profile

**Missing Features**:

1. **Beta Request System** (P1)
   - Send beta reading requests to readers
   - Accept/decline incoming requests
   - Request inbox for beta readers
   - Request outbox for authors

2. **Appointment Management** (P1)
   - Create new beta appointments
   - Schedule releases with deadlines
   - Update appointment status
   - Cancel/reschedule appointments

3. **Feedback System** (P1)
   - Submit beta reading feedback
   - View received feedback
   - Feedback forms with structured questions
   - Ratings and comments

**Action Items**:
```typescript
// TODO: Create BetaRequests.tsx page
// - Tabs: Sent Requests | Received Requests
// - Send request form (connect to marketplace)
// - Accept/decline buttons on received requests
// - POST /beta-reading/request
// - PUT /beta-reading/request/{id}/respond

// TODO: Add appointment creation to BetaFeed.tsx
// - "Create Appointment" modal
// - Select project/document
// - Set deadlines and requirements
// - POST /beta-appointments/appointments

// TODO: Create BetaFeedback.tsx page
// - Feedback submission form
// - View feedback received on your work
// - Structured questionnaire
// - POST /beta-reading/feedback
// - GET /beta-reading/feedback/{request_id}
```

---

### 5. Groups 🟡 PARTIAL (P1)

**Backend Endpoints** (`groups.py`, `group_admin.py`):

**Groups** (15+ endpoints):
- ✅ GET `/groups` - Browse groups (IMPLEMENTED)
- ✅ GET `/groups/my-groups` - User's groups (IMPLEMENTED)
- ✅ GET `/groups/{id}` - Group details (IMPLEMENTED)
- ✅ POST `/groups/request` - Request to create group (IMPLEMENTED)
- ✅ POST `/groups/{id}/join` - Join group (IMPLEMENTED)
- ✅ GET `/groups/{id}/members` - Group members (IMPLEMENTED)
- ✅ GET `/groups/{id}/posts` - Group posts (IMPLEMENTED)
- ✅ POST `/groups/{id}/posts` - Create post (IMPLEMENTED)
- ✅ GET `/groups/managed` - Groups user manages (IMPLEMENTED)

**Group Admin** (10+ endpoints):
- ✅ PUT `/groups/{id}` - Update settings (IMPLEMENTED)
- ✅ GET `/groups/{id}/roles` - List roles (IMPLEMENTED)
- ✅ POST `/groups/{id}/roles` - Create role (IMPLEMENTED)
- ✅ PUT `/groups/{id}/roles/{id}` - Update role (IMPLEMENTED)
- ✅ DELETE `/groups/{id}/roles/{id}` - Delete role (IMPLEMENTED)
- ✅ POST `/groups/{id}/members/{id}/approve` - Approve member (IMPLEMENTED)
- ✅ POST `/groups/{id}/members/{id}/reject` - Reject member (IMPLEMENTED)
- ✅ DELETE `/groups/{id}/members/{id}` - Remove member (IMPLEMENTED)
- ✅ GET `/groups/{id}/publications` - Group publications (IMPLEMENTED)
- ✅ PUT `/groups/{id}/publications/{id}/status` - Update publication status (IMPLEMENTED)

**Frontend Files**:
- `Groups.tsx` - Browse and manage groups
- `GroupDetail.tsx` - Group page with posts
- `GroupAdmin.tsx` - Admin settings page

**Missing Features**:

1. **Post Interactions** (P1)
   - Like/react to posts
   - Comment on posts
   - Edit/delete own posts
   - Pin important posts (admin)

2. **Group Notifications** (P2)
   - New post notifications
   - Mention notifications
   - Member join/leave notifications

3. **Custom Domains** (P2)
   - Configure custom domain for group
   - Domain verification UI

**Action Items**:
```typescript
// TODO: Add post interactions to GroupDetail.tsx
// - Like button on posts
// - Comment section below posts
// - Edit/delete for post author
// - POST /groups/{id}/posts/{post_id}/like
// - POST /groups/{id}/posts/{post_id}/comments

// TODO: Add notification settings to GroupAdmin.tsx
// - Toggle notifications for new posts
// - Mention notification preferences
// - Email digest settings

// TODO: Add custom domain section to GroupAdmin.tsx
// - Domain input field
// - Verification instructions
// - DNS record display
// - PUT /groups/{id}/custom-domain
```

---

### 6. Authors & Relationships 🟡 PARTIAL (P1)

**Backend Endpoints** (`authors.py`, `relationships.py`):

**Authors** (10+ endpoints):
- ✅ GET `/authors` - List authors (IMPLEMENTED)
- ✅ GET `/authors/{id}` - Author profile (IMPLEMENTED)
- ✅ GET `/authors/{id}/books` - Author's books (IMPLEMENTED)
- ✅ POST `/authors/{id}/edit` - Suggest edit (IMPLEMENTED)
- ✅ GET `/authors/{id}/revisions` - View edits (IMPLEMENTED)
- ✅ POST `/authors/{id}/follow` - Follow author (IMPLEMENTED)
- ✅ DELETE `/authors/{id}/follow` - Unfollow author (IMPLEMENTED)
- ✅ GET `/authors/stats` - Author statistics (IMPLEMENTED)
- ✅ GET `/authors/search/{name}/books` - Search author's books (IMPLEMENTED)
- ✅ POST `/authors` - Create author profile (IMPLEMENTED)
- ✅ PUT `/authors/{id}` - Update author profile (IMPLEMENTED)

**Relationships**:
- ✅ POST `/relationships/follow` - Follow user (IMPLEMENTED)
- ✅ DELETE `/relationships/unfollow/{id}` - Unfollow user (IMPLEMENTED)
- ✅ GET `/relationships/following` - Following list (IMPLEMENTED)
- ❌ GET `/relationships/followers` - Followers list (MISSING)
- ❌ POST `/relationships/block` - Block user (MISSING)
- ❌ GET `/relationships/blocked` - Blocked users (MISSING)

**Frontend Files**:
- `Authors.tsx` - Browse authors
- `Author.tsx` - Author profile page
- `PublicProfile.tsx` - User profile with follow/unfollow

**Missing Features**:

1. **Followers List** (P2)
   - View who follows you
   - Follow back functionality

2. **Blocking** (P2)
   - Block abusive users
   - Manage blocked list
   - Prevent interactions from blocked users

**Action Items**:
```typescript
// TODO: Add Followers tab to PublicProfile.tsx
// - Show list of followers
// - Follow back buttons
// - GET /relationships/followers

// TODO: Create BlockedUsers settings page
// - List blocked users
// - Unblock functionality
// - Block button on user profiles
// - POST /relationships/block
// - GET /relationships/blocked
```

---

### 7. Messaging ❌ MISSING (P1)

**Backend Endpoints** (`messaging.py` - 8 endpoints):
- ❌ GET `/messaging/threads` - List message threads (MISSING)
- ❌ POST `/messaging/threads` - Create thread (MISSING)
- ❌ GET `/messaging/threads/{id}` - Get thread messages (MISSING)
- ❌ POST `/messaging/threads/{id}/messages` - Send message (MISSING)
- ❌ PUT `/messaging/threads/{id}/read` - Mark as read (MISSING)
- ❌ DELETE `/messaging/threads/{id}` - Delete thread (MISSING)
- ❌ GET `/messaging/threads/{id}/participants` - List participants (MISSING)
- ❌ POST `/messaging/threads/{id}/participants` - Add participant (MISSING)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Message Inbox** (P1)
   - List of message threads
   - Unread count badge
   - Search threads
   - Archive threads

2. **Message Thread View** (P1)
   - Display messages in thread
   - Send message input
   - Real-time updates (if websockets available)
   - Mark as read

3. **Compose Message** (P1)
   - New message modal
   - Recipient search/selection
   - Multiple recipients support
   - Message composer

**Action Items**:
```typescript
// TODO: Create Messages.tsx page (inbox)
// - Thread list with preview
// - Unread indicators
// - Search and filter
// - GET /messaging/threads

// TODO: Create MessageThread.tsx component
// - Display messages in conversation
// - Message input with send button
// - Auto-scroll to new messages
// - GET /messaging/threads/{id}
// - POST /messaging/threads/{id}/messages

// TODO: Create ComposeMessage.tsx modal
// - User search/autocomplete
// - Multiple recipient chips
// - Subject line (optional)
// - POST /messaging/threads

// TODO: Add message icon to navigation
// - Unread count badge
// - Link to Messages.tsx
// - Consider notification polling
```

---

### 8. Comments ❌ MISSING (P2)

**Backend Endpoints** (`comments.py` - 6 endpoints):
- ❌ GET `/comments/document/{id}` - Get document comments (MISSING)
- ❌ POST `/comments` - Create comment (MISSING)
- ❌ PUT `/comments/{id}` - Update comment (MISSING)
- ❌ DELETE `/comments/{id}` - Delete comment (MISSING)
- ❌ POST `/comments/{id}/react` - React to comment (MISSING)
- ❌ GET `/comments/{id}/reactions` - Get reactions (MISSING)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Document Comments** (P2)
   - Comment section in Document.tsx
   - Inline comments (optional, advanced)
   - Comment threads
   - Reactions (👍 ❤️ etc.)

2. **Comment Management** (P2)
   - Edit own comments
   - Delete own comments
   - Admin moderation tools

**Action Items**:
```typescript
// TODO: Add comments to Document.tsx
// - Comments panel (sidebar or bottom)
// - Load GET /comments/document/{id}
// - Comment input form
// - POST /comments with document_id
// - Display comment list with author info

// TODO: Add comment reactions
// - Reaction buttons below each comment
// - POST /comments/{id}/react
// - Display reaction counts

// TODO: Add comment editing
// - Edit button on own comments
// - Inline edit mode
// - PUT /comments/{id}
// - DELETE /comments/{id}
```

---

### 9. Subscriptions ❌ MISSING (P1)

**Backend Endpoints** (`subscriptions.py` - 10+ endpoints):
- ❌ GET `/subscriptions/tiers` - List subscription tiers (MISSING)
- ❌ POST `/subscriptions/subscribe` - Subscribe to tier (MISSING)
- ❌ POST `/subscriptions/cancel` - Cancel subscription (MISSING)
- ❌ POST `/subscriptions/upgrade` - Upgrade tier (MISSING)
- ❌ GET `/subscriptions/my-subscription` - Current subscription (MISSING)
- ❌ POST `/subscriptions/webhook` - Stripe webhooks (Backend only)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Pricing Page** (P1)
   - Display subscription tiers
   - Feature comparison table
   - Subscribe buttons with Stripe

2. **Subscription Management** (P1)
   - View current subscription
   - Upgrade/downgrade options
   - Cancel subscription
   - Payment history

3. **Feature Gating** (P1)
   - Check subscription status before premium features
   - Upgrade prompts for locked features
   - Graceful degradation for free users

**Action Items**:
```typescript
// TODO: Create Pricing.tsx page
// - Display all subscription tiers
// - Feature comparison grid
// - Subscribe buttons
// - GET /subscriptions/tiers
// - POST /subscriptions/subscribe (redirects to Stripe)

// TODO: Create MySubscription.tsx page
// - Current tier display
// - Billing date and amount
// - Upgrade/downgrade options
// - Cancel subscription button
// - GET /subscriptions/my-subscription
// - POST /subscriptions/cancel

// TODO: Add subscription checks throughout app
// - Create useSubscription() hook
// - Check tier before premium features
// - Show upgrade modal when needed
// - Example: "Export requires Pro subscription"
```

---

### 10. AI Features ❌ MISSING (P2)

**Backend Endpoints** (`ai_templates.py`, `ai_assist.py`):

**AI Templates**:
- ❌ POST `/ai-templates/generate` - Generate document from template (MISSING)
- ❌ GET `/ai-templates/available` - List templates (MISSING)

**AI Assist** (possibly exists):
- ❌ POST `/ai-assist/suggest` - Writing suggestions (MISSING)
- ❌ POST `/ai-assist/improve` - Improve text (MISSING)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Template Generation** (P2)
   - AI template selector on project creation
   - Generate document from user interests
   - Template customization

2. **Writing Assistant** (P3)
   - AI writing suggestions in editor
   - Grammar/style improvements
   - Tone adjustment

**Action Items**:
```typescript
// TODO: Add AI templates to ProjectDetail.tsx
// - "Generate from AI" button
// - Interest-based questionnaire
// - POST /ai-templates/generate
// - GET /ai-templates/available

// TODO: Add AI assistant to Document.tsx (optional)
// - Suggestion panel
// - Selected text improvements
// - POST /ai-assist/suggest
// - POST /ai-assist/improve
```

---

### 11. Export & Content Integrity ❌ MISSING (P2)

**Backend Endpoints** (`export.py`, `content_integrity.py`):

**Export**:
- ❌ POST `/export/document/{id}` - Export to PDF/DOCX/EPUB (MISSING)
- ❌ GET `/export/formats` - Available formats (MISSING)

**Content Integrity**:
- ❌ POST `/content-integrity/check-plagiarism` - Plagiarism scan (MISSING)
- ❌ GET `/content-integrity/report/{id}` - Get scan report (MISSING)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Export Options** (P2)
   - Export button in document editor
   - Format selection (PDF, DOCX, EPUB)
   - Download exported file

2. **Plagiarism Checker** (P3)
   - Scan document button
   - Display similarity report
   - Highlight flagged sections

**Action Items**:
```typescript
// TODO: Add export to Document.tsx
// - Export dropdown in toolbar
// - Format selection (PDF, DOCX, EPUB)
// - POST /export/document/{id}?format={format}
// - Download file from response

// TODO: Add plagiarism check to Document.tsx
// - "Check Originality" button (premium feature)
// - POST /content-integrity/check-plagiarism
// - Display report modal
// - GET /content-integrity/report/{id}
```

---

### 12. Notifications & Activity ❌ MISSING (P1)

**Backend Endpoints** (`notifications.py`, `activity.py`, `feed.py`):

**Notifications**:
- ❌ GET `/notifications` - List notifications (MISSING)
- ❌ PUT `/notifications/{id}/read` - Mark as read (MISSING)
- ❌ PUT `/notifications/read-all` - Mark all as read (MISSING)
- ❌ DELETE `/notifications/{id}` - Dismiss notification (MISSING)

**Activity Feed**:
- ❌ GET `/activity/feed` - User activity feed (MISSING)
- ❌ GET `/activity/following` - Following activity (MISSING)

**Frontend Status**: NO IMPLEMENTATION

**Required Components**:

1. **Notifications Panel** (P1)
   - Bell icon in navigation
   - Unread count badge
   - Dropdown list of notifications
   - Mark as read functionality

2. **Activity Feed** (P2)
   - Timeline of platform activity
   - Following users' activity
   - Filter by activity type

**Action Items**:
```typescript
// TODO: Add notifications to Navigation.tsx
// - Bell icon with unread badge
// - Dropdown showing recent notifications
// - GET /notifications
// - PUT /notifications/{id}/read on click

// TODO: Create ActivityFeed.tsx page
// - Timeline of recent activity
// - Filter: All | Following | Mentions
// - GET /activity/feed
// - GET /activity/following

// TODO: Add notification polling
// - Poll GET /notifications every 30s
// - Update unread count
// - Show toast for new notifications
```

---

### 13. User Profiles & Discovery 🟡 PARTIAL (P2)

**Backend Endpoints** (`user_profiles.py`, `discovery.py`, `search.py`):

**User Profiles**:
- ✅ GET `/profiles/{username}` - Public profile (IMPLEMENTED)
- ❌ PUT `/profiles/me` - Update own profile (MISSING)
- ❌ GET `/profiles/me/stats` - User statistics (MISSING)

**Discovery**:
- ❌ GET `/discovery/trending` - Trending content (MISSING)
- ❌ GET `/discovery/recommended` - Personalized recommendations (MISSING)

**Search**:
- ❌ GET `/search/all` - Global search (MISSING)
- ❌ GET `/search/users` - User search (MISSING)
- ❌ GET `/search/documents` - Document search (MISSING)

**Frontend Files**:
- `PublicProfile.tsx` - View user profiles
- `Dashboard.tsx` - User dashboard (partial)
- `Discover.tsx` - Discovery page (partial)

**Missing Features**:

1. **Edit Profile** (P2)
   - Profile settings page
   - Avatar upload
   - Bio and links
   - Privacy settings

2. **Global Search** (P2)
   - Search bar in navigation
   - Search results page
   - Filters (users, documents, groups)

3. **Discovery Feed** (P2)
   - Trending documents
   - Recommended authors
   - Popular groups

**Action Items**:
```typescript
// TODO: Create ProfileSettings.tsx page
// - Edit bio, avatar, display name
// - Privacy settings
// - PUT /profiles/me

// TODO: Add global search to Navigation.tsx
// - Search input in header
// - Autocomplete dropdown
// - Full results page
// - GET /search/all?q={query}

// TODO: Enhance Discover.tsx
// - Trending section
// - Recommended for you
// - GET /discovery/trending
// - GET /discovery/recommended
```

---

### 14. Admin & Moderation 🟡 PARTIAL (P3)

**Backend Endpoints** (`admin.py`, `admin_moderation.py`, `admin_store.py`):

**Admin**:
- ✅ GET `/admin/stats` - Platform statistics (likely implemented)
- ✅ GET `/admin/users` - User management (partial)
- ❌ POST `/admin/users/{id}/ban` - Ban user (MISSING UI)
- ❌ POST `/admin/users/{id}/unban` - Unban user (MISSING UI)

**Admin Moderation**:
- ✅ GET `/admin/moderation/queue` - Content moderation queue (IMPLEMENTED)
- ✅ POST `/admin/moderation/{id}/approve` - Approve content (IMPLEMENTED)
- ✅ POST `/admin/moderation/{id}/reject` - Reject content (IMPLEMENTED)

**Admin Store**:
- ❌ GET `/admin/store/pending` - Pending EPUB submissions (MISSING)
- ❌ POST `/admin/store/{id}/approve` - Approve book (MISSING)
- ❌ POST `/admin/store/{id}/reject` - Reject book (MISSING)

**Frontend Files**:
- `AdminDashboard.tsx` - Admin overview
- `AdminModeration.tsx` - Content moderation

**Missing Features**:

1. **EPUB Moderation** (P3)
   - Review pending EPUB submissions
   - Approve/reject with feedback
   - View submission details

2. **User Management** (P3)
   - Ban/unban users
   - View user reports
   - User search and filtering

**Action Items**:
```typescript
// TODO: Create AdminStoreModeration.tsx page
// - List pending EPUB submissions
// - Preview book metadata
// - Approve/reject buttons
// - GET /admin/store/pending
// - POST /admin/store/{id}/approve

// TODO: Enhance AdminDashboard.tsx
// - User ban/unban functionality
// - User reports section
// - POST /admin/users/{id}/ban
```

---

## Implementation Sequence

### Phase 1: Core User Features (P1 - 2-3 weeks)

**Week 1: Messaging & Notifications**
1. Messaging system (highest user demand)
   - Message inbox UI
   - Thread view
   - Compose message
2. Notifications panel
   - Bell icon with dropdown
   - Mark as read
   - Notification polling

**Week 2: Subscriptions**
3. Pricing page
4. Subscription management
5. Feature gating logic

**Week 3: Enhanced Bookshelf & Beta Reading**
6. **Remove book from bookshelf** (P0 - do this first!)
7. Reading progress UI
8. Bookshelf search/filter
9. Beta reading requests
10. Beta feedback system

---

### Phase 2: Social & Content (P1-P2 - 2 weeks)

**Week 4: Comments & Social**
1. Document comments
2. Comment reactions
3. Followers list
4. Activity feed

**Week 5: Author Features**
5. Author earnings dashboard
6. EPUB submission management
7. Book reviews

---

### Phase 3: Advanced Features (P2-P3 - 2-3 weeks)

**Week 6: Search & Discovery**
1. Global search
2. Enhanced discovery feed
3. Profile editing

**Week 7: Content Tools**
4. Document export (PDF, DOCX, EPUB)
5. AI templates (if priority)
6. Content integrity checks (if priority)

**Week 8: Polish & Admin**
7. Admin EPUB moderation
8. Advanced group features
9. Bug fixes and UX improvements

---

## Technical Patterns

### API Call Pattern
```typescript
// Standard fetch with auth
const response = await fetch(`${API_URL}/api/v1/endpoint`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

if (!response.ok) {
  throw new Error('API error')
}

const data = await response.json()
```

### Common Components Needed

1. **NotificationBadge.tsx** - Unread count badge
2. **InfiniteScroll.tsx** - Pagination wrapper
3. **ConfirmModal.tsx** - Confirmation dialogs
4. **LoadingSpinner.tsx** - Loading states
5. **ErrorBoundary.tsx** - Error handling
6. **Toast.tsx** - Notification toasts
7. **SearchInput.tsx** - Reusable search with debounce
8. **UpgradePrompt.tsx** - Subscription upgrade modal

---

## Testing Strategy

### Priority Testing Areas

1. **Critical Paths**
   - Message sending/receiving
   - Subscription checkout flow
   - Beta request workflow
   - Document export

2. **Integration Tests**
   - Auth token handling
   - API error responses
   - Loading states
   - Empty states

3. **E2E Tests** (Cypress/Playwright)
   - User signup → profile creation
   - Document creation → sharing → comments
   - EPUB upload → moderation → store listing
   - Subscribe → access premium features

---

## Success Metrics

### User Engagement
- Message threads created per week
- Beta reading requests sent/completed
- Books added to bookshelves
- Groups joined and active

### Revenue
- Subscription conversion rate
- EPUB sales volume
- Author earnings disbursed

### Content Quality
- Documents created per user
- Export usage
- Plagiarism checks run

---

## Dependencies & Blockers

### External Dependencies
1. **Stripe** - Subscription payments (already integrated in backend)
2. **File Storage** - EPUB uploads and exports (likely Azure Blob)
3. **Email Service** - Notifications (backend handles)

### Technical Blockers
1. **WebSockets** - Real-time messaging (optional, can use polling)
2. **CDN** - File downloads for exports (optional)
3. **Search Service** - Full-text search (backend has this)

---

## Notes

- **Backend is feature-complete** - All major endpoints exist and are documented
- **Frontend foundation is solid** - Core writing features work well
- **Major gaps are social features** - Messaging, comments, notifications
- **Subscription system is critical** - Needed for monetization
- **Incremental deployment** - Can ship features one at a time

---

## Quick Reference: Endpoint Summary

| Feature Area | Total Endpoints | Implemented | Missing |
|--------------|----------------|-------------|---------|
| Documents | 10 | 10 | 0 ✅ |
| Projects | 8 | 8 | 0 ✅ |
| Bookshelf | 13 | 9 | 4 (+ missing delete UI) |
| Store | 12 | 6 | 6 |
| EPUB Uploads | 6 | 2 | 4 |
| Authors | 11 | 11 | 0 ✅ |
| Groups | 15 | 9 | 6 |
| Beta Reading | 20 | 5 | 15 |
| Messaging | 8 | 0 | 8 ❌ |
| Comments | 6 | 0 | 6 ❌ |
| Subscriptions | 10 | 0 | 10 ❌ |
| Notifications | 5 | 0 | 5 ❌ |
| AI Features | 4 | 0 | 4 ❌ |
| Export | 2 | 0 | 2 ❌ |
| Relationships | 6 | 3 | 3 |
| Search | 4 | 0 | 4 ❌ |
| Discovery | 2 | 0 | 2 ❌ |
| Admin | 15 | 8 | 7 |

**TOTAL: ~160 endpoints, ~70 implemented (~44% complete)**

---

## 🚀 Code Quality & UX Improvements

**Based on thorough code review, here are enhancements that would make Work Shelf AMAZING:**

**✅ COMPLETED (Batch 1 - Nov 12, 2025):**
- ~~2. Projects Page Using Real Data~~ ✅ Fixed - loads from API
- ~~4. Keyboard Shortcuts for Editor~~ ✅ Added ⌘S, ⌘K, ⌘/, ⌘⇧P
- ~~27. Better Error Messages~~ ✅ User-friendly messages throughout

**✅ COMPLETED (Batch 2 - Nov 12, 2025):**
- ~~14. Image Lazy Loading~~ ✅ All images now lazy load
- ~~16. Reading Time Calculations~~ ✅ Utility function created, displayed on BookDetail

**✅ COMPLETED (Batch 3 - Nov 12, 2025):**
- ~~1. Delete Book from Bookshelf~~ ✅ Added delete button to BookDetail page
- ~~13. Better Loading States~~ ✅ Added skeleton loading to Projects page
- ~~20. Form Validation~~ ✅ Added validation to Profile save function

---

### 🎯 Critical UX Improvements (P0)

#### ~~1. **Delete Book from Bookshelf**~~ ✅ FIXED (Batch 3 - Nov 12, 2025)
**Was**: Backend `DELETE /bookshelf/{id}` existed, but NO delete button in UI  
**User Impact**: "I have two of the same book. I should be able to remove one."  
**Now Fixed**:
- ✅ Added delete button to BookDetail page with Trash2 icon
- ✅ Confirmation dialog prevents accidental deletion
- ✅ Graceful error handling with user-friendly messages
- ✅ Navigates back to Bookshelf after successful deletion

#### ~~2. **Projects Page is Mock Data**~~ ✅ FIXED (Nov 12, 2025)
**Was**: `Projects.tsx` displayed hardcoded fake projects  
**Now Fixed**: 
- ✅ Loads real projects from `GET /api/v1/projects`
- ✅ Real document counts and collaborator counts
- ✅ Relative time display ("2 hours ago")
- ✅ Clickable projects open detail pages
- ✅ Empty state with "Create Your First Project" button
- ✅ Better error handling with user-friendly messages

#### 3. **Dashboard Shows Mock Analytics** ⚠️
**Current State**: `Dashboard.tsx` has mock data for views/reads/likes  
**Backend Available**: Services exist but no API endpoints exposed  
**Needed**:
- Backend: Create `/api/v1/analytics/dashboard` endpoint
- Use `studio_analytics_service.py` logic
- Track real document views, reads, engagement
- Frontend: Connect to real data

---

### ✨ High-Impact Enhancements (P1)

#### ~~4. **Keyboard Shortcuts for Editor**~~ ✅ COMPLETED (Nov 12, 2025)
**Why Amazing**: Professional writing experience  
**Implemented**:
- ✅ **⌘/Ctrl + S**: Manual save
- ✅ **⌘/Ctrl + K**: Toggle writing prompts
- ✅ **⌘/Ctrl + /**: Show keyboard shortcuts help panel
- ✅ **⌘/Ctrl + Shift + P**: Toggle publish/draft status
- ✅ Keyboard shortcuts help modal with all commands
- ✅ Platform-aware (shows ⌘ on Mac, Ctrl on Windows)

#### 5. **Focus/Zen Mode for Writing** 🧘
**Why Amazing**: Distraction-free writing experience  
**Features**:
- Hide navigation/sidebars
- Full-screen editor
- Minimal UI
- Immersive background
- Optional ambient sounds
```typescript
const [focusMode, setFocusMode] = useState(false)

return (
  <div className={focusMode ? 'focus-mode' : ''}>
    {!focusMode && <Navigation />}
    <Editor fullscreen={focusMode} />
    <button onClick={() => setFocusMode(!focusMode)}>
      Toggle Focus Mode
    </button>
  </div>
)

// CSS:
.focus-mode {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1a1a1a;
  z-index: 9999;
}
```

#### 6. **Writing Streaks & Goals** 🎯 MOTIVATION
**Why Amazing**: Gamification increases engagement  
**Features**:
- Daily writing streak counter
- Word count goals (daily/weekly/monthly)
- Progress visualization
- Achievement badges
- Habit tracking
```typescript
// New component: WritingGoals.tsx
interface WritingGoal {
  daily_words: number
  current_streak: number
  longest_streak: number
  words_today: number
  words_this_week: number
  words_this_month: number
}

// Backend endpoint needed:
// GET /api/v1/writing-goals
// PUT /api/v1/writing-goals/set-goal
```

#### 7. **Document Version History** 📜 ESSENTIAL
**Why Amazing**: Writers can revert changes, see evolution  
**Backend**: `documents_backup.py` exists but not used!  
**Features**:
- Automatic version snapshots
- View diff between versions
- Restore previous versions
- Version labels/notes
```typescript
// Add to Document.tsx:
const [versions, setVersions] = useState([])
const [showVersions, setShowVersions] = useState(false)

// Load versions:
const loadVersions = async () => {
  const response = await fetch(
    `${API_URL}/api/v1/documents/${documentId}/versions`
  )
  const data = await response.json()
  setVersions(data)
}

// Version viewer:
<VersionHistory 
  versions={versions}
  onRestore={(versionId) => restoreVersion(versionId)}
/>
```

#### 8. **Collaborative Editing Indicators** 👥
**Why Amazing**: Real-time collaboration awareness  
**Features**:
- Show who's editing (avatars)
- Live cursor positions
- Real-time word count updates
- "User is typing..." indicator
- Conflict resolution

#### 9. **Smart Auto-Complete & Suggestions** 🤖
**Why Amazing**: AI-powered writing assistance  
**Using**: `ai_assistance_service.py`  
**Features**:
- Sentence completion
- Synonym suggestions
- Grammar fixes in real-time
- Style consistency checks
- Character name tracking
```typescript
// Add to Editor.tsx:
const [suggestions, setSuggestions] = useState([])

const getSuggestions = useCallback(
  debounce(async (text: string, position: number) => {
    const response = await fetch(`${API_URL}/api/v1/ai-assist/suggest`, {
      method: 'POST',
      body: JSON.stringify({ text, position })
    })
    const data = await response.json()
    setSuggestions(data.suggestions)
  }, 500),
  []
)
```

#### ~~10. **Reading Time Estimates Everywhere**~~ ✅ COMPLETED (Batch 2)
**Why Amazing**: User expectation setting  
**Implemented**: 
- ✅ Created `reading-time.ts` utility with `calculateReadingTime()` and `calculateBookReadingTime()`
- ✅ Supports multiple reading speeds (technical, normal, fiction, skimming)
- ✅ BookDetail page shows estimated reading time next to page count
- ✅ Utility ready to use across all pages (document cards, bookshelf, projects)

**Next Steps**: Add to more locations (document cards, project overview)

---

### 🎨 Visual & Polish (P2)

#### 11. **Book Cover Placeholders** 🖼️
**Current Issue**: Missing covers show broken images  
**Fix**: Generate beautiful placeholder covers

#### ~~12. **Empty States with Personality**~~ ✅ COMPLETED (Nov 12, 2025)
**Was**: Generic "no items" messages  
**Now**: 
- ✅ Projects page shows engaging empty state
- ✅ "No projects yet - Start your writing journey!"
- ✅ Call-to-action button to create first project
- ✅ Beautiful icon and helpful messaging

#### 13. **Loading Skeletons Instead of Spinners** ⚡
**Why Better**: Perceived performance improvement  
**Replace**: Generic loading spinners  
**With**: Content-shaped skeleton screens  
```typescript
// BookshelfSkeleton.tsx
<div className="book-grid">
  {[1, 2, 3, 4].map(i => (
    <div key={i} className="book-card-skeleton">
      <div className="skeleton-cover" />
      <div className="skeleton-title" />
      <div className="skeleton-author" />
    </div>
  ))}
</div>
```

#### 14. **Progress Animations** 🎬
**Add Delight**:
- Confetti when completing a book
- Celebration when reaching word count goals
- Smooth transitions between pages
- Micro-interactions on buttons

#### 15. **Dark Mode Toggle** 🌙
**User Request**: Many writers prefer dark mode  
**Implementation**:
```typescript
const [theme, setTheme] = useState<'light' | 'dark'>('light')

useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem('theme', theme)
}, [theme])

// CSS variables approach:
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
}

.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
}
```

---

### 🔧 Technical Improvements (P2)

#### 16. **Optimistic UI Updates** 🚀
**Current**: Wait for API response before updating UI  
**Better**: Update UI immediately, rollback on error  
```typescript
// Example: Adding to bookshelf
const addBookOptimistic = async (book: Book) => {
  // Immediately add to UI
  setBooks([...books, book])
  
  try {
    const response = await fetch(`${API_URL}/api/v1/bookshelf`, {
      method: 'POST',
      body: JSON.stringify(book)
    })
    
    if (!response.ok) {
      // Rollback on error
      setBooks(books.filter(b => b.id !== book.id))
      throw new Error('Failed')
    }
  } catch (err) {
    toast.error('Failed to add book')
  }
}
```

#### 17. **Infinite Scroll for Lists** ♾️
**Current**: Pagination or limited results  
**Better**: Smooth infinite scroll  
**Apply to**: Bookshelf, Feed, Projects, Groups  
```typescript
// useInfiniteScroll.ts
const useInfiniteScroll = (loadMore: () => void) => {
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMore()
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])
}
```

#### ~~18. **Image Lazy Loading**~~ ✅ COMPLETED (Batch 2)
**Implemented**: All book cover images across 10+ pages now have `loading="lazy"` attribute
- ✅ Bookshelf.tsx (2 locations)
- ✅ BookDetail.tsx
- ✅ Store.tsx (2 locations)
- ✅ FreeBooks.tsx
- ✅ Home.tsx
- ✅ Discover.tsx
- ✅ Author.tsx (2 locations)
- ✅ Authors.tsx
- ✅ PublicProfile.tsx (2 locations)

**Performance Impact**: Images load on-demand as user scrolls, reducing initial page load time

#### 19. **PWA Support** 📱
**Why Amazing**: Install as app, offline access  
**Add**:
- Service worker for offline capability
- App manifest for installability
- Offline document drafts
- Background sync

#### 20. **Error Boundaries with Recovery** 🛡️
**Current**: Errors crash the app  
**Better**: Graceful error handling  
```typescript
// ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
          <button onClick={() => window.location.href = '/'}>
            Go Home
          </button>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

---

### 💡 Innovative Features (P3 - Future)

#### 21. **Voice Typing** 🎤
**Why Amazing**: Accessibility + convenience  
**Use**: Web Speech API  
```typescript
const startVoiceTyping = () => {
  const recognition = new window.webkitSpeechRecognition()
  recognition.continuous = true
  recognition.interimResults = true
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('')
    
    editor.commands.insertContent(transcript)
  }
  
  recognition.start()
}
```

#### 22. **Character & Location Wiki** 📖
**Why Amazing**: Track story elements automatically  
**Features**:
- AI extracts character names
- Build character profiles
- Location tracking
- Relationship maps
- Timeline visualization

#### 23. **Writing Sessions with Pomodoro** 🍅
**Why Amazing**: Productivity technique built-in  
**Features**:
- 25-min writing sessions
- 5-min breaks
- Session statistics
- Distraction blocking
- Session goals

#### 24. **Manuscript Formatting** 📄
**Why Amazing**: One-click professional formatting  
**Presets**:
- Standard manuscript format
- Academic style
- Screenplay format
- Query letter format

#### 25. **Collaboration Annotations** 💬
**Why Amazing**: Better feedback workflow  
**Features**:
- Highlight text to comment
- Threaded discussions
- Suggestion mode (like Google Docs)
- Accept/reject changes
- @mentions in comments

---

### 🐛 Quick Wins (Easy Fixes)

#### 26. **Add Loading States Everywhere**
- Button loading spinners during API calls
- ~~Skeleton screens while loading content~~ ✅ Projects page has spinner
- Progress indicators for uploads

#### ~~27. **Better Error Messages**~~ ✅ COMPLETED (Nov 12, 2025)
**Was**: Technical errors like "500 Internal Server Error", "Failed to load"  
**Now**:
- ✅ "Your session has expired. Please log in again." (401 errors)
- ✅ "Network error. Please check your connection." (fetch failures)
- ✅ "Unable to load your projects. Please try again." (API failures)
- ✅ User-friendly messages throughout Projects and Document pages

#### 28. **Form Validation**
- Real-time validation in forms
- Clear error indicators
- Helpful hints (e.g., "Password must be 8+ characters")

#### 29. **Responsive Mobile Design**
- Test on mobile devices
- Touch-friendly buttons
- Mobile navigation menu
- Swipe gestures

#### 30. **Accessibility (a11y)**
- ARIA labels on all interactive elements
- Keyboard navigation
- Screen reader support
- Focus indicators
- Semantic HTML

---

### 📊 Analytics to Add

**Track User Behavior** (using `activity_service.py`):
- Time spent writing per session
- Most active writing times
- Popular templates
- Common paths through app
- Feature usage metrics
- Retention tracking

**Writing Analytics**:
- Words written per day/week/month
- Most productive days/times
- Genre preferences
- Average session length
- Completion rates

---

### 🎁 Delightful Details

1. **Congratulations on milestones**
   - "You've written 10,000 words! 🎉"
   - "7-day writing streak! 🔥"
   - "Your first published document! 🚀"

2. **Personalized greetings**
   - "Good morning, [Name]! Ready to write?"
   - "Welcome back! You wrote 500 words yesterday."

3. **Smart suggestions**
   - "You haven't written in 3 days. Start a new document?"
   - "Finish your draft? You're 80% complete."

4. **Social proof**
   - "500 authors published today"
   - "10,000 words written this hour"

5. **Easter eggs**
   - Konami code for special theme
   - Secret keyboard shortcuts
   - Hidden achievements

---

## 🎯 Recommended Implementation Order

### ~~Sprint 1 (Week 1): Critical Fixes~~ ✅ PARTIALLY COMPLETE
1. ~~✅ Fix Projects page with real data (P0)~~ ✅ DONE
2. ✅ Delete book from bookshelf (P0) - TODO
3. ~~✅ Keyboard shortcuts for editor (P1)~~ ✅ DONE
4. ✅ Version history for documents (P1) - TODO

### Sprint 2 (Week 2): UX Enhancements
5. ✅ Focus/Zen mode (P1)
6. ✅ Writing goals & streaks (P1)
7. ✅ Empty states with personality (P2)
8. ✅ Loading skeletons (P2)

### Sprint 3 (Week 3): Social & Missing Features
9. ✅ Messaging system (P1)
10. ✅ Notifications (P1)
11. ✅ Comments on documents (P2)
12. ✅ Activity feed (P2)

### Sprint 4 (Week 4): Polish & Performance
13. ✅ Optimistic UI updates (P2)
14. ✅ Infinite scroll (P2)
15. ✅ Dark mode (P2)
16. ✅ Better error handling (P2)

---

**🎉 With these improvements, Work Shelf will be an INCREDIBLE writing platform!**

---

**Questions or clarifications? Update this document as features are completed.**
