"""
Beta Reader Profile API
Endpoints for beta reader marketplace profiles
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Optional
from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.models.user import User, BetaReaderProfile, UserBadge
from app.schemas.beta_profile import (
    BetaReaderProfileCreate,
    BetaReaderProfileUpdate,
    BetaReaderProfileResponse,
    BetaReaderMarketplaceFilters
)

router = APIRouter(prefix="/beta-profiles", tags=["beta-profiles"])


@router.get("/my-profile", response_model=Optional[BetaReaderProfileResponse])
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's beta reader profile"""
    profile = db.query(BetaReaderProfile).filter(
        BetaReaderProfile.user_id == current_user.id
    ).first()
    
    if not profile:
        return None
    
    # Enrich with user data and badges
    user = db.query(User).filter(User.id == current_user.id).first()
    badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    
    profile_dict = {
        "id": profile.id,
        "user_id": profile.user_id,
        "username": user.username or user.email,
        "display_name": user.display_name or user.username or user.email,
        "availability": profile.availability,
        "bio": profile.bio,
        "genres": profile.genres,
        "specialties": profile.specialties,
        "hourly_rate": profile.hourly_rate,
        "per_word_rate": profile.per_word_rate,
        "per_manuscript_rate": profile.per_manuscript_rate,
        "turnaround_days": profile.turnaround_days,
        "max_concurrent_projects": profile.max_concurrent_projects,
        "portfolio_links": profile.portfolio_links,
        "preferred_contact": profile.preferred_contact,
        "is_active": profile.is_active,
        "is_featured": profile.is_featured,
        "total_projects_completed": profile.total_projects_completed,
        "average_rating": profile.average_rating,
        "beta_score": user.beta_score,
        "reading_score": user.reading_score,
        "writer_score": user.writer_score,
        "has_beta_master_badge": any(b.badge_type == "BETA_MASTER" for b in badges),
        "has_author_badge": any(b.badge_type == "AUTHOR" for b in badges),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }
    
    return BetaReaderProfileResponse(**profile_dict)


@router.put("/my-profile", response_model=BetaReaderProfileResponse)
def create_or_update_my_profile(
    profile_data: BetaReaderProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update current user's beta reader profile"""
    profile = db.query(BetaReaderProfile).filter(
        BetaReaderProfile.user_id == current_user.id
    ).first()
    
    if profile:
        # Update existing profile
        update_data = profile_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
    else:
        # Create new profile
        profile = BetaReaderProfile(
            user_id=current_user.id,
            **profile_data.model_dump(exclude_unset=True)
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    
    # Return enriched response
    user = db.query(User).filter(User.id == current_user.id).first()
    badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    
    profile_dict = {
        "id": profile.id,
        "user_id": profile.user_id,
        "username": user.username or user.email,
        "display_name": user.display_name or user.username or user.email,
        "availability": profile.availability,
        "bio": profile.bio,
        "genres": profile.genres,
        "specialties": profile.specialties,
        "hourly_rate": profile.hourly_rate,
        "per_word_rate": profile.per_word_rate,
        "per_manuscript_rate": profile.per_manuscript_rate,
        "turnaround_days": profile.turnaround_days,
        "max_concurrent_projects": profile.max_concurrent_projects,
        "portfolio_links": profile.portfolio_links,
        "preferred_contact": profile.preferred_contact,
        "is_active": profile.is_active,
        "is_featured": profile.is_featured,
        "total_projects_completed": profile.total_projects_completed,
        "average_rating": profile.average_rating,
        "beta_score": user.beta_score,
        "reading_score": user.reading_score,
        "writer_score": user.writer_score,
        "has_beta_master_badge": any(b.badge_type == "BETA_MASTER" for b in badges),
        "has_author_badge": any(b.badge_type == "AUTHOR" for b in badges),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }
    
    return BetaReaderProfileResponse(**profile_dict)


@router.get("/marketplace", response_model=dict)
def browse_marketplace(
    genres: Optional[str] = Query(None, description="Comma-separated genres"),
    specialties: Optional[str] = Query(None, description="Comma-separated specialties"),
    availability: Optional[str] = Query(None, pattern="^(available|busy|not_accepting)$"),
    min_beta_score: Optional[int] = Query(None, ge=0, le=5),
    max_hourly_rate: Optional[int] = Query(None, ge=0),
    max_per_word_rate: Optional[int] = Query(None, ge=0),
    max_per_manuscript_rate: Optional[int] = Query(None, ge=0),
    max_turnaround_days: Optional[int] = Query(None, ge=1),
    search: Optional[str] = Query(None, max_length=100),
    only_free: bool = Query(False),
    featured_first: bool = Query(True),
    sort: Optional[str] = Query(None, pattern="^(rating|turnaround|price)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Browse beta reader marketplace with filters
    Returns profiles with user data, scores, and badges
    """
    query = db.query(BetaReaderProfile).join(User).filter(
        BetaReaderProfile.is_active == True
    )
    
    # Apply filters
    if genres:
        genre_list = [g.strip() for g in genres.split(',') if g.strip()]
        if genre_list:
            query = query.filter(BetaReaderProfile.genres.overlap(genre_list))
    
    if specialties:
        specialty_list = [s.strip() for s in specialties.split(',') if s.strip()]
        if specialty_list:
            query = query.filter(BetaReaderProfile.specialties.overlap(specialty_list))
    
    if availability:
        query = query.filter(BetaReaderProfile.availability == availability)
    
    if min_beta_score is not None:
        query = query.filter(User.beta_score >= min_beta_score)
    
    if max_hourly_rate is not None:
        query = query.filter(
            or_(
                BetaReaderProfile.hourly_rate == None,
                BetaReaderProfile.hourly_rate <= max_hourly_rate
            )
        )
    
    if max_per_word_rate is not None:
        query = query.filter(
            or_(
                BetaReaderProfile.per_word_rate == None,
                BetaReaderProfile.per_word_rate <= max_per_word_rate
            )
        )
    
    if max_per_manuscript_rate is not None:
        query = query.filter(
            or_(
                BetaReaderProfile.per_manuscript_rate == None,
                BetaReaderProfile.per_manuscript_rate <= max_per_manuscript_rate
            )
        )
    
    if max_turnaround_days is not None:
        query = query.filter(
            or_(
                BetaReaderProfile.turnaround_days == None,
                BetaReaderProfile.turnaround_days <= max_turnaround_days
            )
        )
    
    if only_free:
        query = query.filter(
            and_(
                BetaReaderProfile.hourly_rate == None,
                BetaReaderProfile.per_word_rate == None,
                BetaReaderProfile.per_manuscript_rate == None
            )
        )
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(search_term),
                User.display_name.ilike(search_term),
                BetaReaderProfile.bio.ilike(search_term)
            )
        )
    
    # Sorting
    if sort == "rating":
        query = query.order_by(BetaReaderProfile.average_rating.desc().nullslast())
    elif sort == "turnaround":
        query = query.order_by(BetaReaderProfile.turnaround_days.asc().nullslast())
    elif sort == "price":
        # Sort by lowest price (prioritize per-word, then per-manuscript, then hourly)
        # Nulls last means free profiles come after paid
        query = query.order_by(
            BetaReaderProfile.per_word_rate.asc().nullslast(),
            BetaReaderProfile.per_manuscript_rate.asc().nullslast(),
            BetaReaderProfile.hourly_rate.asc().nullslast()
        )
    elif featured_first:
        query = query.order_by(
            BetaReaderProfile.is_featured.desc(),
            User.beta_score.desc(),
            BetaReaderProfile.average_rating.desc()
        )
    else:
        query = query.order_by(
            User.beta_score.desc(),
            BetaReaderProfile.average_rating.desc()
        )
    
    # Pagination
    total = query.count()
    offset = (page - 1) * page_size
    profiles = query.offset(offset).limit(page_size).all()
    
    # Enrich profiles with user data and badges
    enriched_profiles = []
    for profile in profiles:
        user = db.query(User).filter(User.id == profile.user_id).first()
        badges = db.query(UserBadge).filter(UserBadge.user_id == profile.user_id).all()
        
        profile_dict = {
            "id": profile.id,
            "user_id": profile.user_id,
            "username": user.username or user.email,
            "display_name": user.display_name or user.username or user.email,
            "availability": profile.availability,
            "bio": profile.bio,
            "genres": profile.genres,
            "specialties": profile.specialties,
            "hourly_rate": profile.hourly_rate,
            "per_word_rate": profile.per_word_rate,
            "per_manuscript_rate": profile.per_manuscript_rate,
            "turnaround_days": profile.turnaround_days,
            "max_concurrent_projects": profile.max_concurrent_projects,
            "portfolio_links": profile.portfolio_links,
            "preferred_contact": profile.preferred_contact,
            "is_active": profile.is_active,
            "is_featured": profile.is_featured,
            "total_projects_completed": profile.total_projects_completed,
            "average_rating": profile.average_rating,
            "beta_score": user.beta_score,
            "reading_score": user.reading_score,
            "writer_score": user.writer_score,
            "has_beta_master_badge": any(b.badge_type == "BETA_MASTER" for b in badges),
            "has_author_badge": any(b.badge_type == "AUTHOR" for b in badges),
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }
        enriched_profiles.append(profile_dict)
    
    return {
        "profiles": enriched_profiles,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/{user_id}", response_model=BetaReaderProfileResponse)
def get_profile_by_user_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific user's beta reader profile (public view)"""
    profile = db.query(BetaReaderProfile).filter(
        and_(
            BetaReaderProfile.user_id == user_id,
            BetaReaderProfile.is_active == True
        )
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Enrich with user data and badges
    user = db.query(User).filter(User.id == user_id).first()
    badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    
    profile_dict = {
        "id": profile.id,
        "user_id": profile.user_id,
        "username": user.username or user.email,
        "display_name": user.display_name or user.username or user.email,
        "availability": profile.availability,
        "bio": profile.bio,
        "genres": profile.genres,
        "specialties": profile.specialties,
        "hourly_rate": profile.hourly_rate,
        "per_word_rate": profile.per_word_rate,
        "per_manuscript_rate": profile.per_manuscript_rate,
        "turnaround_days": profile.turnaround_days,
        "max_concurrent_projects": profile.max_concurrent_projects,
        "portfolio_links": profile.portfolio_links,
        "preferred_contact": profile.preferred_contact,
        "is_active": profile.is_active,
        "is_featured": profile.is_featured,
        "total_projects_completed": profile.total_projects_completed,
        "average_rating": profile.average_rating,
        "beta_score": user.beta_score,
        "reading_score": user.reading_score,
        "writer_score": user.writer_score,
        "has_beta_master_badge": any(b.badge_type == "BETA_MASTER" for b in badges),
        "has_author_badge": any(b.badge_type == "AUTHOR" for b in badges),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }
    
    return BetaReaderProfileResponse(**profile_dict)
