# Current Tasks

**Last Updated:** December 13, 2025

---

## 🎯 HIGH PRIORITY - Feature Development

### 1. Content Tagging System (98% Complete)
- [x] Backend API fully deployed ✅
- [x] Frontend TagInput component ✅
- [x] Feed tag filtering UI ✅
- [x] Post creation/editing integration ✅
- [ ] **Extend to Ebooks & Articles** (Final 2%)
  - Create `ebook_tags` and `article_tags` database tables (migration 008)
  - Add TagInput to ebook upload forms
  - Add TagInput to article creation/editing forms
  - Test tag filtering across all content types

### 2. Document Editing & Version Control (Optional Enhancements)
- [ ] Diff/Compare viewer (side-by-side comparison)
- [ ] Markdown import/export
- [ ] Collaborative editing (real-time)

### 3. Beta Reader Marketplace (80% Backend, 0% Frontend)
**Backend:** ✅ Models exist (`BetaReaderProfile`, `BetaRequest`)  
**Frontend:** ❌ Not implemented

#### Week 1-2 Tasks:
- [ ] Create `/beta-readers` marketplace page
  - Beta reader cards with rates, genres, ratings
  - Filters (genre, price, availability, rating, turnaround)
  - Search by username/bio/genres
- [ ] Build beta reader profile page enhancements
  - Detailed bio, approach, rates table
  - Portfolio section with sample reports
  - Reviews from authors
- [ ] Implement "Request Beta Read" flow
  - Document selection
  - Service tier choice (per-word vs flat rate)
  - Payment via Stripe Checkout
  - Escrow system
- [ ] Create beta reader dashboard `/dashboard/beta-reading`
  - Active/Completed/Declined tabs
  - Request management, report upload
  - Earnings summary

---

## 🔧 MEDIUM PRIORITY

### 4. Writer Admin Dashboard (0% Complete)
**Goal:** Ghost-style analytics for writers (not staff admin)

- [ ] Create `/admin` page with overview cards
  - Total views, followers, earnings, active content
- [ ] Build content performance table
  - List all posts/documents with views, votes, comments, revenue
- [ ] Add audience insights
  - Follower growth chart
  - Top referrers, geographic distribution
- [ ] Create document-specific analytics `/admin/documents/{id}`
  - Reading time, completion rate, drop-off chart

### 5. Enhanced DRM Ebook Reader (0% Complete)
**Goal:** Readium LCP integration for secure ebook reading

#### Phase 1-2: Core Reader (Week 1-2)
- [ ] Install Readium Navigator Web
- [ ] Create `EbookReader.tsx` component
- [ ] Implement navigation (TOC, page controls)
- [ ] Add reader settings (font, theme, margins)

#### Phase 3-4: Annotations & Progress (Week 3)
- [ ] Implement highlighting and notes
- [ ] Add reading progress tracking
- [ ] Sync progress across devices

#### Phase 5-6: DRM Integration (Week 4-5)
- [ ] Set up Readium LCP Server (Go backend)
- [ ] Generate licenses with device limits
- [ ] Implement license enforcement
- [ ] Add dynamic watermarking

#### Phase 7-8: Store & Library (Week 6)
- [ ] Create `/store` ebook marketplace page
- [ ] Build purchase flow with Stripe
- [ ] Create `/bookshelf` library management page

### 6. User Profiles & Following (40% Complete)
**Status:** Profiles exist, following system partially implemented

- [ ] Complete privacy controls in `/settings/profile`
  - [ ] Show/hide email, location, website
  - [ ] Hide groups, documents options
- [ ] Implement follow button states (Follow/Following/Requested)
- [ ] Create follower/following lists UI
- [ ] Add "Following" tab to `/feed` (chronological from followed users)
- [ ] Build `/discover/writers` user discovery page
- [ ] Add "Suggested users" widget to sidebar

### 7. Staff Admin Infrastructure (60% Complete)
**Completed:** Sentry, Redis, Matomo, PostHog, Prometheus, Grafana

**Remaining:**
- [ ] Build Grafana dashboards
  - System metrics (CPU, memory, disk)
  - API performance (latency, errors)
  - Database slow queries
  - Redis cache hit/miss rate
- [ ] Optional: OpenTelemetry Collector (distributed tracing)
- [ ] Optional: OpenSearch (centralized logs)
- [ ] Optional: HashiCorp Vault (secrets management)

---

## 🧹 LOW PRIORITY - Technical Debt

### 8. Missing Frontend Features
- [ ] Group Scholarships UI
  - Backend complete, frontend not implemented
  - Add "Scholarships" tab to Group Settings
  - Create scholarship application form
  - Build approval workflow for group owners

- [ ] Wiki Editing UI
  - Backend complete, frontend missing
  - Create `/pages/Wiki.tsx` (view mode)
  - Create `/pages/WikiEdit.tsx` (edit with Markdown)
  - Add version history

### 9. Performance Optimization
- [ ] Image optimization (convert to WebP)
- [ ] Implement lazy loading for images
- [ ] Set up CDN for static assets
- [ ] Profile database queries with `joinedload()`
- [ ] Add Redis caching for public endpoints
- [ ] Implement ETags for conditional requests
- **Goal:** Reduce bundle from 897 KB to <800 KB

### 10. Code Cleanup
- [ ] Delete `.backup` files in `frontend/src/pages/` (4 files)
- [ ] Fix deprecation warnings
  - Replace `datetime.utcnow()` with `datetime.now(UTC)`
- [ ] Update dependencies (no critical CVEs currently)

### 11. Testing
**Current:** 27 passing, 85 skipped  
**Goal:** 100+ passing

- [ ] Create Keycloak auth mocking helper
- [ ] Add database fixtures
- [ ] Unskip Phase 5 tests (8 tests)
- [ ] Unskip Phase 7 tests (19 tests)
- [ ] Unskip Group tests (52 tests)

---

## 📋 Code TODOs (From Codebase Scan)

### Backend
- `backend/app/api/pages.py:88,125` - Implement proper async page tracking
- `backend/app/services/store_service.py:36` - Implement EPUB conversion service
- `backend/app/services/project_service.py:76` - Get actual document count from relationships
- `backend/app/services/creator_earnings_service.py:333,365` - Integrate PayPal/Stripe payout APIs
- `backend/app/services/ai_template_service.py:285` - Implement TemplateInterestMapping model
- `backend/app/api/free_books.py:104,260` - Implement Standard Ebooks integration via OPDS
- `backend/app/api/epub_uploads.py:460` - Create bookshelf item and publish after upload
- `backend/app/api/groups.py:102,153,201` - Calculate actual document count for groups
- `backend/app/api/group_admin.py:1077` - Check custom role permissions (can_invite_members)

### Frontend
- `frontend/src/pages/ReadPage.tsx:310` - Integrate with Stripe checkout for paid content
- `frontend/src/components/Editor.tsx:437` - Implement send functionality
- `frontend/src/pages/AdminDashboard.tsx:1077` - Add make staff endpoint call
- `frontend/src/pages/Bookshelf.tsx:264,596` - Implement reading list management features
- `frontend/src/pages/staff/StoreAnalytics.tsx:133,145` - Add item creation and audiobook generation
- `frontend/src/pages/Projects.tsx:142,243` - Add real progress tracking and project menu
- `frontend/src/pages/Feed.tsx:575` - Filter feed by tag (partially complete)

### Infrastructure
- `safe-deploy.sh:14,15` - Set staging and production database URLs
- `.CREDENTIALS_SECURE.md:213` - Set up S3 lifecycle policy for versioning

---

## 🎯 Recommended Next Focus

**✅ Production is Live! All infrastructure complete.**
- Keycloak authentication working (production mode)
- DNS & subdomains properly configured
- Users can log in and access the site
- Email functionality (AWS SES) configured and verified

**Next Steps - Feature Development:**
1. **Roleplay Studio System** (NEW - Top Priority)
   - See full implementation plan below
   
2. **Finish Content Tagging** (2% remaining)
   - Create ebook_tags and article_tags tables
   - Add TagInput to ebook/article forms
   
3. **Beta Reader Marketplace** (monetization feature)
   - Start with marketplace listing page
   - Build beta reader cards with filters

---

## 🎭 ROLEPLAY STUDIO SYSTEM - Implementation Plan

**Goal:** Build a collaborative literate roleplay system with instant messaging feel, character management, lore wiki, dice rolling, and easy conversion to compiled novels.

**Architecture Decision:** Extend existing Project/Folder/Document infrastructure with `project_type="roleplay"` to leverage existing collaboration features and enable natural progression from roleplay → novel.

---

### **PHASE 0: Planning & Infrastructure (Week 1 - Days 1-2)** ✅ COMPLETE

#### 0.1 Database Design Review ✅
- [x] Review existing models (Project, Document, MessageThread, Collaboration)
- [x] Design new models (RoleplayProject, RoleplayCharacter, RoleplayPassage, etc.)
- [x] Plan folder structure for roleplay projects
- [x] Document data flow: Passage → Scene → Compiled Document
- [x] Plan migration strategy (no breaking changes to existing data)
- **📄 Documentation:** `backend/docs/ROLEPLAY_ARCHITECTURE.md`

#### 0.2 Testing Infrastructure Setup ✅
- [x] Create test fixtures for roleplay data
- [x] Set up pytest helpers for roleplay objects
- [x] Plan test coverage targets (>80% for new code)
- [x] Create mock data generator for realistic testing
- **📄 Documentation:** `backend/docs/ROLEPLAY_TESTING.md`

#### 0.3 API Design & Documentation ✅
- [x] Design REST API endpoints (OpenAPI spec)
  - `POST /api/v1/roleplay/projects` - Create roleplay project
  - `GET /api/v1/roleplay/projects/{id}` - Get roleplay details
  - `POST /api/v1/roleplay/projects/{id}/characters` - Create character
  - `POST /api/v1/roleplay/projects/{id}/passages` - Post IC passage
  - `GET /api/v1/roleplay/projects/{id}/passages` - List passages
  - `POST /api/v1/roleplay/projects/{id}/scenes` - Create scene
  - `POST /api/v1/roleplay/projects/{id}/lore` - Add lore entry
  - `POST /api/v1/roleplay/projects/{id}/compile` - Compile to document
- [x] Document request/response schemas
- [x] Plan error handling patterns
- [x] Design WebSocket events (for real-time updates, optional Phase 4)
- **📄 Documentation:** `backend/docs/ROLEPLAY_API.md`

**📋 Phase 0 Deliverables:**
- ✅ Complete architecture document with data models and relationships
- ✅ Full API specification with all endpoints documented
- ✅ Comprehensive testing strategy and infrastructure guide
- ✅ Permission matrix and access control plan
- ✅ Database indexing strategy for performance
- ✅ Caching strategy for scalability
- ✅ Migration and rollback plan for production

---

### **PHASE 1: Database Models & Migrations (Week 1 - Days 3-5)** - ✅ COMPLETE

#### 1.1 Create Database Models ✅ COMPLETE
- [x] Create `backend/app/models/roleplay.py` with:
  - [x] `RoleplayProject` model (extends Project metadata)
  - [x] `RoleplayCharacter` model (character sheets)
  - [x] `RoleplayPassage` model (IC posts)
  - [x] `RoleplayScene` model (organize passages into scenes)
  - [x] `LoreEntry` model (wiki entries)
  - [x] `PassageReaction` model (likes/reactions)
  - [x] `DiceRoll` model (dice roll log)
- [x] Add relationships to existing models:
  - [x] Add `roleplay_settings` backref to `Project`
  - [x] Add roleplay-related fields to `User` if needed
- [x] Add indexes for performance:
  - [x] `idx_roleplay_passages_sequence` (roleplay_id, sequence_number)
  - [x] `idx_roleplay_characters_active` (roleplay_id, is_active)
  - [x] `idx_passage_reactions` (passage_id, user_id)

#### 1.2 Create Alembic Migration ✅ COMPLETE
- [x] Generate migration: `alembic revision -m "add_roleplay_models"`
- [x] Review generated migration SQL
- [x] Deploy to production (manually created tables via SQLAlchemy)
- [x] Verify all 7 tables exist in production database
- [x] Migration stamped as applied
- **Note:** Migration requires manual table creation due to SQLAlchemy enum auto-creation issue

#### 1.3 Update Model Exports ✅ COMPLETE
- [x] Add new models to `backend/app/models/__init__.py`
- [x] Add missing `ContentTag` and `PostTag` imports (fixed dependency issue)
- [x] Verify imports work correctly on production
- [x] All models import without errors

#### 1.4 Dependency Fixes ✅ COMPLETE
- [x] Fixed `GroupPost` → `PostTag` relationship import error
- [x] Added `ContentTag` and `PostTag` to model exports
- [x] Tested all models query successfully on production
- [x] Verified no circular import issues

**🎉 Phase 1 Complete! All 7 roleplay tables deployed to production and working.**

---

### **PHASE 2: Pydantic Schemas & Validation (Week 1-2 - Days 6-7)** - ✅ COMPLETE

#### 2.1 Create Request/Response Schemas ✅ COMPLETE
- [x] Create `backend/app/schemas/roleplay.py` with:
  - [x] `RoleplayProjectCreate` (genre, rating, dice_system, etc.)
  - [x] `RoleplayProjectUpdate` (optional field updates)
  - [x] `RoleplayProjectResponse` (includes stats, participant count)
  - [x] `CharacterCreate` (name, bio, avatar_url, stats)
  - [x] `CharacterUpdate` (optional field updates)
  - [x] `CharacterResponse` (includes passage_count)
  - [x] `PassageCreate` (content, character_id, scene_id)
  - [x] `PassageUpdate` (content, scene updates)
  - [x] `PassageResponse` (includes author, character, reactions)
  - [x] `PassageReactionCreate` / `PassageReactionResponse`
  - [x] `SceneCreate` / `SceneUpdate` / `SceneResponse`
  - [x] `LoreEntryCreate` / `LoreEntryUpdate` / `LoreEntryResponse`
  - [x] `DiceRollRequest` / `DiceRollResponse`
  - [x] `CompileRequest` (filter options, attribution style)
  - [x] `CompileResponse` (document generation results)

#### 2.2 Add Validation Rules ✅ COMPLETE
- [x] Validate `min_post_length` (non-negative or null)
- [x] Validate dice roll expressions (regex for "2d6+3" format)
- [x] Validate reaction types (limited to predefined set)
- [x] Validate scene sequence numbers (>= 0)
- [x] Validate genre/rating/dice_system from enums
- [x] Validate attribution_style and format options
- [x] Validate empty content strings
- [x] Add list/filter parameter schemas with limits

#### 2.3 Schema Exports ✅ COMPLETE
- [x] Add all schemas to `backend/app/schemas/__init__.py`
- [x] Export all Create/Update/Response schemas
- [x] Export list parameter schemas
- [x] Verify imports work correctly

#### 2.4 Validation Testing ✅ COMPLETE
- [x] Test valid schema creation (10 scenarios)
- [x] Test validation failures (negative values, empty strings)
- [x] Test dice expression validation (valid and invalid)
- [x] Test enum validation
- [x] All validation tests passing

**🎉 Phase 2 Complete! All schemas created with comprehensive validation.**

---

### **PHASE 3: Backend API Endpoints (Week 2 - Days 8-12)**

#### 3.1 Create API Router
- [ ] Create `backend/app/api/roleplay.py`
- [ ] Set up router with authentication dependencies
- [ ] Add router to `backend/app/main.py`

#### 3.2 Project Management Endpoints
- [ ] `POST /api/v1/roleplay/projects` - Create roleplay project
  - [ ] Create Project with `project_type="roleplay"`
  - [ ] Create RoleplayProject settings record
  - [ ] Auto-generate folder structure (IC Posts, OOC, Characters, Lore, Maps)
  - [ ] Return full project details
- [ ] `GET /api/v1/roleplay/projects/{id}` - Get project details
  - [ ] Check user permissions (participant or public)
  - [ ] Return project with stats (passage_count, character_count)
- [ ] `PUT /api/v1/roleplay/projects/{id}` - Update settings
  - [ ] Verify owner/admin permissions
  - [ ] Update genre, rating, posting rules
- [ ] `DELETE /api/v1/roleplay/projects/{id}` - Soft delete project
  - [ ] Verify owner permissions
  - [ ] Soft delete (set is_deleted=True)

#### 3.3 Character Management Endpoints
- [ ] `POST /api/v1/roleplay/projects/{id}/characters` - Create character
  - [ ] Verify user is participant
  - [ ] Create character sheet
  - [ ] Optional: Create character bio document in Characters folder
- [ ] `GET /api/v1/roleplay/projects/{id}/characters` - List all characters
  - [ ] Filter by user_id (optional)
  - [ ] Include stats (passage_count for each character)
- [ ] `GET /api/v1/roleplay/characters/{char_id}` - Get character details
- [ ] `PUT /api/v1/roleplay/characters/{char_id}` - Update character
  - [ ] Verify ownership
  - [ ] Update bio, stats, avatar
- [ ] `DELETE /api/v1/roleplay/characters/{char_id}` - Deactivate character
  - [ ] Soft delete (set is_active=False)

#### 3.4 Passage (IC Post) Endpoints
- [ ] `POST /api/v1/roleplay/projects/{id}/passages` - Post IC passage
  - [ ] Verify participant permission
  - [ ] Validate character_id belongs to user
  - [ ] Check min_post_length if set
  - [ ] Auto-increment sequence_number
  - [ ] Calculate word_count
  - [ ] Return passage with author/character details
- [ ] `GET /api/v1/roleplay/projects/{id}/passages` - List passages (paginated)
  - [ ] Filter by scene_id (optional)
  - [ ] Filter by character_id (optional)
  - [ ] Order by sequence_number
  - [ ] Include reactions, author, character in response
- [ ] `GET /api/v1/roleplay/passages/{passage_id}` - Get single passage
- [ ] `PUT /api/v1/roleplay/passages/{passage_id}` - Edit passage
  - [ ] Verify ownership
  - [ ] Set is_edited=True
  - [ ] Update content and word_count
- [ ] `DELETE /api/v1/roleplay/passages/{passage_id}` - Delete passage
  - [ ] Verify ownership or admin
  - [ ] Adjust sequence numbers of subsequent passages

#### 3.5 Scene Organization Endpoints
- [ ] `POST /api/v1/roleplay/projects/{id}/scenes` - Create scene
  - [ ] Verify participant permission
  - [ ] Auto-increment sequence_number
- [ ] `GET /api/v1/roleplay/projects/{id}/scenes` - List scenes
- [ ] `PUT /api/v1/roleplay/scenes/{scene_id}` - Update scene
  - [ ] Update title, description
  - [ ] Change is_active status
- [ ] `POST /api/v1/roleplay/scenes/{scene_id}/archive` - Archive scene
  - [ ] Set is_archived=True, is_active=False

#### 3.6 Lore Wiki Endpoints
- [ ] `POST /api/v1/roleplay/projects/{id}/lore` - Create lore entry
  - [ ] Verify participant permission
  - [ ] Create entry with category/tags
- [ ] `GET /api/v1/roleplay/projects/{id}/lore` - List lore entries
  - [ ] Filter by category (optional)
  - [ ] Filter by tag (optional)
  - [ ] Search by title/content (optional)
- [ ] `GET /api/v1/roleplay/lore/{entry_id}` - Get lore entry
- [ ] `PUT /api/v1/roleplay/lore/{entry_id}` - Update lore entry
  - [ ] Verify ownership or admin
- [ ] `DELETE /api/v1/roleplay/lore/{entry_id}` - Delete lore entry

#### 3.7 Reactions & Engagement Endpoints
- [ ] `POST /api/v1/roleplay/passages/{id}/react` - Add reaction
  - [ ] Body: `{reaction_type: "heart"}`
  - [ ] Upsert reaction (change if already reacted)
  - [ ] Increment passage.reaction_count
- [ ] `DELETE /api/v1/roleplay/passages/{id}/react` - Remove reaction
  - [ ] Decrement passage.reaction_count

#### 3.8 Dice Rolling Endpoints (Optional - can defer to Phase 4)
- [ ] `POST /api/v1/roleplay/projects/{id}/roll` - Roll dice
  - [ ] Parse roll expression: "2d6+3"
  - [ ] Calculate result
  - [ ] Log to DiceRoll table
  - [ ] Return result with individual rolls
- [ ] `GET /api/v1/roleplay/projects/{id}/rolls` - Get dice history

#### 3.9 Compilation Endpoint
- [ ] `POST /api/v1/roleplay/projects/{id}/compile` - Compile passages to document
  - [ ] Body: `{scene_ids: [], character_ids: [], include_attribution: true}`
  - [ ] Fetch passages matching filters
  - [ ] Concatenate content with attribution markers
  - [ ] Create new Document in "Compiled Novel" folder
  - [ ] Link document back to roleplay (store roleplay_id in metadata)
  - [ ] Add all participants as DocumentCollaborators
  - [ ] Return document_id

#### 3.10 Testing
- [ ] Create `backend/tests/test_roleplay_api.py`
- [ ] Test authentication requirements
- [ ] Test permission checks (owner vs participant vs outsider)
- [ ] Test pagination for passage lists
- [ ] Test validation errors (invalid character_id, missing fields)
- [ ] Test cascade operations (delete project → verify passages deleted)
- [ ] Test compilation with various filters
- [ ] Run full test suite: `pytest backend/tests/test_roleplay_api.py -v`
- [ ] Verify >80% code coverage: `pytest --cov=app.api.roleplay`

---

### **PHASE 4: Frontend Components (Week 3 - Days 13-17)**

#### 4.1 Create Base Components
- [ ] Create `frontend/src/components/roleplay/CharacterAvatar.tsx`
  - [ ] Display character avatar with fallback
  - [ ] Show character name on hover
- [ ] Create `frontend/src/components/roleplay/PassageCard.tsx`
  - [ ] Display passage content (TipTap read-only)
  - [ ] Show character avatar + name header
  - [ ] Show timestamp, word count
  - [ ] Reaction buttons (heart, fire, laugh, etc.)
  - [ ] Edit/delete buttons (if owner)
- [ ] Create `frontend/src/components/roleplay/CharacterSelector.tsx`
  - [ ] Dropdown to select character
  - [ ] "Create New Character" option
- [ ] Create `frontend/src/components/roleplay/SceneHeader.tsx`
  - [ ] Scene title and description
  - [ ] Passage count
  - [ ] Archive/Edit buttons

#### 4.2 Create Character Management UI
- [ ] Create `frontend/src/components/roleplay/CharacterSheet.tsx`
  - [ ] Form for character creation/editing
  - [ ] Fields: name, pronouns, species, age, avatar_url
  - [ ] Bio editor (TipTap)
  - [ ] Stats editor (key-value pairs)
  - [ ] Traits/tags input
- [ ] Create `frontend/src/components/roleplay/CharacterList.tsx`
  - [ ] Grid of character cards
  - [ ] Filter by user
  - [ ] Click to view/edit

#### 4.3 Create Main Roleplay Page
- [ ] Create `frontend/src/pages/RoleplayStudio.tsx`
  - [ ] Three-column layout:
    - [ ] Left sidebar: Navigation (IC, OOC, Characters, Lore, Maps)
    - [ ] Center: Passage feed + editor
    - [ ] Right sidebar: Scene selector + participant list (optional)
  - [ ] Load roleplay project on mount
  - [ ] Load characters, scenes, passages
- [ ] Passage Feed Section:
  - [ ] Infinite scroll or pagination for passages
  - [ ] Scene dividers between passages
  - [ ] Real-time updates (polling or WebSocket, optional)
- [ ] Passage Editor Section:
  - [ ] Character selector dropdown
  - [ ] TipTap editor for writing
  - [ ] Word count display
  - [ ] "Post" button
  - [ ] Auto-save draft functionality (optional)

#### 4.4 Create Lore Wiki UI
- [ ] Create `frontend/src/pages/RoleplayLore.tsx`
  - [ ] Category navigation (Locations, NPCs, History, Magic)
  - [ ] Lore entry list (filterable by category/tag)
  - [ ] Search bar
- [ ] Create `frontend/src/components/roleplay/LoreEntry.tsx`
  - [ ] Display lore content (TipTap read-only)
  - [ ] Edit button (if author or admin)
- [ ] Create `frontend/src/components/roleplay/LoreEditor.tsx`
  - [ ] Form for creating/editing lore
  - [ ] TipTap editor
  - [ ] Category selector
  - [ ] Tags input

#### 4.5 Create Scene Management UI
- [ ] Create `frontend/src/components/roleplay/SceneModal.tsx`
  - [ ] Modal for creating new scene
  - [ ] Fields: title, description
- [ ] Add scene selector to RoleplayStudio page
  - [ ] Dropdown or tabs to switch between scenes
  - [ ] Filter passages by selected scene

#### 4.6 Routing & Navigation
- [ ] Add routes to `frontend/src/App.tsx`:
  - [ ] `/roleplay/:id` → RoleplayStudio
  - [ ] `/roleplay/:id/characters` → Character management view
  - [ ] `/roleplay/:id/lore` → Lore wiki view
- [ ] Add "Create Roleplay" button to Projects page
- [ ] Add roleplay projects to Studio V2 project list

#### 4.7 Testing
- [ ] Create Cypress or Playwright tests
  - [ ] Test roleplay project creation flow
  - [ ] Test character creation
  - [ ] Test passage posting
  - [ ] Test reactions
  - [ ] Test lore entry creation
- [ ] Manual testing checklist:
  - [ ] Create roleplay as User A
  - [ ] Invite User B as collaborator
  - [ ] Both users create characters
  - [ ] Post passages back and forth
  - [ ] React to passages
  - [ ] Create lore entries
  - [ ] Organize into scenes
  - [ ] Verify permissions (non-participants can't post)

---

### **PHASE 5: Advanced Features (Week 4 - Days 18-21)**

#### 5.1 OOC Chat Integration
- [ ] Integrate existing MessageThread system
  - [ ] Auto-create MessageThread when roleplay project is created
  - [ ] Add all participants to thread
- [ ] Add chat sidebar to RoleplayStudio page
  - [ ] Collapsible panel on right side
  - [ ] Show recent OOC messages
  - [ ] Input field to send messages
- [ ] Add chat notifications
  - [ ] Badge count for unread messages

#### 5.2 Dice Rolling System
- [ ] Create `frontend/src/components/roleplay/DiceRoller.tsx`
  - [ ] Button with dice icon
  - [ ] Modal with dice type selector (d4, d6, d8, d10, d12, d20, d100)
  - [ ] Input for modifiers (+3, -2)
  - [ ] Input for reason/description
  - [ ] Roll button with animation
- [ ] Integrate dice roller into passage editor
  - [ ] Dice button in toolbar
  - [ ] Insert roll result into passage content
  - [ ] Save roll to dice_rolls JSONB field
- [ ] Create dice log view
  - [ ] Collapsible panel showing recent rolls
  - [ ] Filter by character

#### 5.3 Compilation to Document
- [ ] Create `frontend/src/components/roleplay/CompileModal.tsx`
  - [ ] Scene selector (multi-select)
  - [ ] Character filter (multi-select)
  - [ ] Attribution style radio buttons:
    - [ ] Keep attribution ("— Alice as Aria")
    - [ ] Remove attribution (unified voice)
    - [ ] Color-coded by author
  - [ ] Preview button (optional)
  - [ ] "Compile to Document" button
- [ ] Add "Compile" button to RoleplayStudio toolbar
- [ ] Handle compilation response:
  - [ ] Show success toast with link to new document
  - [ ] Redirect to document editor (optional)

#### 5.4 Maps & Media Gallery
- [ ] Create `frontend/src/pages/RoleplayMaps.tsx`
  - [ ] Image upload (reuse existing upload component)
  - [ ] Gallery grid view
  - [ ] Lightbox for viewing images
- [ ] Integrate maps into lore entries
  - [ ] Insert image button in lore editor
  - [ ] Gallery picker

#### 5.5 Notifications
- [ ] Add roleplay-specific notification types:
  - [ ] `NEW_PASSAGE` - Someone posted in your roleplay
  - [ ] `PASSAGE_REACTION` - Someone reacted to your passage
  - [ ] `NEW_CHARACTER` - New character created
  - [ ] `ROLEPLAY_INVITE` - Invited to roleplay
- [ ] Create notification handlers in `frontend/src/services/notifications`
- [ ] Add notification bell updates

#### 5.6 Permissions & Invitations
- [ ] Add "Invite Participant" button to roleplay settings
- [ ] Reuse existing DocumentCollaborator system
  - [ ] Add participants as collaborators on roleplay project
  - [ ] Set role to EDITOR (can post)
- [ ] Add permission checks to all endpoints
- [ ] Create "Join Request" flow for public roleplays (optional)

---

### **PHASE 6: Polish & Optimization (Week 5 - Days 22-25)**

#### 6.1 Performance Optimization
- [ ] Add database indexes for common queries:
  - [ ] Index on passages (roleplay_id, sequence_number)
  - [ ] Index on passages (scene_id, sequence_number)
  - [ ] Index on characters (roleplay_id, is_active)
- [ ] Implement pagination for passage feed
  - [ ] Load 20 passages at a time
  - [ ] Infinite scroll or "Load More" button
- [ ] Add Redis caching for:
  - [ ] Roleplay project details (10 min TTL)
  - [ ] Character lists (5 min TTL)
  - [ ] Scene lists (5 min TTL)
- [ ] Optimize SQL queries:
  - [ ] Use joinedload() for author, character in passage queries
  - [ ] Prefetch reaction counts

#### 6.2 UI/UX Polish
- [ ] Add loading states for all async operations
- [ ] Add optimistic UI updates:
  - [ ] Show passage immediately when posted (before API response)
  - [ ] Show reaction immediately when clicked
- [ ] Add empty states:
  - [ ] "No passages yet" with CTA to post first passage
  - [ ] "No characters yet" with CTA to create character
- [ ] Add error boundaries for component failures
- [ ] Add toast notifications for success/error states
- [ ] Improve mobile responsiveness:
  - [ ] Collapsible sidebar on mobile
  - [ ] Swipe gestures for navigation (optional)

#### 6.3 Accessibility
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works:
  - [ ] Tab through passage cards
  - [ ] Enter to post passage
  - [ ] Arrow keys for character selector
- [ ] Add focus indicators
- [ ] Test with screen reader
- [ ] Ensure color contrast meets WCAG AA standards

#### 6.4 Documentation
- [ ] Write user guide for roleplay features
  - [ ] How to create a roleplay
  - [ ] How to create characters
  - [ ] How to post passages
  - [ ] How to use dice roller
  - [ ] How to compile to document
- [ ] Add inline help tooltips
- [ ] Create video tutorial (optional)

#### 6.5 Analytics & Monitoring
- [ ] Add analytics events:
  - [ ] Roleplay project created
  - [ ] Character created
  - [ ] Passage posted
  - [ ] Document compiled
- [ ] Add Sentry error tracking for roleplay endpoints
- [ ] Create Grafana dashboard for roleplay metrics:
  - [ ] Active roleplays
  - [ ] Passages per day
  - [ ] Average passage length

---

### **PHASE 7: Testing & Deployment (Week 5-6 - Days 26-30)**

#### 7.1 Comprehensive Testing
- [ ] Backend unit tests (target: 90% coverage)
  - [ ] All models
  - [ ] All schemas
  - [ ] All API endpoints
- [ ] Backend integration tests
  - [ ] Multi-user roleplay scenarios
  - [ ] Permission checks
  - [ ] Compilation accuracy
- [ ] Frontend component tests (Jest/Testing Library)
  - [ ] PassageCard rendering
  - [ ] CharacterSelector behavior
  - [ ] CompileModal logic
- [ ] E2E tests (Playwright)
  - [ ] Complete roleplay workflow
  - [ ] Multi-user collaboration
  - [ ] Compilation flow
- [ ] Load testing (optional)
  - [ ] Test with 100+ passages
  - [ ] Test with 10+ participants
  - [ ] Test concurrent posting

#### 7.2 Bug Fixing & QA
- [ ] Fix all bugs found during testing
- [ ] Manual QA pass on all features
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS, Android)
- [ ] Edge case testing:
  - [ ] Very long passages (10,000+ words)
  - [ ] Special characters in content
  - [ ] Emoji in character names
  - [ ] Concurrent edits

#### 7.3 Database Migration on Production
- [ ] Backup production database
- [ ] Run migration in maintenance window:
  ```bash
  ssh production
  cd /opt/workshelf
  docker-compose exec backend alembic upgrade head
  ```
- [ ] Verify migration success
- [ ] Run smoke tests on production

#### 7.4 Deployment
- [ ] Deploy backend changes:
  - [ ] Push to git
  - [ ] SSH to production server
  - [ ] Pull latest code
  - [ ] Restart backend container
  - [ ] Verify API health
- [ ] Deploy frontend changes:
  - [ ] Build production bundle
  - [ ] Deploy to CDN (or restart frontend container)
  - [ ] Clear CDN cache
  - [ ] Verify page loads

#### 7.5 Monitoring & Rollout
- [ ] Monitor error rates in Sentry
- [ ] Monitor API latency in Grafana
- [ ] Check logs for errors
- [ ] Soft launch to beta users (optional)
  - [ ] Invite 5-10 trusted users
  - [ ] Collect feedback
  - [ ] Fix critical issues
- [ ] Public announcement
  - [ ] Blog post or social media
  - [ ] Add to changelog
  - [ ] Update documentation

---

### **PHASE 8: Future Enhancements (Post-Launch)**

#### 8.1 Real-time Collaboration (Optional)
- [ ] Set up WebSocket server
- [ ] Implement real-time passage updates
- [ ] Show "User is typing..." indicator
- [ ] Live cursor tracking in editor (collaborative editing)

#### 8.2 Advanced Roleplay Features
- [ ] Character image gallery (multiple images per character)
- [ ] Relationship mapper (character relationship graph)
- [ ] Plot timeline visualization
- [ ] Character arc tracking
- [ ] Passage templates (e.g., combat template with stats)
- [ ] Thread/subplot organization (nested scenes)

#### 8.3 Export & Publishing
- [ ] Export roleplay as EPUB
- [ ] Export as PDF with custom formatting
- [ ] Publish compiled novel to workshelf.dev store
- [ ] Generate character dossier PDFs

#### 8.4 Moderation & Safety
- [ ] Content warnings system
- [ ] Block/report users
- [ ] Private scenes (hidden from certain participants)
- [ ] Archive inactive roleplays

---

## 📊 Progress Tracking

### Success Metrics
- [ ] Can create roleplay project with settings
- [ ] Can create and manage characters
- [ ] Can post passages with character attribution
- [ ] Can react to passages
- [ ] Can organize passages into scenes
- [ ] Can add lore entries
- [ ] Can compile passages to document
- [ ] Can invite collaborators
- [ ] >80% test coverage for new code
- [ ] <200ms API response time for passage list
- [ ] Zero critical bugs in production

### Timeline Summary
- **Week 1:** Planning, database models, migrations, schemas (Days 1-7)
- **Week 2:** Backend API endpoints (Days 8-14)
- **Week 3:** Frontend components and pages (Days 15-21)
- **Week 4:** Advanced features (chat, dice, compilation) (Days 22-28)
- **Week 5-6:** Polish, testing, deployment (Days 29-35+)

**Estimated Total Time:** 5-6 weeks for full implementation

---

## 🚀 Quick Start Checklist (First Sprint)

**Sprint Goal:** Get basic passage posting working (MVP)

### Sprint 1 (Week 1)
- [ ] Create roleplay models
- [ ] Run migration
- [ ] Create schemas
- [ ] Implement project creation endpoint
- [ ] Implement character creation endpoint
- [ ] Implement passage posting endpoint
- [ ] Implement passage list endpoint
- [ ] Create basic RoleplayStudio page
- [ ] Create CharacterSelector component
- [ ] Create PassageCard component
- [ ] Test end-to-end: Create roleplay → Create character → Post passage

**Definition of Done:**
Two users can collaborate on a roleplay, create characters, and post passages back and forth in a feed-like interface.
