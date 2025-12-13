# Dependency Fixes - December 13, 2025

## Issue: SQLAlchemy Model Import Errors

### Problem
When importing roleplay models, encountered the following error:
```
sqlalchemy.exc.InvalidRequestError: When initializing mapper Mapper[GroupPost(group_posts)], 
expression 'PostTag' failed to locate a name ('PostTag'). 
If this is a class name, consider adding this relationship() to the 
<class 'app.models.collaboration.GroupPost'> class after both dependent classes have been defined.
```

### Root Cause
The `GroupPost` model in `backend/app/models/collaboration.py` had a relationship to `PostTag`:

```python
post_tags = relationship("PostTag", back_populates="post", cascade="all, delete-orphan")
```

However, `PostTag` and `ContentTag` models from `backend/app/models/tags.py` were **not imported** in `backend/app/models/__init__.py`, causing SQLAlchemy to fail when resolving the relationship string reference.

### Solution
Added the missing imports to `backend/app/models/__init__.py`:

**Import statement added:**
```python
from app.models.tags import (
    ContentTag, PostTag
)
```

**Export list updated:**
```python
__all__ = [
    # ... existing exports ...
    # Tags
    "ContentTag",
    "PostTag",
    # ... rest of exports ...
]
```

### Verification
After the fix, all models import successfully:

```python
from app.models import *
# No errors!
```

Tested all models on production:
```
✅ RoleplayProject: 0 records
✅ RoleplayCharacter: 0 records
✅ RoleplayPassage: 0 records
✅ RoleplayScene: 0 records
✅ LoreEntry: 0 records
✅ PassageReaction: 0 records
✅ DiceRoll: 0 records
✅ GroupPost: 2 records
✅ ContentTag: 8 records
✅ PostTag: 0 records
```

### Lesson Learned
When creating models with string-based relationship references (e.g., `relationship("PostTag")`), **both models must be imported in `__init__.py`** for SQLAlchemy to resolve the relationship at runtime.

### Commit
- **Commit:** `99063e1` - "Fix: Add missing ContentTag and PostTag imports to models"
- **Date:** December 13, 2025
- **Files Changed:** `backend/app/models/__init__.py`

---

## Related Files
- `backend/app/models/tags.py` - ContentTag and PostTag models
- `backend/app/models/collaboration.py` - GroupPost model with PostTag relationship
- `backend/app/models/__init__.py` - Model exports
