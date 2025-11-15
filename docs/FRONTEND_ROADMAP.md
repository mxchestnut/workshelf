# Work Shelf Frontend Development Roadmap

**Last Updated**: November 14, 2025  
**Purpose**: Production readiness assessment and gap analysis for new user onboarding

---

## Executive Summary

Work Shelf has **solid core functionality** for writing and social features. The platform is functional but needs polish and missing features before scaling to new users.

### Current State (November 2025)
- ✅ **Complete**: Document editor, projects, groups, bookshelf (with delete), authors, beta reading marketplace, store, feed
- 🟡 **Partial**: Notifications (bell exists, no full page), beta appointments (feed only), comments (not implemented)
- ❌ **Missing**: Messaging, subscriptions, export, AI features (removed), content integrity, full activity feed

### Production Readiness Status: 🟡 70% Ready
**Blockers for New Users:**
1. ❌ No messaging system (users expect DMs)
2. ❌ No document comments/feedback system
3. ❌ No subscription/monetization (business model incomplete)
4. ❌ No export to PDF/DOCX (writers need this)
5. 🟡 Notifications incomplete (bell exists but no notification center)

---

## Priority Levels for Production Launch

- **P0 (Launch Blockers)**: Must have before opening to new users
- **P1 (High Priority)**: Should have within first month of launch
- **P2 (Medium Priority)**: Nice-to-have, can launch without
- **P3 (Future)**: Advanced features for later releases

---

## Production Readiness Checklist

### ✅ Core Features (Ready for Production)

1. **Writing Platform** ✅
   - Document editor with Tiptap
   - Auto-save functionality
   - Project organization
   - Document templates
   - Keyboard shortcuts (⌘S, ⌘K, etc.)

2. **Social Features** ✅
   - Groups (browse, join, create, post)
   - Group admin dashboard
   - Role management
   - Member moderation
   - Following/unfollowing users
   - Public profiles

3. **Bookshelf** ✅
   - Add/remove books
   - Search functionality (client-side)
   - Reading stats
   - Public bookshelves
   - AI recommendations
   - Book detail pages

4. **Beta Reading** ✅
   - Beta marketplace (browse readers)
   - Beta profile creation/editing
   - Beta feed (view assignments)
   - Release viewing

5. **Store & EPUB** ✅
   - Browse store books
   - Purchase flow (Stripe)
   - EPUB upload
   - Author profiles
   - Free books integration

6. **Navigation & Auth** ✅
   - Keycloak authentication
   - Main navigation (desktop/mobile)
   - Notification bell (shows unread count)
   - Responsive design

### ❌ Critical Gaps (P0 - Launch Blockers)

#### 1. **Messaging System** (P0) 
**Why Critical**: Users expect to communicate with beta readers, authors, group members
**Backend**: 8 endpoints exist (`messaging.py`)
**Frontend**: Nothing implemented
**Estimated Time**: 1-2 weeks

**Required Components:**
- Messages inbox page
- Thread/conversation view
- Compose message modal
- Unread count in navigation
- Real-time or polling updates

#### 2. **Document Comments/Feedback** (P0)
**Why Critical**: Core collaboration feature for beta reading
**Backend**: 6 endpoints exist (`comments.py`)
**Frontend**: Nothing implemented
**Estimated Time**: 1 week

**Required Components:**
- Comments section in document viewer
- Add/edit/delete comments
- Comment reactions
- Threading (replies)

#### 3. **Subscription/Monetization** (P0)
**Why Critical**: Business model, revenue generation
**Backend**: 10+ endpoints exist (`subscriptions.py`)
**Frontend**: Nothing implemented
**Estimated Time**: 1-2 weeks

**Required Components:**
- Pricing page with tiers
- Subscription management page
- Feature gating (check subscription status)
- Upgrade prompts
- Payment history

#### 4. **Document Export** (P0)
**Why Critical**: Writers need to export manuscripts
**Backend**: Endpoints exist (`export.py`)
**Frontend**: Nothing implemented
**Estimated Time**: 3-5 days

**Required Components:**
- Export button in document editor
- Format selection (PDF, DOCX, EPUB)
- Progress indicator
- Download handling

- Download handling

### 🟡 Important Gaps (P1 - First Month After Launch)

#### 5. **Notifications Center** (P1)
**Current State**: NotificationBell component exists (shows unread count)
**Missing**: Full notifications page, mark as read, notification history
**Backend**: Endpoints exist (`notifications.py`)
**Estimated Time**: 3-5 days

#### 6. **Beta Appointment Management** (P1)
**Current State**: Can view beta feed
**Missing**: Create appointments, send releases, manage deadlines
**Backend**: Endpoints exist (`beta_appointments.py`)
**Estimated Time**: 1 week

#### 7. **Activity Feed** (P1)
**Current State**: Feed.tsx exists but shows group posts only
**Missing**: Full activity timeline (following users, document updates, etc.)
**Backend**: Endpoints exist (`activity.py`, `feed.py`)
**Estimated Time**: 3-5 days

#### 8. **Global Search** (P1)
**Current State**: Bookshelf has client-side search
**Missing**: Platform-wide search (users, documents, groups)
**Backend**: Endpoints exist (`search.py`)
**Estimated Time**: 5-7 days

#### 9. **Document Version History** (P1)
**Current State**: Backend has `documents_backup.py`
**Missing**: UI to view/restore previous versions
**Backend**: Ready
**Estimated Time**: 3-5 days

### ✅ Nice-to-Have (P2 - Can Launch Without)

These features improve UX but aren't blockers:
- Writing streaks & goals
- Focus/zen mode
- Voice typing
- Dark mode toggle
- Advanced analytics
- Content integrity checks
- Plagiarism detection

---

## Detailed Feature Status

### 1. Core Writing Platform ✅ COMPLETE

**Status**: Production-ready
- ✅ Document editor with Tiptap 3.10.5
- ✅ Auto-save every 30 seconds
- ✅ Project management
- ✅ Document templates (21 templates)
- ✅ Folder organization
- ✅ Keyboard shortcuts (⌘S, ⌘K, ⌘/, ⌘⇧P)
- ✅ Word count tracking
- ✅ Reading time estimates

**No Action Required**

---

### 2. Bookshelf ✅ MOSTLY COMPLETE (P2 enhancements remain)

**Frontend Status**: Production-ready for launch
**Frontend Status**: Production-ready for launch

**Implemented Features:**
- ✅ Add/remove books (DELETE button added November 2025)
- ✅ Search books (client-side filtering)
- ✅ Reading stats dashboard
- ✅ Public bookshelves
- ✅ AI recommendations
- ✅ Enhanced book metadata
- ✅ Book detail pages
- ✅ Lazy-loaded images

**Minor Enhancements (P2 - not blockers):**
- ❌ Reading progress UI (bar/percentage on book cards)
- ❌ Backend search endpoint (currently client-side only)
- ❌ Dedicated "Currently Reading" page
- ❌ "Want to Read" wishlist
- ❌ Custom reading lists

**Recommendation**: Ship as-is, add enhancements post-launch

---

### 3. Groups & Community ✅ COMPLETE

**Status**: Production-ready
- ✅ Browse groups (`Groups.tsx` - 328 lines)
- ✅ Group detail pages with posts (`GroupDetail.tsx` - 623 lines)
- ✅ Create/join/leave groups
- ✅ Group admin dashboard
- ✅ Role management system
- ✅ Member moderation (approve/reject/remove)
- ✅ Post moderation actions
- ✅ Navigation integration

**No Action Required** - Fully functional

---

### 4. Beta Reading System ✅ MOSTLY COMPLETE (P1 gaps)
### 4. Beta Reading System ✅ MOSTLY COMPLETE (P1 gaps)

**Implemented Features:**
- ✅ Beta marketplace (`BetaMarketplace.tsx` - 406 lines)
- ✅ Browse beta readers with filters (genres, availability, ratings)
- ✅ Beta reader profiles (`MyBetaProfile.tsx`)
- ✅ Beta feed (`BetaFeed.tsx` - 309 lines)
- ✅ View assigned documents
- ✅ Track reading status

**Missing Features (P1):**
- ❌ Create beta appointments (backend ready)
- ❌ Send beta releases with deadlines (backend ready)
- ❌ Submit feedback on beta reads (backend ready)
- ❌ Accept/decline beta requests (backend ready)

**Action**: Implement appointment/request management within first month

---

### 5. Store & EPUB Uploads ✅ COMPLETE

**Status**: Production-ready
- ✅ Browse store (`Store.tsx`)
- ✅ Book detail pages
- ✅ Purchase flow (Stripe checkout)
- ✅ EPUB upload (`UploadBook.tsx`)
- ✅ Author profiles
- ✅ Free books integration

**No Action Required**

---

### 6. Authors & Profiles ✅ COMPLETE

**Status**: Production-ready
- ✅ Browse authors (`Authors.tsx`)
- ✅ Author profiles with books (`Author.tsx`)
- ✅ Follow/unfollow authors
- ✅ Public user profiles (`PublicProfile.tsx`)
- ✅ User bookshelf display
- ✅ Following/followers lists

**No Action Required**

---

### 7. Feed & Discovery ✅ PARTIAL (P1 enhancement)

**Current Implementation:**
- ✅ `Feed.tsx` exists (346 lines)
- ✅ Shows group posts
- ✅ Multiple tabs (personal, updates, beta-feed, groups, global, discover)

**Missing:**
- ❌ Full activity timeline (following users' actions)
- ❌ Document update notifications
- ❌ Personalized recommendations

**Backend**: `activity.py` and `feed.py` endpoints exist

**Action**: Connect to activity API for richer feed

---

### 8. Notifications 🟡 PARTIAL (P1)

**Current Implementation:**
- ✅ `NotificationBell` component exists
- ✅ Shows unread count
- ✅ Integrated in Navigation

**Missing:**
- ❌ Full notifications page/center
- ❌ Mark as read functionality
- ❌ Notification history
- ❌ Notification filtering

**Backend**: All endpoints ready (`notifications.py`)

**Action**: Build notifications page (3-5 days work)

---

### 9. Messaging 🟢 IN PROGRESS (P0 - Matrix Integration)

**Status**: **Matrix Protocol Integration** (3-5 days to complete)
**Architecture**: Facebook-style popup chats + Element app compatibility
**Frontend**: All components implemented ✅
**Backend**: Matrix API endpoints implemented ✅

**Why Matrix?**
- Eliminates need for custom messaging backend
- Users can access messages via Element desktop/mobile apps
- End-to-end encryption built-in
- Federated, open-source protocol
- Multi-device sync automatically handled

**Implemented Components:**
1. **`useMatrixClient.ts` hook** (175 lines) ✅
   - Global Matrix client state management
   - Auto-connect on mount with crypto support
   - `openChat()` function for triggering popups
   - Unread count tracking

2. **`ChatPopup.tsx`** (245 lines) ✅
   - Facebook-style floating chat window
   - Minimize/maximize functionality
   - Real-time message sync
   - Send messages with Enter key
   - Auto-scroll to new messages

3. **`ChatManager.tsx`** (105 lines) ✅
   - Manage multiple simultaneous popups
   - Limit to 3 concurrent chats
   - Smart positioning (right side, stacked)
   - Custom event handling

4. **`Messages.tsx` page** (258 lines) ✅
   - Full inbox/email-style view
   - Conversation list sidebar
   - Search functionality
   - Unread count badges
   - Opens chats in popups on click

**Backend API (`matrix.py`):** ✅
- `POST /matrix/register` - Auto-register Matrix accounts
- `GET /matrix/credentials` - Get user's Matrix login
- `POST /matrix/lookup-user` - Find Work Shelf user's Matrix ID
- `POST /matrix/create-room` - Create DM rooms

**Integration Tasks Remaining (3-5 days):**
1. Install `matrix-js-sdk` via npm
2. Add Matrix columns to database schema:
   - `matrix_user_id` (TEXT)
   - `matrix_access_token` (TEXT)
   - `matrix_homeserver` (TEXT)
3. Register Matrix API router in backend
4. Wrap App.tsx with `<MatrixProvider>`
5. Add `<ChatManager />` to App.tsx layout
6. Add Messages route to router
7. Update Navigation with message icon
8. Test Matrix homeserver connection
9. Configure Matrix homeserver (matrix.org for MVP, self-host Synapse for production)

**User Experience:**
- Click user avatar anywhere → "Send Message" → popup chat opens
- Full inbox view at `/messages`
- Access same conversations in Element desktop/mobile
- Real-time sync across all devices
- End-to-end encrypted by default

**Timeline**: 3-5 days (vs 1-2 weeks for custom build)

---

### 10. Comments ❌ MISSING (P0 - CRITICAL)

**Status**: **LAUNCH BLOCKER** for collaborative features
**Backend**: 6 endpoints implemented (`comments.py`)
**Frontend**: Nothing implemented

**Why Critical**: Beta readers need to leave feedback on documents

**Required Components:**
1. Comments section in `Document.tsx`
2. Add comment form
3. Comment list with author info
4. Edit/delete own comments
5. Comment reactions (optional for v1)

**API Endpoints:**
```typescript
GET  /api/v1/comments/document/{id}  // Get comments
POST /api/v1/comments                // Create comment
PUT  /api/v1/comments/{id}           // Update comment
DELETE /api/v1/comments/{id}         // Delete comment
POST /api/v1/comments/{id}/react     // React to comment
```

**Estimated Time**: 1 week  
**Priority**: **P0** - Essential for beta reading workflow

---

### 11. Subscriptions ❌ MISSING (P0 - BUSINESS CRITICAL)

**Status**: **LAUNCH BLOCKER** for monetization
**Backend**: 10+ endpoints ready (`subscriptions.py`, Stripe integrated)
**Frontend**: Nothing implemented

**Required Pages:**
1. **Pricing Page** (`Pricing.tsx`)
   - Display tiers (Free, Pro, Premium)
   - Feature comparison table
   - Subscribe buttons → Stripe checkout
   
2. **Subscription Management** (`MySubscription.tsx`)
   - Current plan display
   - Upgrade/downgrade options
   - Cancel subscription
   - Payment history
   - Billing details

3. **Feature Gating**
   - `useSubscription()` hook
   - Check tier before premium features
   - Upgrade prompts for locked features
   - Example: "Export requires Pro" modal

**API Endpoints:**
```typescript
GET  /api/v1/subscriptions/tiers          // List plans
POST /api/v1/subscriptions/subscribe      // Subscribe
POST /api/v1/subscriptions/cancel         // Cancel
GET  /api/v1/subscriptions/my-subscription // Current plan
POST /api/v1/subscriptions/upgrade        // Change tier
```

**Estimated Time**: 1-2 weeks  
**Priority**: **P0** - Required for business model

---

### 12. Export ❌ MISSING (P0 - CRITICAL)

**Status**: **LAUNCH BLOCKER** - writers need manuscript export
**Backend**: Endpoints ready (`export.py`)
**Frontend**: Nothing implemented

**Required UI:**
1. Export button in `Document.tsx` toolbar
2. Format selection dropdown (PDF, DOCX, EPUB)
3. Export progress indicator
4. Download file handling

**Implementation:**
```typescript
// Add to Document.tsx toolbar:
<button onClick={handleExport}>
  <Download className="w-5 h-5" />
  Export
</button>

const handleExport = async (format: 'pdf' | 'docx' | 'epub') => {
  const response = await fetch(
    `${API_URL}/api/v1/export/document/${documentId}?format=${format}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `document.${format}`
  a.click()
}
```

**Estimated Time**: 3-5 days  
**Priority**: **P0** - Essential writer tool

---

### 13. Search ❌ MISSING (P1)

**Current State**: Only client-side bookshelf search
**Backend**: Full search API ready (`search.py`)
**Frontend**: No global search implementation

**Required:**
- Search bar in Navigation
- Search results page
- Filter by type (users, documents, groups, books)
- Autocomplete suggestions

**Estimated Time**: 5-7 days  
**Priority**: **P1** - Important for discoverability

---

### 14. AI Features ❌ REMOVED (P3)

**Status**: Intentionally disabled (November 2025)
- AI template generation removed from frontend
- Backend routes commented out
- `/api/v1/ai/templates` endpoints disabled
- Project creation from templates disabled

**Note**: Can re-enable later if needed, not a priority for launch

---

### 15. Admin Features ✅ PARTIAL

**Implemented:**
- ✅ Admin dashboard (`AdminDashboard.tsx`)
- ✅ User management (`ManageUsers.tsx`)
- ✅ Group management (`ViewAllGroups.tsx`)
- ✅ Content moderation (`GlobalModeration.tsx`)
- ✅ System settings (`SystemSettings.tsx`)
- ✅ Store analytics (`StoreAnalytics.tsx`)

**Missing (P2 - not blockers):**
- ❌ EPUB submission moderation
- ❌ User ban/unban UI
- ❌ Bulk operations

**Recommendation**: Current admin tools sufficient for launch

---

## Launch Readiness Timeline

### **Phase 1: Critical P0 Features** (3-4 weeks)

**Week 1-2: Messaging System**
- [ ] Build Messages.tsx inbox page
- [ ] Build MessageThread.tsx conversation view
- [ ] Build ComposeMessage.tsx modal
- [ ] Add message icon to Navigation with unread count
- [ ] Test sending/receiving messages
- [ ] Handle threading and participants

**Week 2: Comments System**
- [ ] Add comments section to Document.tsx
- [ ] Build comment form
- [ ] Display comment list
- [ ] Implement edit/delete functionality
- [ ] Add author info to comments

**Week 3: Subscriptions**
- [ ] Create Pricing.tsx page
- [ ] Build MySubscription.tsx management page
- [ ] Implement useSubscription() hook
- [ ] Add feature gating throughout app
- [ ] Create upgrade prompts/modals
- [ ] Test Stripe integration

**Week 4: Export & Polish**
- [ ] Add export button to Document.tsx
- [ ] Implement format selection (PDF, DOCX, EPUB)
- [ ] Test download functionality
- [ ] Fix any critical bugs
- [ ] User acceptance testing

### **Phase 2: Important P1 Features** (2-3 weeks post-launch)

**Week 5: Notifications**
- [ ] Build Notifications.tsx center page
- [ ] Implement mark as read
- [ ] Add notification history
- [ ] Polish NotificationBell component

**Week 6: Beta Features**
- [ ] Add appointment creation UI
- [ ] Build feedback submission form
- [ ] Implement request accept/decline
- [ ] Test full beta workflow

**Week 7: Search & Discovery**
- [ ] Add global search bar to Navigation
- [ ] Build SearchResults.tsx page
- [ ] Implement filtering by type
- [ ] Add autocomplete

### **Phase 3: Enhancements** (Ongoing)

**Post-Launch Improvements:**
- Writing streaks & goals
- Focus/zen mode
- Version history UI
- Advanced analytics
- Dark mode
- PWA support
- Content integrity tools

---

## Code Quality Improvements Completed ✅

**Recent Achievements (November 2025):**
- ✅ Projects page loads real data (was mock data)
- ✅ Keyboard shortcuts added (⌘S, ⌘K, ⌘/, ⌘⇧P)
- ✅ Better error messages throughout
- ✅ Delete book from bookshelf implemented
- ✅ Image lazy loading (10+ pages)
- ✅ Reading time calculations
- ✅ Skeleton loading on Projects page
- ✅ Form validation (Profile save)
- ✅ Empty states with personality

**Remaining UX Enhancements (P2):**
- Focus/zen writing mode
- Writing streaks & goals
- Document version history UI
- Optimistic UI updates
- Dark mode toggle
- PWA support

---

## Production Deployment Checklist

### Pre-Launch Requirements

**Infrastructure:**
- [ ] Production database configured
- [ ] CDN for static assets
- [ ] SSL certificates
- [ ] Environment variables set
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (Google Analytics or similar)

**Testing:**
- [ ] All P0 features tested end-to-end
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified
- [ ] Load testing (concurrent users)
- [ ] Security audit
- [ ] Accessibility audit (WCAG 2.1 AA)

- [ ] Accessibility audit (WCAG 2.1 AA)

**Content:**
- [ ] Terms of Service finalized
- [ ] Privacy Policy complete
- [ ] House Rules documented
- [ ] Help documentation
- [ ] Onboarding tutorial

**Legal & Business:**
- [ ] Payment processor configured (Stripe)
- [ ] Subscription plans defined
- [ ] Pricing finalized
- [ ] Refund policy
- [ ] DMCA agent registered

---

## Success Metrics

**Track These Post-Launch:**
- Daily active users (DAU)
