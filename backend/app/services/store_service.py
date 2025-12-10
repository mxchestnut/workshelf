"""
Store Service - Publishing documents to the WorkShelf marketplace
"""
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.document import Document, DocumentStatus
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User


async def publish_document_to_store(
    db: AsyncSession,
    document_id: int,
    user_id: int,
    price_usd: float,
    description: Optional[str] = None,
    genres: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Publish a document to the WorkShelf store
    
    1. Fetch the document
    2. Verify ownership
    3. Create or update StoreItem
    4. Update document status to 'published'
    5. Generate EPUB (TODO: implement EPUB conversion service)
    
    Returns:
        Dict with store_item_id, status, and epub_url
    """
    # Fetch document
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify ownership
    if document.owner_id != user_id:
        raise HTTPException(status_code=403, detail="You don't own this document")
    
    # Check if document is already published (has a store item)
    result = await db.execute(
        select(StoreItem).where(
            StoreItem.title == document.title,
            StoreItem.seller_id == user_id
        )
    )
    existing_store_item = result.scalar_one_or_none()
    
    if existing_store_item:
        # Update existing store item
        existing_store_item.price_usd = price_usd
        existing_store_item.description = description or document.description
        existing_store_item.genres = genres
        existing_store_item.status = StoreItemStatus.ACTIVE
        existing_store_item.updated_at = datetime.now(timezone.utc)
        
        store_item = existing_store_item
    else:
        # Get user info for author name
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        
        # Create new store item
        store_item = StoreItem(
            title=document.title,
            author_name=user.display_name or user.username or f"User {user_id}",
            description=description or document.description,
            long_description=description or document.description,
            genres=genres,
            price_usd=price_usd,
            currency="USD",
            seller_id=user_id,
            status=StoreItemStatus.ACTIVE,
            # TODO: Generate EPUB and upload to blob storage
            # epub_blob_url=...,
            # cover_blob_url=...,
            # file_hash=...,
            # file_size_bytes=...,
            language="en",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(store_item)
    
    # Update document status to published
    document.status = DocumentStatus.PUBLISHED
    document.published_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(store_item)
    await db.refresh(document)
    
    return {
        "store_item_id": store_item.id,
        "document_id": document.id,
        "status": "published",
        "title": store_item.title,
        "price_usd": float(store_item.price_usd),
        "is_free": store_item.price_usd == 0,
        "epub_url": store_item.epub_blob_url,
        "published_at": document.published_at.isoformat() if document.published_at else None,
        "message": "Document published successfully! It is now available in the WorkShelf store."
    }
