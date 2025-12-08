# Workshelf Roadmap

**Last Updated:** December 8, 2025  
**Current Status:** ✅ Production fully operational - All features deployed, voting, collections & AO3-style tagging live  
**Overall Grade:** A+ (Security: A+, Performance: A, Accessibility: WCAG 2.1 AA ✅, GDPR: 100% ✅)

---

## 🎯 Next Priorities

### 1. Content Tagging System 🏷️ **HIGH PRIORITY**
**Status:** ✅ 98% Complete - Full tagging system deployed, ready for production  
**Goal:** AO3-style folksonomy tagging for posts, ebooks, and articles

**Completed:**
- ✅ Redesigned tag architecture (removed polymorphic anti-pattern)
- ✅ Dedicated `post_tags` join table with real foreign keys
- ✅ PostgreSQL full-text search ready (TSVECTOR + GIN index)
- ✅ Simple tag model (no categories, no canonicalization - MVP)
- ✅ Backend API deployed at `/api/v1/content-tags/`
  - ✅ Tag search with autocomplete
  - ✅ Tag CRUD operations
  - ✅ Apply/remove tags from posts
  - ✅ AO3-style include/exclude filtering
- ✅ 10 common tags seeded (Romance, Fantasy, Horror, etc.)
- ✅ Model conflict resolved (ContentTag vs document.Tag)
- ✅ **Frontend Tag Input Component** (`TagInput.tsx`)
  - ✅ Autocomplete search with 300ms debounce
  - ✅ Visual tag chips with remove button
  - ✅ Create new tags inline (folksonomy)
  - ✅ Keyboard navigation (Enter to select, Backspace to remove)
  - ✅ Max tags limit (default 20)
- ✅ **Feed Tag Filtering UI** (`Feed.tsx`)
  - ✅ Include/exclude tag selectors (green/red chips)
  - ✅ Integration with `/api/v1/content-tags/filter/posts`
  - ✅ Visual tag display on posts (clickable chips)
  - ✅ Active filter display with clear button
  - ✅ Tag usage counts in dropdowns
- ✅ **Post Creation & Editing Integration**
  - ✅ TagInput in post creation form (`GroupDetail.tsx`)
  - ✅ Up to 10 tags per post
  - ✅ Automatic tag application via API
  - ✅ Edit mode in `PostDetail.tsx`
  - ✅ Add/remove tags from existing posts
  - ✅ Tag display on post detail page

**Remaining:**
- [ ] **Extend to Ebooks & Articles** (migration 008)
  - Create `ebook_tags` and `article_tags` tables
  - Same pattern as `post_tags` (dedicated join tables)
  - Add TagInput to ebook/article upload forms

**Technical Notes:**
- Uses `content_tags` table (distinct from `tags` for documents)
- ~10x faster than old polymorphic design
- Extensible: easy to add new content types
- Full-text search column exists, trigger can be added later

---

### 1.5 Document Editing Flow & Version Control 📝 **HIGH PRIORITY**
**Status:** ⚠️ 60% Complete - Backend implemented, frontend needed  
**Goal:** Git-style version control and four-stage workflow for articles/novels

**Architecture Overview:**
```
Writer creates draft (ALPHA) → Collaborative editing → Beta readers (BETA) 
→ Final polish (PUBLISH) → Published view (READ)
                ↓
        Version history (like Git commits)
        Restore any version, compare diffs
```

**Backend Status:** ✅ Fully implemented
- Database models: `documents`, `document_versions`, `document_collaborators`
- Git-style versioning API (list, view, restore, create versions)
- Four-mode system (ALPHA → BETA → PUBLISH → READ)
- Collaboration roles (Owner, Editor, Commenter, Beta Reader, Viewer)
- Mode transitions with automatic version snapshots

**Frontend Status:** ❌ Not implemented

#### Phase 1: Rich Text Editor Integration (Week 1-2)

**Choose Editor Library:**
- [ ] **Evaluate options:**
  - **Tiptap** (Recommended) - Vue/React, ProseMirror-based, extensible
  - **Lexical** (Facebook) - React, modern, good TypeScript support
  - **ProseMirror** (Direct) - Lower level, maximum control
  - **Recommendation:** Tiptap (best balance of power and ease)

**Core Editor Setup:**
- [ ] Install Tiptap and extensions
  ```bash
  npm install @tiptap/react @tiptap/starter-kit
  npm install @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
  npm install @tiptap/extension-placeholder @tiptap/extension-character-count
  ```
- [ ] Create `DocumentEditor.tsx` component
  - Initialize Tiptap editor
  - Configure extensions (bold, italic, heading, lists, links)
  - Set up placeholder text
  - Character/word count display
- [ ] Create `/write/{document_id}` route
  - Full-screen editor layout
  - Minimal distractions (focus mode)
  - Top toolbar with formatting controls
  - Sidebar for document info/settings
- [ ] Markdown support
  - Parse Markdown to Tiptap JSON
  - Convert Tiptap JSON to Markdown for storage
  - Keyboard shortcuts for Markdown syntax (e.g., `##` → Heading 2)

**Auto-save System:**
- [ ] Implement debounced auto-save
  - Save to backend every 30 seconds of inactivity
  - Visual indicator ("Saving..." / "Saved" / "Error")
  - Store in LocalStorage as backup
- [ ] Draft recovery
  - Detect unsaved changes on page load
  - Offer to restore from LocalStorage
  - Show last saved timestamp
- [ ] Conflict detection
  - Check if document was modified by others
  - Warn before overwriting changes
  - Offer to view differences

#### Phase 2: Version History UI (Week 2-3)

**Version List View:**
- [ ] Create `VersionHistory.tsx` component
  - Timeline view of all versions
  - Display for each version:
    - Version number
    - Created timestamp (relative: "2 hours ago")
    - Author name and avatar
    - Change summary (commit message)
    - Mode at time of version (badge)
    - Major version indicator
  - Sort by newest first
  - Pagination or infinite scroll
- [ ] Integrate into document editor
  - "History" button in toolbar
  - Opens sidebar or modal with version list
  - Click version to preview

**Version Details:**
- [ ] Create `VersionDetail.tsx` component
  - Show full content of selected version
  - Display metadata (author, timestamp, message)
  - Read-only view of content
  - "Restore this version" button
  - "Compare with current" button
- [ ] Restore version flow
  - Confirmation modal ("This will create a new version")
  - Restore creates new version (doesn't delete history)
  - Show success message with new version number

**Create Manual Version:**
- [ ] "Save Version" button in editor toolbar
  - Opens modal for commit message
  - Optional: Mark as major version checkbox
  - Creates version snapshot via API
  - Shows in version history immediately

#### Phase 3: Diff/Compare Viewer (Week 3-4)

**Diff Algorithm:**
- [ ] Install diff library
  ```bash
  npm install diff react-diff-viewer-continued
  ```
- [ ] Create `DiffViewer.tsx` component
  - Side-by-side comparison mode
  - Unified diff mode (single column)
  - Highlight additions (green)
  - Highlight deletions (red)
  - Highlight modifications (yellow)
  - Line numbers
  - Collapse unchanged sections

**Compare Interface:**
- [ ] "Compare versions" modal
  - Dropdown to select two versions
  - "Compare" button
  - Opens DiffViewer
  - Navigation: "Previous change" / "Next change" buttons
- [ ] Compare with specific version
  - From version history, click "Compare with current"
  - Or select two versions to compare
  - Show version metadata side-by-side

**Inline Change Tracking:**
- [ ] Word-level diff (not just line-level)
  - Highlight individual words/characters changed
  - Better for prose than code diffs
  - Use `diff-match-patch` algorithm

#### Phase 4: Mode System UI (Week 4)

**Mode Selector:**
- [ ] Create `ModeSelector.tsx` component
  - Dropdown or radio buttons for four modes
  - Display current mode prominently
  - Mode descriptions on hover
  - Confirmation modal for mode changes
  - Automatically creates version on mode change
  - Optional: Add change message for transition

**Mode-Specific Features:**
- [ ] **ALPHA Mode (Draft Room)**
  - Full editing access for owner + editors
  - Minimal UI constraints
  - "Brainstorming" atmosphere
  - Placeholder: "Write freely, experiment, explore..."
  - Hide polish features (spell check less aggressive)

- [ ] **BETA Mode (Workshop)**
  - Enable commenting system
  - Invite beta readers (COMMENTER role)
  - Show "Feedback requested" banner
  - Collect structured feedback
  - Track comment resolution

- [ ] **PUBLISH Mode (Print Queue)**
  - Restrict access (owner + editors only, remove beta readers)
  - Enable advanced formatting tools
  - Spell check and grammar check prominent
  - Export options available
  - "Ready to publish?" checklist

- [ ] **READ Mode (Bookshelf)**
  - Beautiful reading interface (use Readium-style layout)
  - Content is read-only for viewers
  - Owner can still edit (but requires mode change confirmation)
  - Public sharing enabled
  - Reader analytics (views, reading time)

#### Phase 5: Collaboration Features (Week 5-6)

**Collaborator Management:**
- [ ] Create `CollaboratorPanel.tsx` component
  - List current collaborators
  - Show roles (Owner, Editor, Commenter, etc.)
  - Avatar + name + role badge
  - Remove collaborator button (owner only)
  - Change role dropdown (owner only)
- [ ] Invite collaborators modal
  - Email input or username search
  - Role selector dropdown
  - Permission checkboxes (can edit, can comment, can share)
  - Send invitation
  - Show pending invitations
  - Resend or cancel invitation

**Real-time Collaboration (Optional, Future):**
- [ ] Multi-user editing (like Google Docs)
  - WebSocket connection for real-time sync
  - Show other users' cursors
  - Conflict-free replicated data type (CRDT)
  - Operational Transform algorithm
  - "User X is editing" indicator
  - Auto-merge changes

**Presence Indicators:**
- [ ] Show who's currently viewing/editing
  - Avatar stack at top of editor
  - "Alice and 2 others are viewing"
  - Last active timestamp
  - Online/offline status

#### Phase 6: Commenting System (Week 6-7)

**Inline Comments:**
- [ ] Tiptap comment extension
  - Select text → "Add comment" button
  - Highlight commented text (yellow background)
  - Click highlighted text → Show comment thread
  - Create comment with rich text
  - Reply to comments (nested threads)
  - Resolve comments checkbox
  - Show resolved comments (grayed out)
  - Filter: All / Unresolved / Resolved

**Comment Sidebar:**
- [ ] Create `CommentSidebar.tsx` component
  - List all comments on document
  - Sort by: Position in doc / Newest / Oldest
  - Jump to comment in editor (scroll + highlight)
  - Reply inline in sidebar
  - Resolve from sidebar
  - Assign comments to collaborators (future)

**Comment Notifications:**
- [ ] Email notification when:
  - Someone comments on your document
  - Someone replies to your comment
  - Someone mentions you (@username)
  - Comment is resolved
- [ ] In-app notifications
  - Unread comment count badge
  - Notification dropdown

#### Phase 7: Advanced Version Features (Week 7-8)

**Branching (Future):**
- [ ] Create alternate storylines
  - "Create branch" from version
  - Branch name (e.g., "alternate-ending")
  - Independent editing on branch
  - Switch between branches
  - Merge branches (advanced)

**Merge Conflicts:**
- [ ] When merging branches or resolving simultaneous edits
  - Detect conflicting changes
  - Show conflict markers (like Git)
  - Manual resolution UI
  - Accept theirs / Accept yours / Manual edit
  - Create merge commit

**Version Tagging:**
- [ ] Tag important versions
  - "First Draft", "Beta 1", "Final", "Published"
  - Custom tags with colors
  - Filter versions by tag
  - Quick jump to tagged versions

**Version Comparison Stats:**
- [ ] Show statistics when comparing versions
  - Words added / removed
  - Characters changed
  - Reading time difference
  - Readability score change (Flesch-Kincaid)

#### Phase 8: Export & Publishing (Week 8)

**Export with Version History:**
- [ ] Export options
  - Single version as DOCX/PDF
  - All versions as ZIP archive
  - Change log document (list of all versions with messages)
  - Annotations included (optional)

**Publish Flow:**
- [ ] "Publish" button in READ mode
  - Set publication date
  - Add publication metadata (ISBN, etc.)
  - Generate public URL
  - SEO settings (meta description, keywords)
  - Share on social media (future)

**Reading Analytics:**
- [ ] Track engagement in READ mode
  - View count
  - Unique readers
  - Average reading time
  - Drop-off points (where readers stop)
  - Most highlighted sections (future)

#### Phase 9: Performance & Optimization (Week 9)

**Editor Performance:**
- [ ] Lazy load large documents
  - Virtualized scrolling for 100k+ words
  - Load content in chunks
  - Progressive rendering
- [ ] Optimize auto-save
  - Only save if content changed
  - Compress content before sending
  - Use delta patches (send only changes)
- [ ] IndexedDB caching
  - Cache recent versions locally
  - Offline editing capability
  - Sync when back online

**Backend Optimization:**
- [ ] Version storage optimization
  - Store diffs instead of full snapshots (for minor versions)
  - Compress old versions
  - Archive ancient versions to cold storage
- [ ] Database indexes
  - Index on (document_id, version) for fast lookups
  - Index on created_by_id for user queries
  - Partial index on is_major_version

#### Phase 10: Testing & Polish (Week 10)

**Unit Tests:**
- [ ] Test editor operations (save, restore, diff)
- [ ] Test version creation and retrieval
- [ ] Test collaboration permissions
- [ ] Test comment creation and resolution

**Integration Tests:**
- [ ] E2E test with Playwright
  - Create document → Edit → Save version → Restore
  - Invite collaborator → Leave comment → Resolve
  - Change modes → Compare versions
  - Export document

**User Testing:**
- [ ] Beta test with 10 writers
- [ ] Collect feedback on:
  - Editor usability
  - Version history clarity
  - Mode transitions intuitiveness
  - Collaboration features
- [ ] Iterate on UX issues

**Documentation:**
- [ ] User guide: "How to use version control"
- [ ] User guide: "Collaborating with beta readers"
- [ ] Video tutorial: "From draft to publish"

---

**Success Metrics:**
- [ ] 90%+ of documents have multiple versions (users are saving versions)
- [ ] Average 5+ versions per completed document
- [ ] 70%+ of documents go through at least 2 modes
- [ ] 50%+ of BETA mode documents have collaborator comments
- [ ] < 1% data loss from auto-save failures
- [ ] Editor loads in < 1 second for 10k word documents

**Technical Requirements:**
- Frontend: Tiptap editor, React, TypeScript
- Backend: Existing API endpoints (✅ complete)
- Database: PostgreSQL (✅ models exist)
- Storage: S3/MinIO for version snapshots (optional for large docs)
- Real-time: WebSockets (Socket.io or Pusher) - Future feature

**Key Design Principles:**
1. **Never lose work** - Auto-save, LocalStorage backup, version history
2. **Clear history** - Easy to see what changed and when
3. **Non-destructive** - Restoring doesn't delete history
4. **Flexible workflow** - Can move between modes in any direction
5. **Collaboration-first** - Multiple people can work together seamlessly

---

### 2. E-Reader System (Readium Web + LCP DRM) 📚 **HIGH PRIORITY**
**Status:** 🚧 Not started  
**Goal:** Professional-grade, secure e-reader with open-standard DRM protection  
**Timeline:** 6-8 weeks for full implementation

**Architecture Overview:**
```
User → Frontend Reader → Backend API → LCP Server → Encrypted Storage
                ↓                          ↓
        Progress/Annotations          License Management
```

#### Phase 1: Infrastructure & Database (Week 1)

**Backend Database Models:**
- [ ] Create `ebooks` table
  - Basic metadata (title, author, description, ISBN)
  - File storage (S3 path, encryption key reference)
  - Pricing and publication info
  - Soft delete support
- [ ] Create `ebook_purchases` table
  - User purchases with Stripe payment tracking
  - LCP license references
  - Rental/purchase status and expiry
  - Device limits (default: 6)
- [ ] Create `ebook_reading_progress` table
  - CFI locators for precise position
  - Progress percentage and reading time
  - Last read timestamp and device info
- [ ] Create `ebook_annotations` table
  - Highlights, notes, bookmarks
  - CFI locators for exact position
  - Color, privacy settings
- [ ] Create `lcp_licenses` table
  - LCP license JSON documents
  - Encryption profiles and keys
  - Device registration tracking
  - License status (active, revoked, expired)
- [ ] Migration script `010_add_ebook_system.py`
  - Create all tables with indexes
  - GIN indexes for full-text search
  - Foreign key constraints

#### Phase 2: Storage & File Management (Week 1-2)

**Object Storage Setup:**
- [ ] Configure MinIO/S3 buckets
  - `ebooks-encrypted` (private)
  - `ebooks-covers` (public read)
  - Lifecycle policies and CORS
- [ ] Implement `EbookStorageService`
  - Upload and validate EPUB files
  - AES-256-GCM encryption
  - Metadata extraction from EPUB
  - Cover thumbnail generation
  - Pre-signed download URLs
- [ ] EPUB validation with epubcheck
- [ ] Secure key management (separate from content)

#### Phase 3: LCP License Server Setup (Week 2-3)

**Readium LCP Server:**
- [ ] Deploy LCP server (Docker)
  - Use official `readium/lcp-server` (Go)
  - Configure database and encryption
  - Set up license signing certificate
- [ ] Configure LCP server
  - RSA 2048-bit certificate
  - SHA-256 passphrase hashing
  - Default license terms
  - Status document endpoints
- [ ] Create `LCPService` (Python)
  - Generate licenses for purchases
  - Register/deregister devices
  - Revoke licenses
  - Check license status
  - Renew expired licenses
- [ ] Integrate with backend API

#### Phase 4: Backend API Endpoints (Week 3-4)

**Ebook Management:**
- [ ] `POST /api/v1/ebooks` - Upload ebook (authors/admins)
- [ ] `GET /api/v1/ebooks` - List ebooks (paginated, filtered)
- [ ] `GET /api/v1/ebooks/{id}` - Get ebook details
- [ ] `POST /api/v1/ebooks/{id}/purchase` - Purchase with Stripe
- [ ] `GET /api/v1/ebooks/{id}/manifest` - Readium manifest (auth required)
- [ ] `GET /api/v1/ebooks/{id}/license` - LCP license (auth required)
- [ ] `GET /api/v1/ebooks/{id}/content/*` - Stream encrypted content

**Reading Progress:**
- [ ] `GET /api/v1/ebooks/{id}/progress` - Get reading position
- [ ] `PUT /api/v1/ebooks/{id}/progress` - Update position

**Annotations:**
- [ ] `GET /api/v1/ebooks/{id}/annotations` - List annotations
- [ ] `POST /api/v1/ebooks/{id}/annotations` - Create annotation
- [ ] `PUT /api/v1/ebooks/{id}/annotations/{id}` - Update annotation
- [ ] `DELETE /api/v1/ebooks/{id}/annotations/{id}` - Delete annotation

**License Management:**
- [ ] `GET /api/v1/licenses/{id}/status` - License status
- [ ] `POST /api/v1/licenses/{id}/register-device` - Register device
- [ ] `DELETE /api/v1/licenses/{id}/devices/{id}` - Remove device

#### Phase 5: Frontend Reader Implementation (Week 4-5)

**Install Dependencies:**
- [ ] `npm install @readium/navigator-web @readium/shared-js @readium/lcp-client`

**Reader Component:**
- [ ] Create `/read/{ebook_id}` route (`EbookReader.tsx`)
- [ ] Initialize Readium Navigator
  - Fetch manifest and LCP license
  - Load last reading position
  - Handle DRM decryption
- [ ] Reading controls
  - Previous/Next page buttons
  - Table of Contents sidebar
  - Progress slider and page display
  - Bookmark button
  - Full-screen mode
- [ ] Settings panel
  - Font family, size, line height
  - Theme (light, sepia, dark, black)
  - Column layout, text alignment
  - Margin size
- [ ] Progress tracking
  - Auto-save reading position (debounced)
  - Display progress percentage
  - Estimated time remaining
  - Current chapter display
- [ ] Annotations UI
  - Text selection menu (highlight colors, notes, bookmarks)
  - Annotations sidebar
  - Click to navigate to annotation
  - Edit/delete annotations
  - Highlight rendering overlay
- [ ] Responsive design
  - Desktop: centered reading area, sidebars
  - Mobile: full-width, swipe gestures, bottom nav
  - Tablet: two-column mode (landscape)
  - Keyboard shortcuts

#### Phase 6: Security & DRM Implementation (Week 5)

**Content Protection:**
- [ ] LCP license verification
  - Verify signature, device registration, expiry
  - Handle license errors gracefully
- [ ] Prevent content extraction
  - Disable right-click and text copying
  - Developer tools detection
  - Disable/watermark printing
  - Obfuscate DOM structure
- [ ] Device fingerprinting
  - Generate unique device IDs
  - Register on first read
  - Enforce device limits
- [ ] License enforcement
  - Check device limit before opening
  - Device management UI
  - Allow deregistering old devices
- [ ] Dynamic watermarking
  - Inject user email into pages
  - Include purchase ID
  - Subtle, non-intrusive

#### Phase 7: User Experience Enhancements (Week 6)

**Discovery & Store:**
- [ ] Ebook store page (`/store`)
  - Featured carousel, categories grid
  - Search and filter sidebar
  - "Continue Reading" section
- [ ] Ebook detail page (`/store/ebooks/{id}`)
  - Cover, title, author, description
  - Price and "Buy Now" button
  - Sample chapter preview (first 10%)
  - Table of contents preview
- [ ] Purchase flow
  - Stripe checkout integration
  - Instant access after payment
  - Email confirmation
  - "Start Reading" button

**Library Management:**
- [ ] My Library page (`/bookshelf`)
  - Grid view of owned ebooks
  - Filter: All, Reading, Finished, Wishlist
  - Sort: Recent, Title, Author, Progress
  - Continue reading CTAs
- [ ] Collections for ebooks
  - Add ebooks to collections
  - Share collections publicly

**Social Features:**
- [ ] Reading goals (annual book count)
- [ ] Quote sharing (with attribution)
- [ ] "Currently Reading" status
- [ ] Book clubs (future: group discussions)

#### Phase 8: Performance & Optimization (Week 6-7)

**Frontend:**
- [ ] Lazy loading (components, chapters)
- [ ] Service Worker for offline reading
- [ ] Caching strategy (IndexedDB for manifests)
- [ ] Code-split reader components
- [ ] Bundle optimization

**Backend:**
- [ ] CDN for cover images (CloudFlare)
- [ ] Database indexing optimization
- [ ] Redis caching (manifests, license checks)
- [ ] Rate limiting (API, license generation)

#### Phase 9: Analytics & Monitoring (Week 7)

**Reading Analytics:**
- [ ] Track reading metrics (time, speed, highlights)
- [ ] Author dashboard (reads, engagement, revenue)
- [ ] User insights (streaks, genres, patterns)

**System Monitoring:**
- [ ] Grafana dashboards (load times, API performance)
- [ ] Error tracking (Sentry client-side, logs backend)
- [ ] Performance monitoring (Lighthouse CI, Web Vitals)

#### Phase 10: Testing & QA (Week 8)

**Unit Tests:**
- [ ] Backend: Upload, license generation, progress, annotations
- [ ] Frontend: Reader initialization, navigation, annotations

**Integration Tests:**
- [ ] E2E with Playwright: Purchase flow, reading, progress sync, device limits

**Security Testing:**
- [ ] Penetration testing (DRM bypass attempts)
- [ ] Load testing (1000 concurrent readers)

**Browser Compatibility:**
- [ ] Test: Chrome, Firefox, Safari (Desktop & Mobile)
- [ ] Test: Various screen sizes and devices

#### Phase 11: Documentation & Launch (Week 8)

- [ ] User documentation (how to purchase, read offline, troubleshoot)
- [ ] FAQ (formats, device limits, DRM, privacy)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture documentation (diagrams, security model)
- [ ] Publishing guide for authors
- [ ] Beta test with 10-20 users
- [ ] Security audit and legal review
- [ ] Launch and monitor

**Success Metrics:**
- 80%+ purchased ebooks opened within 7 days
- Average reading session > 15 minutes
- Reader loads in < 2 seconds, page turn < 100ms
- 99.9% uptime
- Zero successful DRM bypasses in first 3 months

**Technical Stack:**
- Frontend: Readium Navigator Web
- Backend: Readium LCP Server (Go), FastAPI
- Storage: S3/MinIO (encrypted EPUBs)
- DRM: Readium LCP (open standard)
- Payment: Stripe
- Analytics: Grafana, Sentry

---

### 3. Staff Admin Infrastructure 🛠️ **MEDIUM PRIORITY**
**Status:** 60% Complete  
**Goal:** Complete observability & monitoring stack

**Completed:**
- ✅ Sentry (error tracking)
- ✅ Redis (caching layer)
- ✅ Matomo (privacy-focused analytics)
- ✅ PostHog (product analytics with session replay)
- ✅ Prometheus (metrics collection, /metrics endpoint)
- ✅ Grafana (dashboards on :3000)

**Remaining:**

**A. Enhanced Observability (Optional)**
- [ ] OpenTelemetry Collector (distributed tracing)
- [ ] OpenSearch (centralized log aggregation)
- [ ] React-Admin dashboard (replace basic staff pages)

**B. Security Tooling (Optional)**
- [ ] HashiCorp Vault (secrets management)
- [ ] OWASP ZAP (automated security scanning)
- [ ] Trivy (container vulnerability scanning)
- [ ] Gitleaks (secrets scanning in git history)

**C. Grafana Dashboard Ideas**
- [ ] System metrics (CPU, memory, disk)
- [ ] API performance (request rate, latency, errors)
- [ ] Database slow queries & connection pool
- [ ] Redis cache hit/miss rate

---

### 4. Missing Frontend Features 🎨 **LOW PRIORITY**

**A. Group Scholarships** 🎓
- Backend: ✅ Complete (`/api/v1/groups/{id}/scholarships`)
- Frontend: ❌ Not implemented
- Tasks:
  - [ ] Add "Scholarships" tab to Group Settings
  - [ ] Create scholarship application form
  - [ ] Approval workflow for group owners
  - [ ] Display offers in group detail page

**B. Wiki Editing** ✏️
- Backend: ✅ Complete (admin moderation endpoints exist)
- Frontend: ⚠️ Admin moderation exists, wiki editing UI missing
- Tasks:
  - [ ] Create `/pages/Wiki.tsx` (view mode)
  - [ ] Create `/pages/WikiEdit.tsx` (edit mode with Markdown)
  - [ ] Version history
  - [ ] Moderation queue integration

---

### 5. Technical Improvements 🔧 **LOW PRIORITY**

**A. Performance Optimization** 🚀
- Current: Good (897 KB total, 441KB main + 509KB editor)
- Goal: <800 KB
- Tasks:
  - [ ] Image optimization (WebP format)
  - [ ] Lazy loading for images
  - [ ] CDN for static assets
  - [ ] Database query profiling with `joinedload()`
  - [ ] Redis caching for public endpoints
  - [ ] ETags for conditional requests

**B. Code Cleanup** 🧹
- [ ] Delete `.backup` files (4 files in frontend/src/pages/)
- [ ] Fix deprecation warnings (`datetime.utcnow()` → `datetime.now(UTC)`)
- [ ] Update dependencies (no critical CVEs)

**C. Testing** 🧪
- Current: 27 passing, 85 skipped
- Goal: 100+ passing
- Tasks:
  - [ ] Create Keycloak auth mocking helper
  - [ ] Add database fixtures
  - [ ] Unskip Phase 5 tests (8 tests)
  - [ ] Unskip Phase 7 tests (19 tests)
  - [ ] Unskip Group tests (52 tests)

---

---

### 3. Collaborative Writing System (Literate Roleplay) 🎭 **TOP PRIORITY**
**Status:** 🆕 Not started - New feature request  
**Goal:** Enable co-writers to collaborate via Matrix messaging and compile conversations into polished documents

**Vision:**
Writers exchange messages back-and-forth (like roleplay), then compile the conversation thread into a unified Tiptap document for collaborative editing. Think: Discord RP channels + Google Docs.

#### Phase 1: Matrix Messaging Integration (Week 1-2)

**Backend Setup:**
- [ ] Matrix server configuration
  - Use existing Synapse instance or deploy new one
  - Configure HTTPS and federation
  - Set up admin account
  - Create bot account for auto-room management
- [ ] Auto-registration flow
  - When user first accesses `/messages`, auto-create Matrix account
  - Store `matrix_user_id`, `matrix_access_token`, `matrix_homeserver` in database
  - Generate secure password (user never sees it)
  - Set display name and avatar from Workshelf profile
- [ ] Backend API endpoints
  - `POST /api/v1/matrix/initialize` - Create Matrix account for current user
  - `GET /api/v1/matrix/credentials` - Get Matrix login token
  - `POST /api/v1/matrix/rooms` - Create direct message room
  - `GET /api/v1/matrix/rooms` - List user's rooms
  - `POST /api/v1/matrix/invite` - Invite user to room

**Frontend UI:**
- [ ] Create `/messages` page
  - Sidebar: List of conversations (rooms)
  - Main area: Selected conversation thread
  - Message input with Markdown support
  - **Do not use Element Web embedded** - Build custom UI
- [ ] Use Matrix JS SDK directly
  ```bash
  npm install matrix-js-sdk
  ```
- [ ] Message list component
  - Display messages in chronological order
  - Show sender avatar and name
  - Timestamp (relative: "2 hours ago")
  - Markdown rendering for message content
  - Image/file attachments support
  - Typing indicators ("Alice is typing...")
  - Read receipts (checkmarks)
- [ ] Conversation list sidebar
  - Recent conversations first
  - Unread badge count
  - Last message preview
  - Click to open conversation
  - "New Conversation" button (search users)
- [ ] New conversation modal
  - Search users by username/display name
  - Select user → Create DM room
  - Or: Enter Matrix room ID to join existing

**Real-time Sync:**
- [ ] Implement Matrix sync loop
  - Connect to homeserver via WebSocket
  - Listen for new messages
  - Update UI in real-time
  - Handle reconnection on network failure
- [ ] Notifications
  - Browser notifications for new messages
  - Unread count in nav bar
  - Sound notification (optional, user setting)

#### Phase 2: Co-Writer System (Week 2-3)

**Co-Writer Invitations:**
- [ ] Add "Co-Writer" relationship type
  - Separate from followers (more intimate)
  - Mutual agreement required (both accept)
  - Permission: Can create collaborative documents
- [ ] Backend models
  - `CoWriterInvitation` table: sender_id, recipient_id, status, message
  - Status: PENDING, ACCEPTED, DECLINED
  - `CoWriterRelationship` table: user1_id, user2_id, created_at
- [ ] API endpoints
  - `POST /api/v1/co-writers/invite` - Send invitation
  - `GET /api/v1/co-writers/invitations` - List pending invitations
  - `POST /api/v1/co-writers/invitations/{id}/accept` - Accept
  - `POST /api/v1/co-writers/invitations/{id}/decline` - Decline
  - `GET /api/v1/co-writers` - List all co-writers
  - `DELETE /api/v1/co-writers/{id}` - Remove co-writer
- [ ] Frontend UI
  - `/co-writers` page showing:
    - Current co-writers (with "Remove" button)
    - Pending invitations sent
    - Pending invitations received (Accept/Decline)
  - "Invite Co-Writer" button on user profiles
  - Co-writer badge on profiles

**Collaborative Rooms:**
- [ ] "Create Collab Room" button in `/messages`
  - Select co-writer(s) from list (1-10 people)
  - Room name (e.g., "Fantasy Novel Collab")
  - Room description
  - Privacy: Private (invite-only) or Group-visible
- [ ] Room settings
  - Add/remove participants (room creator only)
  - Mute notifications
  - Pin important messages
  - Archive room (hide from active list)

#### Phase 3: Message-to-Document Compilation (Week 3-5)

**Message Selection:**
- [ ] Checkbox mode in conversation view
  - Click "Select Messages" button
  - Checkboxes appear next to each message
  - Select range (shift-click)
  - "Compile Selected" button
- [ ] Compilation preview modal
  - Show selected messages in order
  - Drag to reorder
  - Remove individual messages
  - Add section breaks
  - "Create Document" button

**Document Creation from Messages:**
- [ ] Backend compilation endpoint
  - `POST /api/v1/co-writers/compile`
  - Accepts: room_id, message_ids[], document_title
  - Returns: new document_id
- [ ] Compilation logic
  - Extract message content (strip metadata)
  - Convert Markdown to Tiptap JSON
  - Concatenate messages with section breaks
  - Add attribution (e.g., "— Alice" after each section)
  - Optional: Remove attribution (merge into unified voice)
- [ ] Create document
  - Mode: ALPHA (collaborative draft)
  - Auto-add all room participants as Collaborators (EDITOR role)
  - Link back to source room (store room_id in document metadata)
- [ ] Redirect to document editor
  - Open newly created document in Tiptap editor
  - Show success toast: "Document created from 47 messages"
  - Notification to all co-writers

**Reverse Flow: Document-to-Messages:**
- [ ] "Discuss in Room" button on collaborative documents
  - If source room exists, link to it
  - If not, offer to create new room with collaborators
  - Add document link to room topic

#### Phase 4: Advanced Collaboration Features (Week 5-6)

**Attribution & Voice Separation:**
- [ ] Compilation options
  - "Keep attribution" - Show who wrote each section
  - "Unified voice" - Remove attribution
  - "Alternate colors" - Highlight different authors' sections
- [ ] In-document attribution
  - Tiptap extension to highlight author contributions
  - Hover over paragraph → Show "Written by Alice"
  - Filter view: Show only one author's contributions

**Version Control for Collabs:**
- [ ] Collaborative version history
  - Show who made each edit
  - "Revert Alice's changes" option
  - Branch versions (explore different directions)
  - Merge branches back to main

**Roleplay-Specific Features:**
- [ ] Character system
  - Define characters in room settings
  - Switch character when posting (dropdown)
  - Messages tagged with character name
  - Compilation groups messages by character (scenes)
- [ ] Scene breaks
  - `/scene` command in chat → Inserts scene divider
  - Scenes compile as chapters
- [ ] Dice rolls (for RP game systems)
  - `/roll 2d6` command
  - Shows dice results in chat
  - Optional: Compile dice rolls as footnotes

#### Phase 5: Compiled Document Management (Week 6-7)

**Compilation History:**
- [ ] Track compilation metadata
  - `DocumentCompilation` table: document_id, source_room_id, message_ids[], compiled_at, compiled_by
  - Multiple compilations per room (different message selections)
- [ ] "View Compilations" on room page
  - List all documents created from this room
  - Show message count, date, creator
  - Link to document
- [ ] Re-compilation
  - "Add More Messages" button on compiled document
  - Opens selection UI for same room
  - Appends new messages to end of document
  - Creates new version snapshot

**Export Options:**
- [ ] Export conversation thread
  - PDF: Formatted like a script/screenplay
  - DOCX: With character names as headings
  - Markdown: Plain text with attribution
  - JSON: Full message data for backup

**Notifications:**
- [ ] Notify co-writers when:
  - Compilation is created
  - New messages added to compiled document
  - Document reaches milestone (10k words)
  - Co-writer makes significant edit

---

### 4. Global Search System 🔍 **HIGH PRIORITY**
**Status:** 🆕 Not started  
**Goal:** Universal search across all content types with privacy controls

#### Implementation (Week 1-2)

**Backend Search API:**
- [ ] Install PostgreSQL full-text search extensions
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Trigram similarity
  CREATE EXTENSION IF NOT EXISTS unaccent; -- Remove accents
  ```
- [ ] Add search indexes
  - Posts: title, body, tags
  - Documents: title, content (only PUBLIC or user-owned)
  - Groups: name, description (only PUBLIC or user-member)
  - Users: username, display_name, bio (only public profiles)
  - Tags: name, description
- [ ] Create `POST /api/v1/search` endpoint
  - Query params: `q` (query), `type` (filter), `limit`, `offset`
  - Returns: {posts: [], documents: [], groups: [], users: [], tags: []}
- [ ] Privacy filters
  - Posts: Only from PUBLIC groups or groups user is member of
  - Documents: Only mode=READ AND is_public=true (or user-owned)
  - Groups: Only PUBLIC or user is member
  - Users: Only active, not banned
  - Exclude: Deleted content, draft posts, private profiles

**Frontend UI:**
- [ ] Search bar in navigation (top right)
  - Keyboard shortcut: Cmd+K / Ctrl+K
  - Opens search modal (overlay)
  - Real-time search as you type (debounced 300ms)
- [ ] Search results modal
  - Tabs: All, Posts, Documents, Groups, Users, Tags
  - Show 5 results per type in "All" tab
  - Click tab to see full results for that type
  - Result cards:
    - **Post:** Title, excerpt, author, group, vote count
    - **Document:** Title, excerpt, author, word count, mode
    - **Group:** Name, description, member count, "Join" button
    - **User:** Avatar, username, bio, "Follow" button
    - **Tag:** Name, usage count, "Filter by this tag" button
  - Click result → Navigate to detail page
  - Empty state: "No results for '{query}'"
- [ ] Recent searches
  - Store last 10 searches in localStorage
  - Show when search bar is focused (no query)
  - Click to re-run search
  - "Clear history" button
- [ ] Search suggestions
  - Popular searches (based on analytics)
  - Trending tags
  - Suggested users to follow

**Advanced Filters:**
- [ ] Filter sidebar (desktop) or bottom sheet (mobile)
  - Date range: Today, This week, This month, Custom
  - Content type: Posts, Documents, etc.
  - Groups: Filter by specific groups (multi-select)
  - Tags: Include/exclude tags (like feed filters)
  - Author: Search by specific author
  - Sort: Relevance (default), Newest, Most popular
- [ ] Filter chips above results
  - Show active filters
  - Click X to remove filter
  - "Clear all filters" button

#### Performance Optimization:

- [ ] Search indexing job
  - Background task to update search indexes
  - Run nightly or on content changes
  - Materialized view for fast lookups
- [ ] Caching
  - Redis cache for popular searches (1 hour TTL)
  - Cache key: `search:{query}:{type}:{filters_hash}`
- [ ] Pagination
  - Infinite scroll for results
  - "Load more" button (10 results per page)

---

### 5. Notification System 🔔 **HIGH PRIORITY**
**Status:** ⚠️ Backend exists, frontend needed  
**Goal:** Real-time notifications for user interactions

#### Backend Status:
- ✅ `notifications` table exists
- ✅ API endpoints exist (likely in `/api/v1/notifications`)
- ❌ Frontend UI missing

#### Frontend Implementation (Week 1)

**Navigation Bell Icon:**
- [ ] Add bell icon to navigation bar (top right)
  - Unread count badge (red circle)
  - Animate when new notification arrives
  - Click to open dropdown panel
- [ ] Notification dropdown
  - Width: 400px, max-height: 600px
  - Show last 20 notifications
  - Scroll for more
  - Header: "Notifications" + "Mark all as read" button
  - Footer: "View all" link to `/notifications`

**Notification Cards:**
- [ ] Card design per type
  - **Comment:** "{User} commented on your post: {excerpt}"
  - **Reply:** "{User} replied to your comment: {excerpt}"
  - **Follow:** "{User} started following you"
  - **Group Invite:** "{User} invited you to {Group}"
  - **Beta Request:** "{User} requested beta reading for {Document}"
  - **Vote:** "{User} upvoted your post" (optional, could be spammy)
  - **Mention:** "{User} mentioned you in {Post}"
  - **Compilation:** "{User} created a document from your collab room"
- [ ] Card elements
  - Avatar of acting user
  - Action text with bolded names
  - Timestamp (relative)
  - Blue dot for unread
  - Click → Navigate to relevant page + mark as read
  - Hover → "Mark as read" / "Delete" buttons appear

**Full Notifications Page:**
- [ ] `/notifications` page
  - Same cards as dropdown but larger
  - Filters: All, Unread, Mentions, Comments, Social
  - Pagination (50 per page)
  - Bulk actions: "Mark all as read", "Delete all"
  - Date grouping: "Today", "This week", "Earlier"

**Real-time Updates:**
- [ ] WebSocket connection for live notifications
  - Subscribe to user's notification channel
  - Receive new notifications without refresh
  - Update unread count in real-time
  - Show browser notification (if permitted)
- [ ] Browser notifications
  - Request permission on first login
  - Show OS notification for important events
  - Click notification → Opens Workshelf + navigates to content
  - User setting to enable/disable per type

**Email Digests:**
- [ ] Backend digest job (nightly)
  - Group notifications from last 24 hours
  - Send single email with summary
  - Unsubscribe link in footer
- [ ] User preferences (in `/settings`)
  - Toggle email notifications per type
  - Digest frequency: Real-time, Daily, Weekly, Never
  - Quiet hours: No notifications between 10pm-8am

---

### 6. User Profiles & Following 👤 **HIGH PRIORITY**
**Status:** ⚠️ Backend exists, frontend minimal  
**Goal:** Public user profiles with social features

#### Backend Status:
- ✅ `user_follows` table exists
- ✅ `user_profiles` table with bio, avatar, links
- ❌ Public profile page missing

#### Frontend Implementation (Week 1-2)

**Profile Page `/users/{username}`:**
- [ ] Profile header
  - Large avatar (150x150px)
  - Display name + @username
  - Bio (multi-line)
  - Location, website link
  - Social links (Twitter, GitHub)
  - Join date: "Joined December 2025"
  - Follower/following counts (clickable)
  - **Follow/Unfollow button** (primary CTA)
  - "Message" button (opens DM)
  - Co-writer badge if relationship exists
  - Staff badge if `is_staff: true`
- [ ] Profile tabs
  - **Posts:** User's public posts (paginated)
  - **Documents:** Public documents (mode=READ, is_public=true)
  - **Groups:** Groups user is member of (public ones)
  - **Activity:** Recent activity feed (optional)
  - **About:** Extended bio, interests, badges
- [ ] Privacy controls (in `/settings/profile`)
  - Profile visibility: Public, Followers-only, Private
  - Show email on profile (checkbox)
  - Show location, website (checkboxes)
  - Hide groups, documents (checkboxes)

**Follow System:**
- [ ] Follow button states
  - Not following: "Follow" (primary button)
  - Following: "Following" (secondary) + dropdown: "Unfollow"
  - Pending (if private profile): "Requested" (disabled)
- [ ] API calls
  - `POST /api/v1/users/{id}/follow` - Follow user
  - `DELETE /api/v1/users/{id}/follow` - Unfollow
  - `GET /api/v1/users/{id}/followers` - List followers
  - `GET /api/v1/users/{id}/following` - List following
- [ ] Follower/following lists
  - Modal or page: `/users/{username}/followers`
  - User cards: Avatar, username, bio (truncated), "Follow" button
  - Search within list

**Following Feed Tab:**
- [ ] Add "Following" tab to `/feed`
  - Show posts only from users you follow
  - Chronological order (newest first)
  - Empty state: "Follow users to see their posts here"
  - Suggested users to follow (based on interests)

**User Discovery:**
- [ ] `/discover/writers` page
  - List active users (sorted by recent activity)
  - Filters: Genre interests, reputation score
  - Search by username/bio
  - "Featured Writers" section (staff-curated)
- [ ] Suggested users widget (sidebar)
  - "Writers you might like" (algorithm)
  - Based on: Shared groups, similar interests, mutual follows
  - Show 5 users with "Follow" buttons

---

### 7. Beta Reader Marketplace 🎯 **HIGH PRIORITY**
**Status:** ⚠️ Backend 80% done, frontend needed  
**Goal:** Discovery and hiring of beta readers

#### Backend Status:
- ✅ `BetaReaderProfile` model exists with rates, genres, portfolio
- ✅ `BetaRequest` model exists
- ❌ Marketplace listing page missing
- ❌ Payment integration missing

#### Frontend Implementation (Week 1-2)

**Marketplace Page `/beta-readers`:**
- [ ] Beta reader cards
  - Avatar, username, display name
  - Bio (2-3 lines)
  - Genres/interests tags
  - Rates: Per-word or per-manuscript (highlight lowest)
  - Turnaround time: "Avg 7 days"
  - Rating: ⭐⭐⭐⭐⭐ (4.8/5) + review count
  - Availability: "2/3 slots available" (red if 0)
  - "Request Beta Read" button (primary)
  - "View Profile" button (secondary)
- [ ] Filters & sorting
  - Filters:
    - Genres (multi-select checkboxes)
    - Price range slider ($0-$500)
    - Availability (hide fully booked)
    - Rating (4+ stars, 3+ stars, etc.)
    - Turnaround time (<7 days, <14 days, etc.)
  - Sort:
    - Recommended (default, algorithm)
    - Lowest price
    - Highest rated
    - Fastest turnaround
    - Most reviews
- [ ] Search bar
  - Search by username, bio keywords, genres

**Beta Reader Profile Page:**
- [ ] Enhanced profile for beta readers
  - All standard profile fields
  - **Beta Reader Section:**
    - Detailed bio / approach to beta reading
    - Genres I read (tags with checkboxes)
    - What I look for: "Plot holes, pacing, character development"
    - What I don't read: "Erotica, extreme violence"
    - Rates table:
      - Per word: "$0.05/word"
      - Per manuscript: "$300 flat"
    - Turnaround: "7-14 days for 80k words"
    - Capacity: "Currently 2/3 slots filled"
    - Availability calendar (optional)
  - **Portfolio:**
    - Sample reports (anonymized)
    - Testimonials from authors
    - Links to published works they helped with
  - **Reviews:**
    - List of reviews from authors
    - 5-star rating + written feedback
    - Sort: Most recent, Highest rated
  - "Request Beta Read" CTA (sticky button)

**Request Beta Read Flow:**
- [ ] "Request Beta Read" modal
  - Step 1: Select document to submit
  - Step 2: Choose service tier (per-word vs flat rate)
  - Step 3: Additional instructions (textarea)
  - Step 4: Review & pay
    - Show total cost
    - Stripe payment form
    - Escrow notice: "Payment held until delivery"
  - Submit button → Creates `BetaRequest` + Stripe payment intent
- [ ] Payment flow
  - Use Stripe Checkout or Elements
  - Create PaymentIntent for escrow
  - On completion: Charge card, hold in Stripe
  - On beta reader delivery: Transfer to reader (minus 10% fee)
  - On dispute: Manual review by staff

**Beta Reader Dashboard `/dashboard/beta-reading`:**
- [ ] For beta readers to manage requests
  - Tabs: Active, Completed, Declined
  - Request cards:
    - Author name, avatar
    - Document title, word count
    - Rate agreed upon ($)
    - Due date (based on turnaround time)
    - Status: PENDING, IN_PROGRESS, SUBMITTED, PAID
    - Actions: Accept, Decline, Upload Report, Mark Complete
  - Upload report:
    - File upload (PDF/DOCX) or rich text editor
    - Submit → Notifies author
    - Author reviews → Releases payment
  - Earnings summary:
    - Total earned, pending, completed
    - "Request Payout" button (when >$50)

**Review System:**
- [ ] After beta read completion
  - Author prompted to leave review
  - 5-star rating + written feedback (optional)
  - Public vs private feedback toggle
  - Review appears on beta reader's profile
- [ ] Dispute process
  - If author unhappy, can flag for review
  - Staff mediates
  - Can issue partial refund or full refund

---

### 8. Tag Discovery Page 🏷️ **MEDIUM PRIORITY**
**Status:** ⚠️ Tags exist, discovery page needed  
**Goal:** Browse and explore all tags

#### Implementation (Week 1)

**Tag Directory `/tags`:**
- [ ] Tag cloud visualization
  - Tags sized by usage count (larger = more popular)
  - Color-coded by category (if categories added later)
  - Click tag → Filter posts by that tag
- [ ] Tag list view
  - Sortable table: Tag name, usage count, created date
  - Search bar to filter tags
  - Pagination (50 per page)
- [ ] Tag detail page `/tags/{tag_name}`
  - Tag name + description (if exists)
  - Usage count
  - Related tags (tags that often appear together)
  - Recent posts with this tag
  - Top posts with this tag (by vote count)
  - "Follow Tag" button (get notifications when used)
  - "Include in Feed" / "Exclude from Feed" shortcuts

**Trending Tags Widget:**
- [ ] Show on homepage and feed sidebar
  - "Trending Tags" header
  - Top 10 tags by recent usage (last 7 days)
  - Click to add to feed filter

---

### 9. Writer Admin Dashboard 📊 **HIGH PRIORITY**
**Status:** 🆕 Not started  
**Goal:** Ghost-style analytics dashboard for writers

#### Implementation (Week 2-3)

**Dashboard Page `/admin` (User-level, not staff):**
- [ ] Overview cards (top row)
  - Total views (all content)
  - Total followers
  - Total earnings (if monetization enabled)
  - Active documents / posts
- [ ] Content performance table
  - List all user's posts + documents
  - Columns: Title, Type, Published date, Views, Votes/Likes, Comments, Revenue
  - Sort by any column
  - Click to view detailed analytics
- [ ] Audience insights
  - Follower growth chart (line graph)
  - Top referrers (where traffic comes from)
  - Geographic distribution (map)
  - Device breakdown (mobile vs desktop)
- [ ] Engagement metrics
  - Comments over time (bar chart)
  - Average reading time per document
  - Bounce rate (% who leave immediately)
  - Return visitor rate
- [ ] Revenue breakdown (if applicable)
  - Earnings by content type (tips, beta reads, sales)
  - Payout history table
  - "Request Payout" button

**Document-specific analytics `/admin/documents/{id}`:**
- [ ] Reading analytics
  - Total views, unique visitors
  - Average reading time
  - Completion rate (% who read to end)
  - Drop-off chart (where readers stop)
  - Scroll depth heatmap
- [ ] Reader demographics
  - New vs returning readers
  - Traffic sources (direct, social, search)
  - Device types
- [ ] Engagement
  - Comments, votes, saves
  - Shares to social media
  - Time spent per section/chapter

**Email reports:**
- [ ] Weekly summary email
  - Top performing content
  - New followers
  - Earnings (if any)
  - Milestone celebrations (e.g., "Your post hit 1000 views!")

---

### 10. Image Uploads 🖼️ **HIGH PRIORITY**
**Status:** ⚠️ S3 configured, upload UI needed  
**Goal:** Images in posts, documents, and profiles

#### Implementation (Week 1)

**Backend:**
- [ ] S3 image upload endpoint
  - `POST /api/v1/uploads/images`
  - Accepts: multipart/form-data
  - Validates: File type (JPEG, PNG, GIF, WebP), max size (10MB)
  - Returns: {url: "https://s3.../image.jpg", thumbnail_url: "..."}
- [ ] Image processing
  - Automatic resizing (max 2000px width)
  - Generate thumbnail (300px)
  - Compress (80% quality JPEG)
  - Strip EXIF data (privacy)
  - Use library like `sharp` or `Pillow`
- [ ] Image serving
  - CloudFront CDN (optional, for speed)
  - Signed URLs for private images
  - Content-Type headers
  - Cache-Control headers (1 year)

**Frontend - Profile Avatars:**
- [ ] Avatar upload in `/settings/profile`
  - Circular preview
  - "Upload Avatar" button → File picker
  - Drag & drop support
  - Crop/resize modal (using react-image-crop)
  - "Remove Avatar" button (revert to default)
- [ ] Show avatar everywhere
  - Navigation bar (top right)
  - Profile page
  - Post author cards
  - Comment threads
  - Notification cards

**Frontend - Post Images:**
- [ ] Image upload in post composer
  - "Add Image" button (camera icon)
  - Upload → Insert into post body
  - Markdown syntax: `![alt text](url)`
  - Or: Embedded image in rich text (if using Tiptap)
  - Multiple images per post (gallery)
- [ ] Image display in feed
  - Show first image as thumbnail
  - Click to open lightbox (full size)
  - Gallery navigation (next/prev arrows)

**Frontend - Document Images:**
- [ ] Tiptap image extension
  - Drag & drop images into editor
  - Paste images from clipboard
  - Image toolbar: Resize, align, add caption
  - Alt text input (accessibility)
- [ ] Cover images for documents
  - "Set Cover Image" in document settings
  - Shows on document card in feed
  - Shows on document detail page header

**Content Moderation:**
- [ ] Auto-scan images for NSFW content
  - Use AWS Rekognition or similar
  - Flag for manual review if >80% confidence
  - Auto-blur flagged images
- [ ] Report image button
  - Users can report inappropriate images
  - Staff review queue

---

### 11. Mobile Responsiveness & Accessibility 📱 **HIGH PRIORITY**
**Status:** ⚠️ Partially implemented  
**Goal:** Fully responsive, mobile-first, accessible design

#### Mobile Audit & Fixes (Week 1-2)

**Navigation:**
- [ ] Bottom navigation bar on mobile (<768px)
  - Icons: Home, Search, Messages, Notifications, Profile
  - Active state (highlighted)
  - Swipe gestures (optional)
- [ ] Hamburger menu for secondary nav
  - Groups, Co-Writers, Beta Readers, Store, Settings
- [ ] Collapsible sidebars
  - Slide in from left/right
  - Overlay with backdrop (click to close)

**Touch-Friendly UI:**
- [ ] Minimum touch target size: 44x44px (WCAG AAA)
- [ ] Adequate spacing between buttons (8px min)
- [ ] Swipe gestures
  - Swipe left on post → Save, Share
  - Swipe right on notification → Mark read
  - Swipe to go back (browser history)
- [ ] Pull-to-refresh on feed pages
- [ ] Infinite scroll (not pagination) on mobile

**Form Optimization:**
- [ ] Large input fields (48px height)
- [ ] Auto-focus on modal open
- [ ] Proper keyboard types
  - `type="email"` for email inputs
  - `type="tel"` for phone
  - `inputmode="numeric"` for numbers
- [ ] "Done" button to close keyboard
- [ ] Save draft on background (prevent data loss)

**Performance:**
- [ ] Lazy load images (use `loading="lazy"`)
- [ ] Infinite scroll with intersection observer
- [ ] Code splitting (load pages on demand)
- [ ] Reduce bundle size (tree shaking)
- [ ] Service worker for offline support (PWA)

**Accessibility (WCAG 2.1 AA):**
- [ ] Semantic HTML (`<nav>`, `<article>`, `<aside>`)
- [ ] ARIA labels on all interactive elements
  - `aria-label="Close modal"`
  - `aria-expanded="true"` on dropdowns
- [ ] Keyboard navigation
  - Tab through all interactive elements
  - Escape to close modals
  - Enter/Space to activate buttons
  - Arrow keys for dropdowns/menus
- [ ] Screen reader testing
  - Test with VoiceOver (macOS) and NVDA (Windows)
  - Announce dynamic content changes
  - Skip links: "Skip to main content"
- [ ] Color contrast ratio 4.5:1 minimum
  - Use WebAIM contrast checker
  - Don't rely on color alone (use icons + text)
- [ ] Focus indicators (visible outline)
  - Don't remove `:focus` styles
  - Custom focus rings (2px solid)
- [ ] Captions for images (alt text)
- [ ] Transcripts for audio/video (future)
- [ ] Reduced motion mode
  - Respect `prefers-reduced-motion` media query
  - Disable animations if enabled

**Dark Mode:**
- [ ] Implement dark theme
  - Toggle in `/settings/appearance`
  - Save preference to localStorage
  - System default: `prefers-color-scheme`
  - Smooth transition between themes

---

### 12. Onboarding Flow 🚀 **MEDIUM PRIORITY**
**Status:** 🆕 Not started  
**Goal:** Guided setup for new users

#### Implementation (Week 1)

**Welcome Wizard:**
- [ ] Show on first login (check `onboarding_completed` flag)
- [ ] Step 1: Welcome screen
  - "Welcome to Workshelf!"
  - Brief value prop
  - "Let's get started" button
- [ ] Step 2: Pick interests
  - List of genre tags (checkboxes)
  - Select 3-10 interests
  - Saves to `user.interests` array
  - Used for content recommendations
- [ ] Step 3: Follow suggested users
  - Show 10 users based on interests
  - "Follow" buttons (multi-select)
  - "Skip" button
- [ ] Step 4: Join suggested groups
  - Show 5-10 groups based on interests
  - "Join" buttons
  - "Skip" button
- [ ] Step 5: Set up profile
  - Upload avatar
  - Write bio (optional)
  - Add website/social links (optional)
  - "Complete Setup" button
- [ ] Step 6: Create first content (optional)
  - "Create a post" or "Start a document"
  - Tooltip: "Share your first thoughts!"
  - Or "I'll do this later" button
- [ ] Completion
  - Mark `onboarding_completed = true`
  - Redirect to personalized feed
  - Show success toast: "You're all set!"

**Progressive Disclosure:**
- [ ] Contextual tooltips (first-time only)
  - Appear on first interaction with feature
  - "This is where you filter by tags"
  - "Click here to save posts"
  - Dismiss button (never show again)
- [ ] Empty states with CTAs
  - No posts: "Your feed is empty. Join some groups!"
  - No documents: "Start writing your first document"
  - No co-writers: "Invite a co-writer to collaborate"

---

### 13. Tipping System 💰 **MEDIUM PRIORITY**
**Status:** ⚠️ Stripe configured, tipping UI needed  
**Goal:** One-click tips for creators

#### Implementation (Week 1-2)

**Backend:**
- [ ] Check if Stripe integration exists
  - `POST /api/v1/payments/tips` endpoint
  - Creates Stripe PaymentIntent
  - Records tip in `payments` table
  - Credits creator earnings
- [ ] Tip model
  - `Tip` table: sender_id, recipient_id, amount_cents, message, created_at
  - Link to Payment record
- [ ] Creator earnings update
  - Add tip amount to `creator_earnings.total_earnings`
  - Platform fee: 10% (configurable)
  - Net to creator: 90%

**Frontend - Tip Button:**
- [ ] "Tip Writer" button on:
  - User profiles (header)
  - Post cards (next to vote buttons)
  - Document detail page (top)
  - Comment threads (on hover)
- [ ] Tip modal
  - Preset amounts: $1, $3, $5, $10
  - Custom amount input ($1-$500)
  - Optional message (textarea, 200 chars)
  - "Tip anonymously" checkbox
  - Payment method (Stripe Elements)
  - "Send Tip" button
- [ ] Success confirmation
  - "Tip sent! 🎉"
  - Option to share: "I just tipped @username $5!"
  - Close modal

**Display Tips:**
- [ ] Tip count on profiles
  - "Received 47 tips" badge
  - Show on profile header
- [ ] Tip leaderboard (optional)
  - "Top Tipped Writers This Month"
  - Gamification element
- [ ] Notification when tipped
  - "{User} sent you a $5 tip: '{message}'"
  - Link to creator earnings dashboard

---

### 14. Paid Beta Reading 💵 **MEDIUM PRIORITY**
**Status:** ⚠️ Beta system exists, payment missing  
**Goal:** Monetize beta reading services

#### Implementation:
- [ ] See **#7 Beta Reader Marketplace** above (includes payment flow)
- [ ] Additional features:
  - Escrow system (payment held until delivery)
  - Rating system after completion
  - Dispute resolution process
  - Payout to beta readers (Stripe Connect)

---

### 15. Subscription Tiers for Site Features 💎 **MEDIUM PRIORITY**
**Status:** ⚠️ Stripe products exist, feature gates needed  
**Goal:** Freemium model with paid tiers

#### Tier Design:

**Free Tier (Default):**
- 5 documents (max)
- 500 MB storage
- 5 groups (max membership)
- Basic features
- Ads (optional, future)

**Pro Tier ($9.99/month or $99/year):**
- Unlimited documents
- 10 GB storage
- Unlimited groups
- Priority support
- Advanced search filters
- Custom profile themes
- Export to DOCX/PDF
- Analytics dashboard

**Premium Tier ($19.99/month or $199/year):**
- Everything in Pro
- 50 GB storage
- White-label groups (custom domain)
- API access (for integrations)
- Collaboration with 20+ co-writers
- Advanced AI features (future)
- Early access to new features
- Dedicated support channel

#### Implementation (Week 2-3):

**Backend:**
- [ ] Check if subscription tiers exist in database
  - `subscription_tiers` table
  - Stripe product/price IDs
- [ ] Feature gate middleware
  - Check user's subscription tier
  - Return 402 Payment Required if feature locked
  - Return upgrade prompt in response
- [ ] Subscription endpoints
  - `GET /api/v1/subscriptions/tiers` - List all tiers
  - `POST /api/v1/subscriptions/checkout` - Create Stripe checkout session
  - `GET /api/v1/subscriptions/current` - Get user's active subscription
  - `POST /api/v1/subscriptions/cancel` - Cancel subscription
  - `POST /api/v1/subscriptions/upgrade` - Change tier
- [ ] Usage tracking
  - Count documents, storage used, groups joined
  - Return in API responses
  - Show in UI: "3/5 documents used"

**Frontend:**
- [ ] `/pricing` page
  - Comparison table with all tiers
  - Highlight features per tier
  - "Start Free Trial" or "Upgrade Now" buttons
  - Annual billing toggle (save 17%)
  - FAQ section
- [ ] Feature gates with upgrade prompts
  - When user hits limit: "You've reached your free tier limit of 5 documents. Upgrade to Pro for unlimited!"
  - "Upgrade" button → `/pricing`
- [ ] Subscription management in `/settings/subscription`
  - Show current tier + renewal date
  - Usage stats (storage, documents, etc.)
  - "Upgrade" / "Change Plan" buttons
  - "Cancel Subscription" button (with confirmation)
  - Invoice history table
- [ ] Stripe Checkout integration
  - Redirect to Stripe-hosted checkout
  - Return URL: `/settings/subscription?success=true`
  - Handle success/cancel flows
- [ ] Trial period
  - 14-day free trial for Pro/Premium
  - No credit card required to start (optional)
  - Reminder emails at 7 days, 1 day before trial ends

---

### 16. Reporting System & Anonymous Staff Messaging 🚨 **HIGH PRIORITY**
**Status:** 🆕 Not started  
**Goal:** Community safety and moderation tools

#### Implementation (Week 1-2)

**Backend:**
- [ ] Report model
  - `Report` table: reporter_id (nullable for anon), reported_user_id, reported_content_type, reported_content_id, reason, description, status, created_at
  - Reasons: SPAM, HARASSMENT, COPYRIGHT, NSFW_UNMARKED, OTHER
  - Status: PENDING, REVIEWED, RESOLVED, DISMISSED
- [ ] Report endpoints
  - `POST /api/v1/reports` - Submit report
  - `GET /api/v1/reports` - List reports (staff only)
  - `PATCH /api/v1/reports/{id}` - Update status (staff only)
- [ ] Anonymous messaging
  - `AnonymousMessage` table: content, contact_info (optional), created_at, status, response
  - No user_id (fully anonymous)
  - `POST /api/v1/reports/anonymous` - Submit anonymous message
  - Rate limit: 3 per day per IP (prevent spam)
  - Require reCAPTCHA or similar (prevent bots)

**Frontend - Report Button:**
- [ ] "Report" button on:
  - Posts (three-dot menu)
  - Comments (hover menu)
  - User profiles (three-dot menu)
  - Documents (if public)
- [ ] Report modal
  - Dropdown: Select reason
  - Textarea: Additional details (optional)
  - "Report anonymously" checkbox (hides reporter identity from reported user)
  - "Submit Report" button
  - Privacy notice: "Staff will review this report"
- [ ] Confirmation
  - "Report submitted. Our team will review it shortly."
  - Close modal

**Frontend - Anonymous Contact:**
- [ ] Link in footer: "Report a Safety Concern"
- [ ] Contact form (no login required)
  - Subject dropdown
  - Message textarea (required)
  - Optional: Email for response
  - reCAPTCHA (prevent spam)
  - "Send Message" button
- [ ] Rate limiting feedback
  - If over limit: "You've reached the daily limit for anonymous messages. Please try again tomorrow."

**Staff Moderation Queue:**
- [ ] `/admin/moderation/reports` page (staff only)
  - Tabs: Pending, Reviewed, Resolved, Dismissed
  - Report cards:
    - Reporter (or "Anonymous")
    - Reported content (link to view)
    - Reason + description
    - Date submitted
    - Status
    - Actions: View Content, Dismiss, Take Action
  - Sort: Newest first, Most reported (if multiple reports on same content)
- [ ] Report detail modal
  - Full report details
  - Link to reported content
  - Reporter's history (# of reports submitted)
  - Reported user's history (# of reports received)
  - Action buttons:
    - "Dismiss Report" (if false alarm)
    - "Warn User" (send warning message)
    - "Remove Content" (delete post/comment)
    - "Ban User" (temp or permanent)
    - "Mark as Reviewed" (no action needed)
  - Text input for mod notes (internal)

**Auto-Actions:**
- [ ] After 3 reports on same content:
  - Auto-hide content (pending review)
  - Notify content owner: "Your post has been temporarily hidden due to reports"
  - Alert staff (high priority)
- [ ] Shadow ban repeat offenders
  - User can post, but only they see it (not visible to others)
  - Prevents ban evasion (they don't know they're banned)

---

### 17. NSFW System & Privacy Controls 🔞 **HIGH PRIORITY**
**Status:** 🆕 Not started  
**Goal:** Age verification, content warnings, privacy

#### Implementation (Week 1-2)

**Age Verification (18+):**
- [ ] Backend enforcement
  - Check `user.birth_year` on registration
  - Calculate age: `current_year - birth_year >= 18`
  - Block registration if under 18
  - Error: "You must be 18+ to use Workshelf"
- [ ] Frontend form
  - Birth year input on registration
  - Dropdown or number input (1924-2007 range)
  - Privacy notice: "We only store your birth year, not full date"

**Content Warning System:**
- [ ] Content warning options (checkboxes)
  - Violence / Gore
  - Sexual Content
  - Strong Language
  - Substance Abuse
  - Death / Grief
  - Self-Harm
  - Other (custom text)
- [ ] Add to post creation form
  - "Content Warnings" section
  - Multi-select checkboxes
  - Show prominently (can't miss it)
- [ ] Add to document settings
  - Same checkboxes
  - Required if `nsfw: true`
- [ ] Backend storage
  - `content_warnings` JSON column on posts/documents
  - Array of warning types: `["violence", "sexual_content"]`

**NSFW Tagging:**
- [ ] NSFW checkbox
  - On post creation form
  - On document settings
  - Separate from content warnings (can be SFW but warned)
- [ ] Backend storage
  - `is_nsfw` boolean column on posts/documents
  - Default: false
  - Indexed for filtering

**Content Blurring:**
- [ ] Blur NSFW content by default
  - CSS filter: `blur(20px)`
  - Overlay: "NSFW Content - Click to reveal"
  - Click → Remove blur, show content
  - Remember choice for this post (localStorage)
- [ ] Blur warned content
  - Show content warnings as overlay
  - "This post contains: Violence, Strong Language"
  - "View Content" button
  - "Hide Forever" button (never show this post)
- [ ] User preferences (in `/settings/content`)
  - "Automatically show NSFW content" (toggle)
  - Granular controls:
    - ☐ Show violence
    - ☐ Show sexual content
    - ☐ Show strong language
    - ☐ Show all other warnings
  - "Blur by default" (safest)

**Group Privacy:**
- [ ] Group visibility settings (in group creation/settings)
  - **PUBLIC:** Anyone can view and join
  - **GUARDED (default):** Anyone can view, must request to join (owner approves)
  - **PRIVATE:** Invite-only, not listed publicly
- [ ] Enforce privacy
  - Public groups: Show in search, feed, discover
  - Guarded groups: Show in search (with lock icon), posts only visible to members
  - Private groups: Not in search, members-only access
- [ ] "updates" group override
  - Hardcoded as PUBLIC
  - Staff-only posting
  - Everyone can view (even logged out)
- [ ] Group owner restrictions
  - Only you (staff) can create PUBLIC groups
  - Regular users can only create GUARDED or PRIVATE
  - Prevent abuse (public spam groups)

**Login Wall:**
- [ ] Enforce authentication for all pages EXCEPT:
  - Landing page (`/`)
  - Terms of Service (`/terms`)
  - Privacy Policy (`/privacy`)
  - House Rules (`/rules`)
  - Login/signup pages
- [ ] Redirect unauthenticated users
  - If not logged in → Redirect to `/login?redirect={current_url}`
  - After login → Return to intended page
- [ ] Public "updates" group
  - Exception: Allow viewing `/groups/updates` when logged out
  - Read-only mode (can't comment, vote, etc.)
  - "Sign up to join the conversation" CTA

**NSFW Group Tagging:**
- [ ] NSFW checkbox on group creation
  - "This group allows NSFW content"
  - Warning: "All posts in this group may contain adult content"
- [ ] Age gate on NSFW groups
  - Before entering: "This group contains adult content. Are you 18+?"
  - "Yes, I'm 18+" / "No, take me back"
  - Store in localStorage (don't ask again)
- [ ] NSFW groups not in default discover
  - Require opt-in: "Show NSFW groups" toggle in settings

---

## 📊 Current State

**Production Status:** ✅ Deployed and running  
**CI/CD Pipeline:** ✅ Operational (health checks passing)  
**Test Coverage:** 27 passing, 85 skipped (functional but needs expansion)  
**Bundle Size:** 897 KB total (441KB main + 509KB editor + chunks)  
**Security:** A+ (no critical vulnerabilities)  
**Accessibility:** WCAG 2.1 AA ✅  
**GDPR Compliance:** 100% Complete ✅## 📈 Feature Status Summary
