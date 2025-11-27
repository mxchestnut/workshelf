"""
Beta Reader Appointment API
Allows writers to appoint beta readers and release documents to them
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any, List
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service
from app.models.collaboration import BetaReaderAppointment, BetaRelease
from app.models.document import Document
from app.models.user import User
from app.schemas.beta_appointment import (
    BetaReaderAppointmentCreate,
    BetaReaderAppointmentUpdate,
    BetaReaderAppointmentResponse,
    BetaReleaseCreate,
    BetaReleaseUpdate,
    BetaReleaseResponse
)

router = APIRouter(prefix="/beta-appointments", tags=["beta-appointments"])


@router.get("/my-beta-readers", response_model=List[BetaReaderAppointmentResponse])
async def get_my_beta_readers(
    active_only: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all beta readers appointed by the current user (writer)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    query = select(BetaReaderAppointment).where(
        BetaReaderAppointment.writer_id == user.id
    )
    
    if active_only:
        query = query.where(BetaReaderAppointment.status == 'active')
    
    query = query.order_by(BetaReaderAppointment.created_at.desc())
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Enrich with beta reader details
    response = []
    for appointment in appointments:
        reader_result = await db.execute(
            select(User).where(User.id == appointment.beta_reader_id)
        )
        reader = reader_result.scalar_one_or_none()
        
        app_dict = {
            **appointment.__dict__,
            'beta_reader_username': reader.username if reader else None,
            'beta_reader_display_name': reader.display_name if reader else None
        }
        response.append(BetaReaderAppointmentResponse(**app_dict))
    
    return response


@router.get("/my-writers", response_model=List[BetaReaderAppointmentResponse])
async def get_my_writers(
    active_only: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all writers who have appointed the current user as a beta reader."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    query = select(BetaReaderAppointment).where(
        BetaReaderAppointment.beta_reader_id == user.id
    )
    
    if active_only:
        query = query.where(BetaReaderAppointment.status == 'active')
    
    query = query.order_by(BetaReaderAppointment.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=BetaReaderAppointmentResponse, status_code=status.HTTP_201_CREATED)
async def appoint_beta_reader(
    appointment_data: BetaReaderAppointmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Appoint a beta reader (writer only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check if appointment already exists
    existing_result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.writer_id == user.id,
                BetaReaderAppointment.beta_reader_id == appointment_data.beta_reader_id
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        # Reactivate if inactive
        if existing.status != 'active':
            existing.status = 'active'
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            raise HTTPException(status_code=400, detail="Beta reader already appointed")
    
    # Create new appointment
    appointment = BetaReaderAppointment(
        writer_id=user.id,
        beta_reader_id=appointment_data.beta_reader_id,
        appointment_title=appointment_data.appointment_title,
        notes=appointment_data.notes
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    return appointment


@router.patch("/{appointment_id}", response_model=BetaReaderAppointmentResponse)
async def update_appointment(
    appointment_id: int,
    appointment_data: BetaReaderAppointmentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update appointment details (writer only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get appointment
    result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.id == appointment_id,
                BetaReaderAppointment.writer_id == user.id
            )
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Update fields
    update_data = appointment_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appointment, field, value)
    
    await db.commit()
    await db.refresh(appointment)
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_appointment(
    appointment_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a beta reader appointment (writer only)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.id == appointment_id,
                BetaReaderAppointment.writer_id == user.id
            )
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Soft delete by setting status to removed
    appointment.status = 'removed'
    await db.commit()
    
    return None


# ============================================================================
# Beta Release Endpoints
# ============================================================================

@router.post("/{appointment_id}/releases", response_model=BetaReleaseResponse, status_code=status.HTTP_201_CREATED)
async def release_document(
    appointment_id: int,
    release_data: BetaReleaseCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Release a document to an appointed beta reader."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify appointment exists and user is the writer
    appointment_result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.id == appointment_id,
                BetaReaderAppointment.writer_id == user.id,
                BetaReaderAppointment.status == 'active'
            )
        )
    )
    appointment = appointment_result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or inactive")
    
    # Verify document exists and user owns it
    doc_result = await db.execute(
        select(Document).where(
            and_(
                Document.id == release_data.document_id,
                Document.owner_id == user.id
            )
        )
    )
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or not owned by you")
    
    # Create release
    release = BetaRelease(
        appointment_id=appointment_id,
        document_id=release_data.document_id,
        release_message=release_data.release_message,
        deadline=release_data.deadline
    )
    
    db.add(release)
    
    # Update appointment stats
    appointment.releases_count += 1
    
    await db.commit()
    await db.refresh(release)
    
    return release


@router.get("/my-feed", response_model=List[BetaReleaseResponse])
async def get_my_beta_feed(
    status_filter: str = None,  # unread, reading, completed
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all documents released to me as a beta reader (my feed)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get all active appointments where user is the beta reader
    appointments_result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.beta_reader_id == user.id,
                BetaReaderAppointment.status == 'active'
            )
        )
    )
    appointments = appointments_result.scalars().all()
    appointment_ids = [a.id for a in appointments]
    
    if not appointment_ids:
        return []
    
    # Get releases for these appointments
    query = select(BetaRelease).where(
        BetaRelease.appointment_id.in_(appointment_ids)
    )
    
    if status_filter:
        query = query.where(BetaRelease.status == status_filter)
    
    query = query.order_by(BetaRelease.release_date.desc())
    
    result = await db.execute(query)
    releases = result.scalars().all()
    
    # Enrich with document and writer details
    response = []
    for release in releases:
        doc_result = await db.execute(
            select(Document).where(Document.id == release.document_id)
        )
        document = doc_result.scalar_one_or_none()
        
        writer_result = await db.execute(
            select(User).where(User.id == document.owner_id if document else None)
        )
        writer = writer_result.scalar_one_or_none()
        
        release_dict = {
            **release.__dict__,
            'document_title': document.title if document else None,
            'document_word_count': document.word_count if document else None,
            'writer_username': writer.username if writer else None,
            'writer_display_name': writer.display_name if writer else None
        }
        response.append(BetaReleaseResponse(**release_dict))
    
    return response


@router.patch("/releases/{release_id}", response_model=BetaReleaseResponse)
async def update_release_status(
    release_id: int,
    release_data: BetaReleaseUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update release status (beta reader marks as reading/completed)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Get release and verify user is the beta reader
    release_result = await db.execute(
        select(BetaRelease).where(BetaRelease.id == release_id)
    )
    release = release_result.scalar_one_or_none()
    
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Verify user is the beta reader for this appointment
    appointment_result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.id == release.appointment_id,
                BetaReaderAppointment.beta_reader_id == user.id
            )
        )
    )
    appointment = appointment_result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=403, detail="Not authorized to update this release")
    
    # Update fields
    update_data = release_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(release, field, value)
    
    # Set timestamps based on status changes
    if release_data.status == 'reading' and not release.started_reading_at:
        release.started_reading_at = datetime.utcnow()
    elif release_data.status == 'completed' and not release.completed_reading_at:
        release.completed_reading_at = datetime.utcnow()
        # Update appointment stats
        appointment.completed_reads += 1
    
    if release_data.feedback_submitted and not release.feedback_submitted_at:
        release.feedback_submitted_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(release)
    
    return release


@router.get("/{appointment_id}/releases", response_model=List[BetaReleaseResponse])
async def get_appointment_releases(
    appointment_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all releases for a specific appointment (writer or beta reader can view)."""
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Verify user is either the writer or beta reader
    appointment_result = await db.execute(
        select(BetaReaderAppointment).where(
            and_(
                BetaReaderAppointment.id == appointment_id,
                (BetaReaderAppointment.writer_id == user.id) | (BetaReaderAppointment.beta_reader_id == user.id)
            )
        )
    )
    appointment = appointment_result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or not authorized")
    
    # Get releases
    result = await db.execute(
        select(BetaRelease)
        .where(BetaRelease.appointment_id == appointment_id)
        .order_by(BetaRelease.release_date.desc())
    )
    
    return result.scalars().all()
