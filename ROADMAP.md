# Workshelf Roadmap

This document tracks active initiatives, status, and next actions. Remove items as they’re completed.

## Active Initiatives

- Contact → Chat/Messaging
  - Goal: Wire the “Contact” action to a real chat or messaging route.
  - Status: Planning
  - Next:
    - Decide route: `/messages` page or inline chat modal.
    - Backend check: available endpoints for threads/messages.
    - Minimal UI: conversation list + thread view.

- Marketplace Specialties/Sort Verification
  - Goal: Confirm backend accepts `specialties` and `sort` query params used by `BetaMarketplace`.
  - Status: Pending verification
  - Next:
    - Hit endpoint with sample params; verify response shape and filtering.
    - Adjust frontend param names if needed.

- Sitewide Toasts
  - Goal: Ensure all user-facing flows surface success/error notifications consistently.
  - Status: In progress
  - Done: Folders CRUD, Beta Requests (create/accept/decline/cancel/complete), Beta Reviews, AI Assistance, UploadBook, Accessibility, Export Center.
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
