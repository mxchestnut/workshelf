# Roleplay Studio Architecture

**Last Updated:** December 13, 2025

## Overview

The Roleplay Studio system enables collaborative literate roleplay with character management, instant-message-style passage posting, lore wikis, dice rolling, and easy compilation to formatted novels.

## Architecture Decision

**Approach:** Extend existing Project/Folder/Document infrastructure with `project_type="roleplay"`

**Rationale:**
- ✅ Leverages existing collaboration features (DocumentCollaborator, permissions)
- ✅ Reuses folder organization system
- ✅ Natural progression: roleplay passages → compiled document (stays in same project)
- ✅ Reduces code duplication
- ✅ Easier to maintain

**Alternative Considered:** Separate RoleplayRoom table (rejected due to infrastructure duplication)

---

## Data Model

### Core Models

```
Project (existing)
  └─ RoleplayProject (new, 1-to-1 extension)
      ├─ RoleplayCharacter (many)
      │   └─ RoleplayPassage (many)
      ├─ RoleplayScene (many)
      │   └─ RoleplayPassage (many)
      ├─ LoreEntry (many)
      └─ DiceRoll (many)

RoleplayPassage (new)
  └─ PassageReaction (many)
```

### Model Details

#### RoleplayProject
Extends Project with roleplay-specific settings.

**Fields:**
- `project_id` (FK to projects.id, unique)
- `genre` (fantasy, sci-fi, modern, historical)
- `rating` (G, PG-13, R, mature)
- `posting_order` (free-form, turn-based, round-robin)
- `min_post_length` (minimum words per post, nullable)
- `dice_system` (d20, d6-pool, fate, none)
- `dice_enabled` (boolean)
- `has_lore_wiki`, `has_character_sheets`, `has_maps` (booleans)

**Relationships:**
- `project` → Project (back_populates="roleplay_settings")
- `characters` → RoleplayCharacter[]
- `passages` → RoleplayPassage[]
- `scenes` → RoleplayScene[]
- `lore_entries` → LoreEntry[]

#### RoleplayCharacter
Character sheets for roleplay participants.

**Fields:**
- `roleplay_id` (FK to roleplay_projects.id)
- `user_id` (FK to users.id) - owner of this character
- `name` (string, required)
- `pronouns`, `species`, `age` (strings, optional)
- `avatar_url` (string, optional)
- `short_description` (text) - one-liner
- `full_bio` (text) - TipTap JSON format
- `stats` (JSONB) - flexible stat system: `{strength: 15, dexterity: 12, ...}`
- `traits` (ARRAY of strings) - `["brave", "impulsive"]`
- `is_active` (boolean) - false = retired character
- `is_npc` (boolean) - GM-controlled character

**Relationships:**
- `roleplay` → RoleplayProject
- `user` → User (character owner)
- `passages` → RoleplayPassage[] (IC posts by this character)

**Constraints:**
- User can have multiple characters in one roleplay
- Character name must be unique within roleplay

#### RoleplayPassage
Individual IC (in-character) posts in the roleplay.

**Fields:**
- `roleplay_id` (FK to roleplay_projects.id)
- `user_id` (FK to users.id) - author
- `character_id` (FK to roleplay_characters.id, nullable) - which character is speaking
- `scene_id` (FK to roleplay_scenes.id, nullable) - which scene this belongs to
- `content` (text) - TipTap JSON format
- `word_count` (integer) - auto-calculated
- `sequence_number` (integer) - chronological ordering within roleplay
- `parent_passage_id` (FK to roleplay_passages.id, nullable) - for threading/replies
- `dice_rolls` (JSONB) - attached dice rolls: `[{roll: "1d20+5", result: 18, reason: "perception"}]`
- `is_edited` (boolean)
- `reaction_count` (integer) - denormalized for performance

**Relationships:**
- `roleplay` → RoleplayProject
- `user` → User (author)
- `character` → RoleplayCharacter
- `scene` → RoleplayScene
- `reactions` → PassageReaction[]

**Indexes:**
- `idx_roleplay_passages_sequence` (roleplay_id, sequence_number)
- `idx_roleplay_passages_scene` (scene_id, sequence_number)

#### RoleplayScene
Organize passages into scenes/chapters.

**Fields:**
- `roleplay_id` (FK to roleplay_projects.id)
- `title` (string, required)
- `description` (text, optional)
- `sequence_number` (integer) - scene ordering
- `is_active` (boolean) - currently happening scene
- `is_archived` (boolean)

**Relationships:**
- `roleplay` → RoleplayProject
- `passages` → RoleplayPassage[]

#### LoreEntry
Wiki-style worldbuilding entries.

**Fields:**
- `roleplay_id` (FK to roleplay_projects.id)
- `author_id` (FK to users.id)
- `title` (string, required)
- `category` (string) - Locations, History, Magic System, NPCs, etc.
- `content` (text) - TipTap JSON format
- `tags` (ARRAY of strings)
- `is_public` (boolean) - visible to all participants

**Relationships:**
- `roleplay` → RoleplayProject
- `author` → User

#### PassageReaction
Emoji reactions to passages.

**Fields:**
- `passage_id` (FK to roleplay_passages.id)
- `user_id` (FK to users.id)
- `reaction_type` (string) - heart, fire, laugh, cry, wow, etc.

**Relationships:**
- `passage` → RoleplayPassage
- `user` → User

**Constraints:**
- Unique index on (passage_id, user_id) - one reaction per user per passage
- On upsert: update reaction_type if already exists

#### DiceRoll
Standalone dice roll log.

**Fields:**
- `roleplay_id` (FK to roleplay_projects.id)
- `user_id` (FK to users.id)
- `character_id` (FK to roleplay_characters.id, nullable)
- `roll_expression` (string) - "2d6+3", "1d20"
- `result` (integer)
- `individual_rolls` (ARRAY of integers) - [4, 2] for 2d6
- `reason` (string, nullable) - "Stealth check"

**Relationships:**
- `roleplay` → RoleplayProject
- `user` → User
- `character` → RoleplayCharacter

---

## Data Flow

### Passage Posting Flow
```
1. User selects character from dropdown
2. User writes content in TipTap editor
3. User clicks "Post" button
4. Frontend sends POST /api/v1/roleplay/projects/{id}/passages
   {
     character_id: 42,
     content: {...tiptap_json...},
     scene_id: 5
   }
5. Backend validates:
   - User is participant in roleplay
   - Character belongs to user
   - Min post length met (if configured)
6. Backend creates passage:
   - Auto-increment sequence_number (max + 1)
   - Calculate word_count from content
7. Backend returns passage with joined data:
   - Author (user.username, user.avatar)
   - Character (name, avatar_url)
   - Reaction count
8. Frontend optimistically adds to feed
9. WebSocket broadcast to other participants (optional)
```

### Scene Organization Flow
```
1. Passages initially post to "General" scene (or null scene)
2. GM/participants create scenes: "Scene 1: The Tavern"
3. Passages can be moved between scenes (update scene_id)
4. Passages ordered by sequence_number within scenes
5. Scene selector in UI filters passage feed
```

### Compilation to Document Flow
```
1. User clicks "Compile to Novel" button
2. Frontend shows CompileModal:
   - Multi-select scenes to include
   - Multi-select characters to include
   - Radio buttons for attribution style:
     * Keep attribution: "— Alice as Aria"
     * Remove attribution: unified voice
     * Color-coded by author
3. User clicks "Compile"
4. Frontend sends POST /api/v1/roleplay/projects/{id}/compile
   {
     scene_ids: [1, 2, 3],
     character_ids: [5, 7],
     attribution_style: "keep"
   }
5. Backend:
   - Fetches passages matching filters
   - Orders by sequence_number
   - Concatenates content with attribution markers
   - Creates Document in "Compiled Novel" folder
   - Sets document.project_id = roleplay.project_id
   - Adds all roleplay participants as DocumentCollaborators (role=EDITOR)
   - Stores roleplay_id in document metadata (JSONB field)
6. Backend returns new document_id
7. Frontend redirects to document editor or shows success toast
```

### Lore Wiki Flow
```
1. While reading passages, user highlights text (e.g., "The Crystal Caves")
2. User clicks "Add to Lore" button
3. Frontend pre-fills LoreEntry form:
   - Title: "The Crystal Caves"
   - Content: highlighted text as starting point
4. User adds to wiki entry, selects category (Locations)
5. Lore entry saved
6. Lore wiki searchable/browsable by category
7. Lore entries can link to other lore entries (internal wiki links)
```

---

## Folder Structure

When a roleplay project is created, auto-generate this folder hierarchy:

```
📁 [Roleplay Title]
  📁 IC Posts (In-Character)
    📁 Scene 1: Opening
    📁 Scene 2: The Journey
    📁 Scene 3: Climax
  📁 OOC Discussion (Out-of-Character)
    📄 Planning Notes
  📁 Characters
    📄 [Character Name] (Character Sheet)
    📄 [Character Name] (Character Sheet)
  📁 Lore & Worldbuilding
    📁 Locations
    📁 NPCs
    📁 History
    📁 Magic System
  📁 Maps & Media
  📁 Compiled Novel (Draft)
    📄 Full Story - [Date]
```

**Implementation:**
- Create folders via POST /api/v1/folders/
- Set folder.project_id = roleplay.project_id
- Use parent_id for hierarchy
- Store folder IDs in roleplay metadata for quick reference

---

## Permissions & Access Control

### Roleplay Participants
Uses existing DocumentCollaborator system on the Project:
- **Owner:** Creator of roleplay (full control)
- **Editor:** Can post passages, create characters, add lore (most co-writers)
- **Commenter:** Can react to passages, read-only posting (observers)
- **Viewer:** Read-only access

### Permission Matrix

| Action | Owner | Editor | Commenter | Viewer | Non-Participant |
|--------|-------|--------|-----------|--------|-----------------|
| View passages | ✅ | ✅ | ✅ | ✅ | ❌ (if private) |
| Post passage | ✅ | ✅ | ❌ | ❌ | ❌ |
| React to passage | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create character | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit own character | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit others' character | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete own passage | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete others' passage | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create scene | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add lore entry | ✅ | ✅ | ❌ | ❌ | ❌ |
| Compile to document | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite participants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete roleplay | ✅ | ❌ | ❌ | ❌ | ❌ |

### Implementation
```python
async def check_roleplay_permission(
    db: AsyncSession,
    roleplay_id: int,
    user_id: int,
    required_role: CollaboratorRole
) -> bool:
    # Get roleplay project
    roleplay = await get_roleplay_project(db, roleplay_id)
    
    # Check if owner
    if roleplay.project.user_id == user_id:
        return True
    
    # Check collaborator role
    collaborator = await get_collaborator(
        db, 
        project_id=roleplay.project_id, 
        user_id=user_id
    )
    
    if not collaborator:
        return False
    
    # Role hierarchy: OWNER > EDITOR > COMMENTER > VIEWER
    role_hierarchy = {
        CollaboratorRole.OWNER: 4,
        CollaboratorRole.EDITOR: 3,
        CollaboratorRole.COMMENTER: 2,
        CollaboratorRole.VIEWER: 1
    }
    
    return role_hierarchy[collaborator.role] >= role_hierarchy[required_role]
```

---

## Scalability Considerations

### Database Indexes
Critical indexes for performance:
- `roleplay_passages(roleplay_id, sequence_number)` - passage feed queries
- `roleplay_passages(scene_id, sequence_number)` - scene filtering
- `roleplay_characters(roleplay_id, is_active)` - character lists
- `passage_reactions(passage_id, user_id)` - unique constraint + fast lookups
- `lore_entries(roleplay_id, category)` - category filtering

### Pagination
Passage feed must paginate:
- Load 20-50 passages at a time
- Use cursor-based pagination (sequence_number) not offset/limit
- Client-side infinite scroll or "Load More" button

### Caching Strategy
Cache in Redis:
- **Roleplay project details:** 10 min TTL (invalidate on settings update)
- **Character list:** 5 min TTL (invalidate on character create/update)
- **Scene list:** 5 min TTL (invalidate on scene create/update)
- **Recent passages:** 2 min TTL (invalidate on new passage)

### Real-time Updates (Optional - Phase 8)
For instant updates when someone posts:
- WebSocket connection per roleplay
- Broadcast events: NEW_PASSAGE, NEW_REACTION, TYPING_STATUS
- Client subscribes to `/ws/roleplay/{id}`
- Fallback to polling every 30s if WebSocket unsupported

---

## Testing Strategy

### Unit Tests
- Model creation, validation, relationships
- Schema validation (Pydantic)
- Utility functions (dice parser, word counter)

### Integration Tests
- API endpoint responses
- Permission checks
- Multi-user scenarios
- Compilation accuracy

### E2E Tests (Playwright)
- Complete roleplay workflow
- Character creation and posting
- Scene organization
- Compilation to document

### Load Tests (Optional)
- 100+ passages in feed
- 10+ concurrent participants
- Compilation of 500+ passages

### Test Coverage Target
**>80%** for all new code

---

## Future Enhancements (Post-Launch)

### Phase 8+
- Real-time collaborative editing (WebSocket)
- Character relationship graph visualization
- Plot timeline with drag-and-drop
- Advanced dice mechanics (advantage/disadvantage, critical hits)
- Voice/video chat integration
- AI-powered writing suggestions per character voice
- Export as formatted EPUB with character dividers
- Mobile app (React Native)

---

## Migration Plan

### Production Deployment Checklist
1. ✅ Backup production database
2. ✅ Test migration on staging
3. ✅ Run migration during low-traffic window
4. ✅ Verify migration success
5. ✅ Run smoke tests
6. ✅ Monitor error rates
7. ✅ Deploy backend/frontend code
8. ✅ Announce new feature

### Rollback Plan
If migration fails:
```bash
# Rollback database
docker-compose exec backend alembic downgrade -1

# Restore from backup
pg_restore -d workshelf backup.sql

# Revert code deploy
git revert <commit-hash>
git push
```

---

## Questions & Decisions

### Open Questions
- [ ] Should scenes be required or optional? (Decision: Optional, passages can exist without scene)
- [ ] Should we support multiple "main characters" per user? (Decision: Yes, unlimited)
- [ ] Should lore entries support versioning? (Decision: Defer to Phase 8)
- [ ] Should dice rolls be encrypted/tamper-proof? (Decision: No, trust-based system)

### Design Decisions Made
- ✅ Use TipTap JSON format for all rich text (consistency)
- ✅ Passages ordered by sequence_number (simple, reliable)
- ✅ One reaction per user per passage (prevents spam)
- ✅ Soft delete for passages (allow undo, maintain sequence)
- ✅ Denormalize reaction_count (performance over normalization)

---

## Contact & Resources

**Documentation:**
- API Spec: `/backend/docs/ROLEPLAY_API.md` (to be created)
- Testing Guide: `/backend/docs/ROLEPLAY_TESTING.md` (to be created)

**Related Files:**
- Models: `/backend/app/models/roleplay.py`
- Schemas: `/backend/app/schemas/roleplay.py`
- API: `/backend/app/api/roleplay.py`
- Services: `/backend/app/services/roleplay_service.py`
- Frontend: `/frontend/src/pages/RoleplayStudio.tsx`
