"""Sharing API - Document share links"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.azure_auth import get_current_user
from app.services import user_service
from app.schemas.social import ShareLinkCreate, ShareLinkResponse, ShareLinkUpdate, ShareLinkAccessRequest
from app.schemas.document import DocumentResponse
from app.services.sharing_service import SharingService
from app.models.document import Document

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("/documents/{document_id}/share", response_model=ShareLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_share_link(document_id: int, share_data: ShareLinkCreate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    result = await db.execute(select(Document).filter(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to share this document")
    
    return await SharingService.create_share_link(db, document_id, user.id, share_data.password, share_data.expires_at, share_data.allow_downloads, share_data.allow_comments)


@router.get("/share/{token}", response_model=DocumentResponse)
async def access_shared_document(token: str, db: AsyncSession = Depends(get_db)):
    document, error = await SharingService.access_share_link(db, token, None)
    if error:
        raise HTTPException(status_code=403, detail=error)
    return document


@router.put("/share/{token}", response_model=ShareLinkResponse)
async def update_share_link(token: str, update_data: ShareLinkUpdate, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    share_link = await SharingService.update_share_link(db, token, user.id, update_data.expires_at, update_data.is_active, update_data.allow_downloads, update_data.allow_comments)
    if not share_link:
        raise HTTPException(status_code=404, detail="Share link not found or you don't have permission")
    return share_link


@router.delete("/share/{token}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share_link(token: str, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    if not await SharingService.delete_share_link(db, token, user.id):
        raise HTTPException(status_code=404, detail="Share link not found or you don't have permission")


@router.get("/documents/{document_id}/shares", response_model=List[ShareLinkResponse])
async def get_document_share_links(document_id: int, current_user: Dict[str, Any] = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    result = await db.execute(select(Document).filter(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.owner_id != user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to view this document's share links")
    
    return await SharingService.get_document_share_links(db, document_id, user.id)
