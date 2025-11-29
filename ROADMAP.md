# Workshelf Roadmap

This document tracks active initiatives, status, and next actions. Remove items as they're completed.

## Active Initiatives

- Marketplace Specialties/Sort Verification
  - Goal: Confirm backend accepts `specialties` and `sort` query params used by `BetaMarketplace`.
  - Status: Deferred (backend down during test attempt)
  - Completed:
    - Added toasts in `BetaMarketplace.tsx` to signal filters applied and capture load errors.
  - Next:
    - When backend is running: Hit `/api/v1/beta-profiles/marketplace` with sample `specialties` and `sort` params; log response shape.
    - Adjust frontend param names if needed; document findings here.

- Sitewide Toasts ✅
  - Goal: Ensure all user-facing flows surface success/error notifications consistently.
  - Status: Complete
  - Done: 
    - Folders CRUD
    - Beta Requests (create/accept/decline/cancel/complete)
    - Beta Reviews
    - AI Assistance
    - UploadBook
    - Accessibility
    - Export Center
    - Marketplace filters
    - Documents (load/save/delete)
    - Comments (post/reactions)
    - Auth (login/logout/invitation accept)

## Backend-Ready Features (Need Frontend UI)

These features have complete backend APIs but need frontend implementation:

1. **AI Assistance Features** ✅ (has full UI with 7 tools)
   - Writing Prompts ✅ (has UI)
   - Character Questions ✅ (has UI)
   - Plot Structure ✅ (has UI)
   - Pacing Analysis ✅ (has UI)
   - Synonyms ✅ (has UI)
   - Title Ideas ✅ (has UI)
   - Outline Structure ✅ (has UI)
   - AI Policy page ✅ (created at `/ai-policy`)

2. **Creator Earnings/Monetization**
   - Creator Dashboard (earnings overview, stats)
   - Earnings tracking by work/time period
   - Stripe Connect setup flow
   - Payout management UI
   - Payment history table

3. **Content Integrity** (has basic page, needs full integration)
   - AI detection for documents ✅ (has UI)
   - Content integrity checks ✅ (has UI)
   - Plagiarism detection (UI exists, verify integration)
   - Check history viewer

4. **Export Features** ✅ (Export Center exists with full UI)
   - Document export ✅
   - Studio/project export ✅
   - GDPR data export ✅
   - Export job tracking ✅

5. **Accessibility** ✅ (AccessibilitySettings page exists with full UI)
   - Accessibility settings ✅
   - Document accessibility checker ✅
   - Accessibility reports ✅

6. **Relationships/Social**
   - Follow/Unfollow buttons on profiles
   - Followers list modal/page
   - Following list modal/page
   - User relationship management dashboard

7. **Reading Lists** (has basic component, needs full page)
   - Create custom reading lists ✅ (basic UI exists)
   - Manage reading lists ✅ (basic UI exists)
   - Share reading lists (add share UI)
   - Public reading lists browse page

8. **Activity Feed** (has basic Feed page)
   - Personal activity feed ✅ (exists)
   - User-specific activity feeds (add to public profiles)
   - Filter/sort options for activity

9. **Folders Management** ✅ (FolderTree component integrated)
   - Create/organize document folders ✅
   - Nested folder structures ✅
   - Folder permissions UI (if backend supports)

10. **Beta Reader Profiles** ✅ (has marketplace and profile pages)
    - Full beta reader profile management ✅ (MyBetaProfile exists)
    - Beta reader search/filtering ✅ (BetaMarketplace exists)
    - Portfolio/specialties ✅
    - Beta requests ✅ (create, manage, accept/decline)
    - Reviews system ✅
    - Contact integration ✅

11. **Commenting System** ✅ (CommentsThread component exists)
    - Inline document comments ✅
    - Comment reactions ✅
    - Comment threads ✅

12. **Search** (has basic AdvancedSearch page)
    - Advanced search with filters ✅ (page exists)
    - Search results page ✅
    - Faceted search (verify full integration)

13. **Invitations System** ✅ (Invite page exists)
    - Send email invitations ✅
    - Track invitation status ✅
    - Invitation management dashboard (add if missing)

14. **Book Suggestions** ✅ (BookSuggestions page exists)
    - User-submitted book recommendations ✅
    - Book suggestion feeds ✅
    - Voting/interaction UI (verify exists)

15. **Group Features** (has basic Groups page, missing advanced features)
    - Group theme customization UI
    - Group audit logs viewer
    - Group invitations management UI
    - Group roles/permissions configuration UI
    - Group analytics dashboard

## Placeholders / Technical Debt

These are items implemented with placeholders or assumptions that need production-ready replacements:

- ChatManager DM Room Resolution
  - Current: `openChatByUserId` constructs placeholder room ID (`dm-${userId}`)
  - Needed: Query Matrix client to find existing DM room with target user, or create one if none exists
  - Impact: Contact button will open a placeholder chat until this is resolved
  - Priority: Medium (functional but not production-ready)

## Upcoming / Backlog

- Request Detail Page
  - Timeline, messages, and status changes in a single view for beta requests.

- Creator Earnings Dashboard
  - Complete frontend for Stripe Connect integration
  - Earnings charts and payout management

- Social Features Enhancement
  - Follow/unfollow buttons on all profile types
  - Followers/following lists
  - Activity feed on public profiles

- Group Advanced Features
  - Theme customization UI
  - Audit logs viewer
  - Invitations management
  - Roles/permissions editor

- Reading Lists Enhancement
  - Public reading lists browse page
  - Share reading lists functionality

- QA Pass
  - Click-through verification across all features
  - Test marketplace filters/sort, beta requests, folders, toasts
  - Verify backend integration for all "backend-ready" features

## Execution Notes

- Keep changes scoped and incremental; verify endpoints before wiring UI.
- Prefer `services/toast.ts` import for consistency.
- When backend gaps appear, document assumptions here and open tasks.
- Mark features ✅ when frontend UI is complete and integrated.
