# Group Discovery System 🔍

## Overview

A dual-purpose **interests/tags system** that powers both AI template generation and group discovery. Users can find communities that match their interests, and groups can be found by people with similar passions.

## How It Works

### 1️⃣ **Group Owners Set Interests**

**Location**: Group Admin Dashboard → Settings → Interests & Tags

**What They Do**:
- Add freeform interests: "science fiction", "worldbuilding", "collaborative storytelling"
- Or select from suggested interests: 🚀 science fiction, 🧙 fantasy, 🎲 D&D, etc.
- Interests saved to `groups.interests` array

**Dual Purpose**:
1. **AI Templates**: Claude generates custom templates based on these interests
2. **Discovery**: Other users can find this group when searching/browsing

### 2️⃣ **Users Search for Groups**

**Discovery Interface** (Future):
- Browse by interest tags
- Search: "looking for sci-fi worldbuilding groups"
- Filter: category, activity level, member count
- See: group name, description, member count, interests

### 3️⃣ **Smart Matching**

**Algorithm**:
1. User searches: "science fiction writers"
2. System finds groups with overlapping interests
3. Ranks by:
   - Interest overlap count
   - Group activity (recent posts)
   - Member count (popularity)
   - Public/private status

## Database Schema

### Existing: `groups.interests`
```sql
-- Already added in Migration 012
ALTER TABLE groups ADD COLUMN interests VARCHAR[];
```

### Future: `group_searches` Table
```sql
CREATE TABLE group_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    search_query VARCHAR NOT NULL,
    interests_searched VARCHAR[],  -- parsed interests from query
    results_found INTEGER,
    selected_group_id INTEGER REFERENCES groups(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_group_searches_query ON group_searches(search_query);
CREATE INDEX idx_group_searches_interests ON group_searches USING GIN(interests_searched);
```

**Why Track Searches?**
- See what interests people are looking for
- Identify gaps: "10 searches for 'poetry groups' but only 1 exists"
- Suggest group creation: "Want to start a poetry group?"

### Future: `group_views` Table
```sql
CREATE TABLE group_views (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    user_id INTEGER REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR  -- 'search', 'browse', 'recommendation'
);

CREATE INDEX idx_group_views_group ON group_views(group_id);
```

**Why Track Views?**
- See which groups are popular
- A/B test discovery UI
- Recommend groups based on view history

## Discovery UI Designs

### 🔍 Search Page

```
┌─────────────────────────────────────────────────────┐
│  🔍 Discover Groups                                 │
│                                                     │
│  [ Search for groups... ]                  [Search]│
│                                                     │
│  Browse by Interest:                               │
│  [🚀 Sci-Fi] [🧙 Fantasy] [🎲 D&D] [✍️ Writing]     │
│  [💼 Business] [🎓 Academic] [🎮 Gaming] [More...] │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Results for "science fiction"                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🚀 Nebula Writers                            │  │
│  │ 47 members • Active today                    │  │
│  │ A community for sci-fi authors exploring... │  │
│  │ 🏷️ science fiction • worldbuilding • space  │  │
│  │                           [View] [Join]      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🌌 Hieroscope                                │  │
│  │ 12 members • Active yesterday                │  │
│  │ Exploring divination and mystical arts...    │  │
│  │ 🏷️ mysticism • divination • symbolism       │  │
│  │                           [View] [Join]      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 📊 Browse Page

```
┌─────────────────────────────────────────────────────┐
│  Browse All Groups                                  │
│                                                     │
│  Filter:  [All Categories ▾] [Active ▾] [Public ▾]│
│  Sort by: [Most Active ▾]                          │
└─────────────────────────────────────────────────────┘

Categories:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎨 Creative  │ │ 💼 Business  │ │ 🎓 Academic  │
│ 124 groups   │ │ 45 groups    │ │ 31 groups    │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🎮 Gaming    │ │ 🔬 Tech      │ │ ✨ Other     │
│ 89 groups    │ │ 56 groups    │ │ 23 groups    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 💡 Recommendations (Personalized)

```
┌─────────────────────────────────────────────────────┐
│  Recommended for You                                │
│                                                     │
│  Based on your interests: science fiction,          │
│  worldbuilding, creative writing                    │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🚀 Nebula Writers                            │  │
│  │ 97% match • 47 members                       │  │
│  │ 🏷️ science fiction • worldbuilding          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Similar to groups you viewed:                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🌌 Star Forge Studios                        │  │
│  │ 89% match • 32 members                       │  │
│  │ 🏷️ space opera • collaborative fiction      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## API Endpoints

### Search Groups
```http
GET /api/v1/groups/search?q=science+fiction&limit=20

Response:
{
  "results": [
    {
      "id": 1,
      "name": "Nebula Writers",
      "slug": "nebula-writers",
      "description": "...",
      "interests": ["science fiction", "worldbuilding", "space opera"],
      "member_count": 47,
      "is_public": true,
      "last_activity": "2025-11-04T10:30:00Z",
      "match_score": 0.95
    }
  ],
  "total": 15
}
```

### Browse Groups by Interest
```http
GET /api/v1/groups/browse?interest=science+fiction&sort=active&limit=20

Response:
{
  "groups": [...],
  "total": 32,
  "suggested_interests": ["worldbuilding", "fantasy", "creative writing"]
}
```

### Get Group Recommendations
```http
GET /api/v1/groups/recommended?user_id=123

Response:
{
  "recommendations": [
    {
      "group": {...},
      "match_score": 0.97,
      "reason": "Based on your interests: science fiction, worldbuilding"
    }
  ]
}
```

### Track Group Search
```http
POST /api/v1/groups/searches
{
  "query": "science fiction writers",
  "interests": ["science fiction", "writing"]
}
```

## Implementation Phases

### ✅ Phase 1: Interests Management (DONE)
- [x] Add `interests` field to groups table
- [x] Build interests UI in Group Admin Dashboard
- [x] Allow adding/removing interests
- [x] Save interests to database
- [x] Ready to test on Hieroscope

### 🔄 Phase 2: Basic Search
- [ ] Create `GET /api/v1/groups/search` endpoint
- [ ] Search by name and description
- [ ] Filter by interests (array overlap)
- [ ] Basic ranking (member count + activity)
- [ ] Public groups only

### 🔄 Phase 3: Search UI
- [ ] Create `/discover` page
- [ ] Search bar with autocomplete
- [ ] Browse by interest tags
- [ ] Group cards with join buttons
- [ ] Track searches in `group_searches` table

### 🔄 Phase 4: Advanced Discovery
- [ ] Smart ranking algorithm
- [ ] Personalized recommendations
- [ ] "Similar groups" suggestions
- [ ] Track views in `group_views` table
- [ ] Analytics for group owners

### 🔄 Phase 5: Community Features
- [ ] "Groups you might like" on homepage
- [ ] Email: "New groups matching your interests"
- [ ] Group directory by category
- [ ] Featured/trending groups
- [ ] Join requests for private groups

## Search Algorithm

### Ranking Factors

```python
def calculate_match_score(group, search_query, user_interests):
    score = 0
    
    # 1. Interest overlap (40%)
    overlap = len(set(group.interests) & set(user_interests))
    score += (overlap / len(user_interests)) * 0.4
    
    # 2. Name/description match (30%)
    if search_query.lower() in group.name.lower():
        score += 0.2
    if search_query.lower() in group.description.lower():
        score += 0.1
    
    # 3. Activity (20%)
    days_since_activity = (now - group.last_activity).days
    if days_since_activity < 1:
        score += 0.2
    elif days_since_activity < 7:
        score += 0.1
    
    # 4. Size (10%)
    if group.member_count > 50:
        score += 0.1
    elif group.member_count > 20:
        score += 0.05
    
    return score
```

### Filtering Rules

1. **Public Only** (by default)
   - Private groups require direct invite
   - Option to "show private" if user wants to request join

2. **Active Groups**
   - Filter out groups with no activity in 90 days
   - Option to show inactive groups

3. **Member Count**
   - Minimum: 1 (prevent empty groups)
   - Maximum: no limit
   - Filter: "small (1-10)", "medium (11-50)", "large (50+)"

## Interest Taxonomy

### Top-Level Categories
1. **Creative** - writing, art, music, film
2. **Gaming** - D&D, video games, board games
3. **Academic** - research, study groups, thesis writing
4. **Business** - entrepreneurship, startups, marketing
5. **Technical** - programming, game dev, engineering
6. **Lifestyle** - hobbies, crafts, cooking

### Auto-Categorization
When group adds interests, auto-assign category:

```python
CATEGORY_KEYWORDS = {
    'creative': ['writing', 'fiction', 'poetry', 'art', 'music', 'film'],
    'gaming': ['D&D', 'RPG', 'tabletop', 'video game', 'board game'],
    'academic': ['research', 'thesis', 'study', 'academic', 'science'],
    'business': ['business', 'startup', 'marketing', 'entrepreneurship'],
    'technical': ['programming', 'coding', 'development', 'engineering'],
}

def auto_categorize(interests):
    scores = {cat: 0 for cat in CATEGORY_KEYWORDS}
    for interest in interests:
        for cat, keywords in CATEGORY_KEYWORDS.items():
            if any(kw in interest.lower() for kw in keywords):
                scores[cat] += 1
    return max(scores, key=scores.get)
```

## Popular Suggested Interests

**Current 10** (shown in UI):
1. 🚀 science fiction
2. 🧙 fantasy
3. 🗺️ worldbuilding
4. ✍️ creative writing
5. 🎲 D&D
6. 🎬 screenwriting
7. 💼 business
8. 🎓 academic research
9. 🎮 game development
10. 📜 poetry

**Future Expansion** (based on data):
- Top 50 interests from all groups
- Trending interests (recent growth)
- Related interests ("Users interested in X also like Y")

## Privacy Settings

### Group Visibility Levels

1. **Public**
   - Appears in search
   - Anyone can view
   - Anyone can join (or request)

2. **Unlisted**
   - Does NOT appear in search
   - Accessible via direct link
   - Anyone with link can view
   - Join by invitation only

3. **Private**
   - Does NOT appear in search
   - Invite-only membership
   - Only members can view
   - Requires approval to join

### Interest Visibility
- Interests always visible (even for private groups)
- Helps discovery without revealing content
- Group owners can choose to hide interests

## Success Metrics

### Discovery Metrics
- **Search Volume**: How many searches per day?
- **Search → View Rate**: % of searches that lead to viewing a group
- **View → Join Rate**: % of views that lead to joining
- **Interest Coverage**: % of searches that find relevant groups

### Group Growth Metrics
- **Discovery Joins**: % of joins from discovery vs invites
- **Interest Match**: Do joined groups match user interests?
- **Retention**: Do users stay in discovered groups?

### Interest Analytics
- **Trending Interests**: Growth rate of each interest
- **Underserved Interests**: Many searches, few groups
- **Group Suggestions**: "You should create a group for X"

## Future Enhancements

### 🔮 AI-Powered Discovery
- Semantic search (not just keyword matching)
- "Find me groups like X but for Y"
- Natural language: "I want to write a fantasy novel with a group"

### 🌐 Cross-Group Features
- Multi-group membership (user can be in 10 groups)
- Shared interests across groups
- Collaborative projects between groups

### 📧 Notifications
- Weekly: "New groups matching your interests"
- Real-time: "Group you viewed just became active"
- Suggestions: "3 users with similar interests joined X"

### 🏆 Gamification
- Badges: "Explorer" (joined 5 groups), "Founder" (created group)
- Leaderboards: Most active groups by category
- Achievements: "Your group reached 50 members!"

---

**Created**: November 4, 2025  
**Status**: Phase 1 complete (Interests UI deployed)  
**Next**: Build search API and discovery UI
