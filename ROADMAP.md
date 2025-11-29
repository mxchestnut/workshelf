# Workshelf Roadmap

This document tracks active initiatives, status, and next actions. Remove items as they’re completed.

## Active Initiatives

- Contact → Chat/Messaging
  - Goal: Wire the “Contact” action to a real chat or messaging route.
  - Status: In progress
  - Completed:
    - Added `'/messages'` route in `frontend/src/App.tsx` and lazy load `Messages` page.
    - Updated `BetaProfileView` “Contact” button to navigate to `/messages` and dispatch chat-open event with target userId.
  - Next:
    - Ensure `ChatManager` listens for `openChatByUserId` and opens the appropriate DM.
    - Add “Contact” buttons in other relevant views (cards, marketplace).

- Marketplace Specialties/Sort Verification
  - Goal: Confirm backend accepts `specialties` and `sort` query params used by `BetaMarketplace`.
  - Status: In progress
  - Completed:
    - Added toasts in `BetaMarketplace.tsx` to signal filters applied and capture load errors.
  - Next:
    - Hit `/api/v1/beta-profiles/marketplace` with sample `specialties` and `sort` params; log response shape during dev.
    - Adjust frontend param names if needed; document findings here.

- Sitewide Toasts
  - Goal: Ensure all user-facing flows surface success/error notifications consistently.
  - Status: In progress
  - Done: Folders CRUD, Beta Requests (create/accept/decline/cancel/complete), Beta Reviews, AI Assistance, UploadBook, Accessibility, Export Center, Marketplace filters.
  - Next:
    - Documents: create/save/delete, sharing actions.
    - Comments: post/reaction errors and successes.
    - Auth: login/logout/invitation accept.

## Upcoming / Backlog (Add as needed)

- Request Detail Page
  - Timeline, messages, and status changes in a single view.

- Chat Integration
  - If Matrix or internal messaging is preferred, define adapters and UI patterns.

- QA Pass
  - Click-through verification across marketplace filters/sort, beta requests, folders, and toasts.

## Execution Notes

- Keep changes scoped and incremental; verify endpoints before wiring UI.
- Prefer `services/toast.ts` import for consistency.
- When backend gaps appear, document assumptions here and open tasks.
