"""
API v1 Router
Aggregates all v1 endpoints
"""
from fastapi import APIRouter
from app.api import (
    auth,
    documents,
    studios,
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
    discovery,
    comments,
    beta_reading,
    groups,
    messaging,
    subscriptions,
    creator,
    content_integrity,
    export,
    accessibility,
    ai_assist,
    ai_templates,  # AI template generation
    admin,  # Admin endpoints for platform staff
    group_admin  # Group admin endpoints for subdomain owners
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
            "ai-assistance",
            "ai-templates"
        ]
    }

# Include routers
api_router.include_router(auth.router)
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
api_router.include_router(discovery.router)

# Phase 4: Feedback & Collaboration
api_router.include_router(comments.router)
api_router.include_router(beta_reading.router)
api_router.include_router(groups.router)
api_router.include_router(messaging.router)

# Phase 6: Monetization & Premium Features
api_router.include_router(subscriptions.router)
api_router.include_router(creator.router)

# Phase 7: Advanced Features
api_router.include_router(content_integrity.router)
api_router.include_router(export.router)
api_router.include_router(accessibility.router)

# AI Assistance (helps users CREATE, never writes FOR them)
api_router.include_router(ai_assist.router)

# AI Templates (generate custom templates based on interests)
api_router.include_router(ai_templates.router)

# Admin endpoints (Keycloak-protected for platform staff)
api_router.include_router(admin.router)

# Group admin endpoints (Keycloak-protected for group owners)
api_router.include_router(group_admin.router)
