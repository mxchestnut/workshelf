# Roleplay Studio API Specification

**Version:** 1.0  
**Base URL:** `https://api.workshelf.dev/api/v1`  
**Authentication:** Bearer token (Keycloak JWT)

---

## Table of Contents

1. [Roleplay Projects](#roleplay-projects)
2. [Characters](#characters)
3. [Passages](#passages)
4. [Scenes](#scenes)
5. [Lore Entries](#lore-entries)
6. [Reactions](#reactions)
7. [Dice Rolling](#dice-rolling)
8. [Compilation](#compilation)

---

## Roleplay Projects

### Create Roleplay Project
**POST** `/roleplay/projects`

Create a new roleplay project with settings.

**Request Body:**
```json
{
  "title": "The Crystal Caves Adventure",
  "description": "A fantasy roleplay set in underground caverns",
  "genre": "fantasy",
  "rating": "PG-13",
  "posting_order": "free-form",
  "min_post_length": 100,
  "dice_system": "d20",
  "dice_enabled": true,
  "has_lore_wiki": true,
  "has_character_sheets": true,
  "has_maps": false
}
```

**Response:** `201 Created`
```json
{
  "id": 42,
  "project_id": 123,
  "title": "The Crystal Caves Adventure",
  "genre": "fantasy",
  "rating": "PG-13",
  "posting_order": "free-form",
  "min_post_length": 100,
  "dice_enabled": true,
  "participant_count": 1,
  "passage_count": 0,
  "character_count": 0,
  "created_at": "2025-12-13T10:00:00Z",
  "folders": {
    "ic_posts": 456,
    "ooc": 457,
    "characters": 458,
    "lore": 459,
    "maps": 460,
    "compiled": 461
  }
}
```

---

### Get Roleplay Project
**GET** `/roleplay/projects/{id}`

Get roleplay project details with stats.

**Response:** `200 OK`
```json
{
  "id": 42,
  "project_id": 123,
  "title": "The Crystal Caves Adventure",
  "genre": "fantasy",
  "rating": "PG-13",
  "posting_order": "free-form",
  "min_post_length": 100,
  "dice_enabled": true,
  "participant_count": 3,
  "passage_count": 47,
  "character_count": 5,
  "active_scene": {
    "id": 2,
    "title": "The Descent"
  },
  "participants": [
    {
      "user_id": 1,
      "username": "alice",
      "role": "owner",
      "character_count": 2
    },
    {
      "user_id": 2,
      "username": "bob",
      "role": "editor",
      "character_count": 1
    }
  ],
  "created_at": "2025-12-13T10:00:00Z",
  "updated_at": "2025-12-13T15:30:00Z"
}
```

---

### Update Roleplay Settings
**PUT** `/roleplay/projects/{id}`

Update roleplay settings (owner only).

**Request Body:**
```json
{
  "genre": "dark-fantasy",
  "min_post_length": 150,
  "dice_enabled": false
}
```

**Response:** `200 OK`
```json
{
  "id": 42,
  "genre": "dark-fantasy",
  "min_post_length": 150,
  "dice_enabled": false,
  "updated_at": "2025-12-13T16:00:00Z"
}
```

---

### Delete Roleplay Project
**DELETE** `/roleplay/projects/{id}`

Soft delete roleplay project (owner only).

**Response:** `204 No Content`

---

## Characters

### Create Character
**POST** `/roleplay/projects/{id}/characters`

Create a new character sheet.

**Request Body:**
```json
{
  "name": "Aria Shadowblade",
  "pronouns": "she/her",
  "species": "Half-Elf",
  "age": "24",
  "avatar_url": "https://example.com/aria.png",
  "short_description": "A stealthy rogue seeking redemption",
  "full_bio": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Born in the shadow district..."}]
      }
    ]
  },
  "stats": {
    "strength": 12,
    "dexterity": 18,
    "constitution": 14,
    "intelligence": 13,
    "wisdom": 10,
    "charisma": 16
  },
  "traits": ["stealthy", "quick-witted", "haunted-past"]
}
```

**Response:** `201 Created`
```json
{
  "id": 15,
  "roleplay_id": 42,
  "user_id": 1,
  "name": "Aria Shadowblade",
  "pronouns": "she/her",
  "species": "Half-Elf",
  "age": "24",
  "avatar_url": "https://example.com/aria.png",
  "short_description": "A stealthy rogue seeking redemption",
  "stats": {...},
  "traits": ["stealthy", "quick-witted", "haunted-past"],
  "is_active": true,
  "is_npc": false,
  "passage_count": 0,
  "created_at": "2025-12-13T10:15:00Z"
}
```

---

### List Characters
**GET** `/roleplay/projects/{id}/characters`

List all characters in roleplay.

**Query Parameters:**
- `user_id` (optional) - Filter by user
- `is_active` (optional) - Filter active/inactive

**Response:** `200 OK`
```json
{
  "characters": [
    {
      "id": 15,
      "name": "Aria Shadowblade",
      "avatar_url": "https://example.com/aria.png",
      "user": {
        "id": 1,
        "username": "alice"
      },
      "passage_count": 23,
      "is_active": true
    },
    {
      "id": 16,
      "name": "Kael Ironheart",
      "avatar_url": "https://example.com/kael.png",
      "user": {
        "id": 2,
        "username": "bob"
      },
      "passage_count": 19,
      "is_active": true
    }
  ],
  "total": 2
}
```

---

### Get Character
**GET** `/roleplay/characters/{char_id}`

Get detailed character information.

**Response:** `200 OK`
```json
{
  "id": 15,
  "roleplay_id": 42,
  "name": "Aria Shadowblade",
  "pronouns": "she/her",
  "full_bio": {...},
  "stats": {...},
  "traits": [...],
  "passage_count": 23,
  "first_post_at": "2025-12-13T10:30:00Z",
  "last_post_at": "2025-12-13T15:45:00Z"
}
```

---

### Update Character
**PUT** `/roleplay/characters/{char_id}`

Update character (owner only).

**Request Body:**
```json
{
  "avatar_url": "https://example.com/aria-new.png",
  "stats": {
    "dexterity": 19
  }
}
```

**Response:** `200 OK`

---

### Deactivate Character
**DELETE** `/roleplay/characters/{char_id}`

Soft delete character (owner only).

**Response:** `204 No Content`

---

## Passages

### Post Passage
**POST** `/roleplay/projects/{id}/passages`

Post a new IC passage.

**Request Body:**
```json
{
  "character_id": 15,
  "scene_id": 2,
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {"type": "text", "text": "Aria crept through the darkened corridor, her footsteps silent on the stone floor. The air grew colder as she descended deeper into the caves."}
        ]
      }
    ]
  },
  "dice_rolls": [
    {
      "roll": "1d20+8",
      "result": 23,
      "reason": "Stealth check"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 312,
  "roleplay_id": 42,
  "user_id": 1,
  "character_id": 15,
  "scene_id": 2,
  "content": {...},
  "word_count": 28,
  "sequence_number": 47,
  "dice_rolls": [...],
  "is_edited": false,
  "reaction_count": 0,
  "author": {
    "id": 1,
    "username": "alice",
    "avatar": "https://example.com/alice.jpg"
  },
  "character": {
    "id": 15,
    "name": "Aria Shadowblade",
    "avatar_url": "https://example.com/aria.png"
  },
  "created_at": "2025-12-13T16:15:00Z"
}
```

---

### List Passages
**GET** `/roleplay/projects/{id}/passages`

List passages in chronological order (paginated).

**Query Parameters:**
- `scene_id` (optional) - Filter by scene
- `character_id` (optional) - Filter by character
- `limit` (default: 20) - Results per page
- `cursor` (optional) - Sequence number for pagination

**Response:** `200 OK`
```json
{
  "passages": [
    {
      "id": 310,
      "sequence_number": 45,
      "content": {...},
      "word_count": 42,
      "author": {...},
      "character": {...},
      "reaction_count": 3,
      "user_reacted": "heart",
      "created_at": "2025-12-13T15:30:00Z"
    },
    {
      "id": 311,
      "sequence_number": 46,
      "content": {...},
      "word_count": 35,
      "author": {...},
      "character": {...},
      "reaction_count": 2,
      "user_reacted": null,
      "created_at": "2025-12-13T15:45:00Z"
    }
  ],
  "total": 47,
  "next_cursor": 44,
  "has_more": true
}
```

---

### Get Passage
**GET** `/roleplay/passages/{passage_id}`

Get single passage with full details.

**Response:** `200 OK`

---

### Update Passage
**PUT** `/roleplay/passages/{passage_id}`

Edit passage (owner only).

**Request Body:**
```json
{
  "content": {...}
}
```

**Response:** `200 OK`
```json
{
  "id": 312,
  "content": {...},
  "is_edited": true,
  "updated_at": "2025-12-13T16:30:00Z"
}
```

---

### Delete Passage
**DELETE** `/roleplay/passages/{passage_id}`

Delete passage (owner or roleplay owner).

**Response:** `204 No Content`

---

## Scenes

### Create Scene
**POST** `/roleplay/projects/{id}/scenes`

Create a new scene.

**Request Body:**
```json
{
  "title": "The Ancient Chamber",
  "description": "A vast cavern filled with glowing crystals"
}
```

**Response:** `201 Created`
```json
{
  "id": 3,
  "roleplay_id": 42,
  "title": "The Ancient Chamber",
  "description": "A vast cavern filled with glowing crystals",
  "sequence_number": 3,
  "is_active": true,
  "is_archived": false,
  "passage_count": 0,
  "created_at": "2025-12-13T16:00:00Z"
}
```

---

### List Scenes
**GET** `/roleplay/projects/{id}/scenes`

List all scenes.

**Response:** `200 OK`
```json
{
  "scenes": [
    {
      "id": 1,
      "title": "The Entrance",
      "sequence_number": 1,
      "is_active": false,
      "is_archived": false,
      "passage_count": 15
    },
    {
      "id": 2,
      "title": "The Descent",
      "sequence_number": 2,
      "is_active": true,
      "is_archived": false,
      "passage_count": 32
    }
  ],
  "total": 2
}
```

---

### Update Scene
**PUT** `/roleplay/scenes/{scene_id}`

Update scene details.

**Request Body:**
```json
{
  "title": "The Descent (Part 2)",
  "is_active": false
}
```

**Response:** `200 OK`

---

### Archive Scene
**POST** `/roleplay/scenes/{scene_id}/archive`

Archive scene (mark as complete).

**Response:** `200 OK`
```json
{
  "id": 2,
  "is_active": false,
  "is_archived": true
}
```

---

## Lore Entries

### Create Lore Entry
**POST** `/roleplay/projects/{id}/lore`

Add worldbuilding entry.

**Request Body:**
```json
{
  "title": "The Crystal Caves",
  "category": "Locations",
  "content": {
    "type": "doc",
    "content": [...]
  },
  "tags": ["caves", "magic", "ancient"],
  "is_public": true
}
```

**Response:** `201 Created`
```json
{
  "id": 24,
  "roleplay_id": 42,
  "author_id": 1,
  "title": "The Crystal Caves",
  "category": "Locations",
  "tags": ["caves", "magic", "ancient"],
  "is_public": true,
  "author": {
    "id": 1,
    "username": "alice"
  },
  "created_at": "2025-12-13T16:30:00Z"
}
```

---

### List Lore Entries
**GET** `/roleplay/projects/{id}/lore`

List lore entries.

**Query Parameters:**
- `category` (optional) - Filter by category
- `tag` (optional) - Filter by tag
- `search` (optional) - Search title/content

**Response:** `200 OK`
```json
{
  "entries": [
    {
      "id": 24,
      "title": "The Crystal Caves",
      "category": "Locations",
      "tags": ["caves", "magic", "ancient"],
      "author": {...},
      "created_at": "2025-12-13T16:30:00Z"
    }
  ],
  "total": 1
}
```

---

### Get Lore Entry
**GET** `/roleplay/lore/{entry_id}`

Get full lore entry.

**Response:** `200 OK`

---

### Update Lore Entry
**PUT** `/roleplay/lore/{entry_id}`

Update lore (author or roleplay owner).

**Response:** `200 OK`

---

### Delete Lore Entry
**DELETE** `/roleplay/lore/{entry_id}`

Delete lore entry.

**Response:** `204 No Content`

---

## Reactions

### Add Reaction
**POST** `/roleplay/passages/{id}/react`

React to a passage.

**Request Body:**
```json
{
  "reaction_type": "heart"
}
```

**Response:** `201 Created`
```json
{
  "passage_id": 312,
  "user_id": 2,
  "reaction_type": "heart",
  "created_at": "2025-12-13T16:45:00Z"
}
```

---

### Remove Reaction
**DELETE** `/roleplay/passages/{id}/react`

Remove your reaction.

**Response:** `204 No Content`

---

## Dice Rolling

### Roll Dice
**POST** `/roleplay/projects/{id}/roll`

Roll dice and log result.

**Request Body:**
```json
{
  "character_id": 15,
  "roll_expression": "2d6+3",
  "reason": "Attack roll"
}
```

**Response:** `201 Created`
```json
{
  "id": 89,
  "roleplay_id": 42,
  "user_id": 1,
  "character_id": 15,
  "roll_expression": "2d6+3",
  "result": 11,
  "individual_rolls": [4, 4],
  "reason": "Attack roll",
  "created_at": "2025-12-13T17:00:00Z"
}
```

---

### List Dice Rolls
**GET** `/roleplay/projects/{id}/rolls`

Get dice roll history.

**Query Parameters:**
- `character_id` (optional) - Filter by character
- `limit` (default: 50)

**Response:** `200 OK`
```json
{
  "rolls": [
    {
      "id": 89,
      "roll_expression": "2d6+3",
      "result": 11,
      "character": {...},
      "reason": "Attack roll",
      "created_at": "2025-12-13T17:00:00Z"
    }
  ],
  "total": 1
}
```

---

## Compilation

### Compile to Document
**POST** `/roleplay/projects/{id}/compile`

Compile passages into a formatted document.

**Request Body:**
```json
{
  "scene_ids": [1, 2],
  "character_ids": [15, 16],
  "attribution_style": "keep",
  "document_title": "The Crystal Caves - Complete Story"
}
```

**Attribution styles:**
- `keep` - "— Alice as Aria"
- `remove` - No attribution markers
- `color` - Color-coded by author (frontend styling)

**Response:** `201 Created`
```json
{
  "document_id": 567,
  "title": "The Crystal Caves - Complete Story",
  "passage_count": 42,
  "word_count": 8934,
  "compiled_at": "2025-12-13T17:15:00Z",
  "url": "/documents/567"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "min_post_length must be at least 50 words",
  "field": "content"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "You do not have permission to post passages in this roleplay"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Roleplay project not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "request_id": "abc123"
}
```

---

## Rate Limits

- **Anonymous:** 10 requests/minute
- **Authenticated:** 100 requests/minute
- **Premium:** 500 requests/minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1702483200
```

---

## WebSocket Events (Future)

**Connection:** `wss://api.workshelf.dev/ws/roleplay/{id}`

**Events:**
- `NEW_PASSAGE` - New passage posted
- `PASSAGE_EDITED` - Passage edited
- `NEW_REACTION` - Reaction added
- `TYPING_STATUS` - User is typing
- `USER_JOINED` - User joined roleplay
- `USER_LEFT` - User left roleplay

**Authentication:** Send token in `Authorization` header during WebSocket handshake.
