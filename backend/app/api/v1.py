"""
API v1 Router
Aggregates all v1 endpoints
"""
from fastapi import APIRouter
from app.api import (
    auth,
    bootstrap,  # Emergency admin access
    registration,  # Registration validation endpoints
    documents,
    studios,
    users,  # User management endpoints
    user_profiles,
    tags,
    search,
    projects,
    folders,
    relationships,
    notifications,
    sharing,
    activity,
    reading,
    reading_list,
    bookshelf,  # Personal bookshelf (Goodreads-style)
    book_suggestions,  # Book suggestions from users
    authors,  # Author tracking (follows from books)
    free_books,  # Free legal ebooks (Gutenberg, Standard Ebooks)
    epub_uploads,  # Self-published EPUB uploads with verification
    store,  # WorkShelf Store for purchasing ebooks
    discovery,
    comments,
    beta_reading,
    beta_appointments,  # Beta reader appointments and releases
    beta_profiles,  # Beta reader marketplace profiles
    groups,
    messaging,
    matrix,  # Matrix protocol integration for messaging
    subscriptions,
    creator,
    content_integrity,
    export,
    accessibility,
    ai_assist,
    # ai_templates,  # AI template generation - DISABLED
    admin,  # Admin endpoints for platform staff
    admin_store,  # Admin store management endpoints
    admin_moderation,  # Admin moderation for wiki edits
    group_admin,  # Group admin endpoints for subdomain owners
    feed,  # Personalized feed
    interests,  # Dynamic interests from group tags
    invitations  # Email invitations for onboarding
)

api_router = APIRouter()

@api_router.get("/status")
async def api_status():
    """API status endpoint"""
    return {
        "api_version": "v1",
        "status": "operational",
        "features": [
            "multi-tenancy",
            "documents",
            "collaboration",
            "projects",
            "user-profiles",
            "social",
            "notifications",
            "sharing",
            "activity-feed",
            "reading-progress",
            "reading-lists",
            "discovery",
            "comments",
            "beta-reading",
            "groups",
            "messaging",
            "subscriptions",
            "creator-earnings",
            "content-integrity",
            "export",
            "accessibility",
            "ai-assistance"
        ]
    }

# Include routers
api_router.include_router(auth.router)
api_router.include_router(bootstrap.router)  # Emergency admin access
api_router.include_router(registration.router)  # Registration validation
api_router.include_router(users.router)  # User management
api_router.include_router(documents.router)
api_router.include_router(studios.router)
api_router.include_router(user_profiles.router)
api_router.include_router(tags.router)
api_router.include_router(search.router)
api_router.include_router(projects.router)
api_router.include_router(folders.router)

# Phase 2: Social Infrastructure
api_router.include_router(relationships.router)
api_router.include_router(notifications.router)
api_router.include_router(sharing.router)
api_router.include_router(activity.router)

# Phase 3: Reading & Discovery
api_router.include_router(reading.router)
api_router.include_router(reading_list.router)
api_router.include_router(bookshelf.router)  # Personal bookshelf
api_router.include_router(book_suggestions.router)  # Book suggestions from users
api_router.include_router(authors.router)  # Author tracking
api_router.include_router(free_books.router)  # Free legal ebooks
api_router.include_router(epub_uploads.router)  # Self-published EPUB uploads
api_router.include_router(store.router)  # WorkShelf Store for purchasing ebooks
api_router.include_router(discovery.router)
api_router.include_router(feed.router)  # Personalized feed
api_router.include_router(interests.router)  # Dynamic interests from groups

# Phase 4: Feedback & Collaboration
api_router.include_router(comments.router)
api_router.include_router(beta_reading.router)
api_router.include_router(beta_appointments.router)  # Beta reader appointments
api_router.include_router(beta_profiles.router)  # Beta reader marketplace profiles
api_router.include_router(groups.router)
api_router.include_router(messaging.router)
api_router.include_router(matrix.router)  # Matrix protocol integration

# Phase 6: Monetization & Premium Features
api_router.include_router(subscriptions.router)
api_router.include_router(creator.router)

# Phase 7: Advanced Features
api_router.include_router(content_integrity.router)
api_router.include_router(export.router)
api_router.include_router(accessibility.router)

# AI Assistance (helps users CREATE, never writes FOR them)
api_router.include_router(ai_assist.router)

# AI Templates (generate custom templates based on interests) - DISABLED
# api_router.include_router(ai_templates.router)

# Admin endpoints (Keycloak-protected for platform staff)
api_router.include_router(admin.router)

# Admin store management (Keycloak-protected for platform staff)
api_router.include_router(admin_store.router)

# Admin moderation (wiki edits, content approval)
api_router.include_router(admin_moderation.router)

# Group admin endpoints (Keycloak-protected for group owners)
api_router.include_router(group_admin.router)

# Email invitations for onboarding
api_router.include_router(invitations.router)
