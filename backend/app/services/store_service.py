"""
Store Service - Publishing documents to the WorkShelf marketplace
"""
import json
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from azure.storage.blob import BlobServiceClient, ContentSettings

from app.models.document import Document, DocumentStatus
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User
from app.services.epub_generation_service import EpubGenerationService


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
    
    # Get user info for author name
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one()
    author_name = user.display_name or user.username or f"User {user_id}"
    
    # Generate EPUB from document content
    epub_info = await EpubGenerationService.generate_epub(
        title=document.title,
        author=author_name,
        content=document.content,
        description=description or document.description,
        language="en"
    )
    
    # Upload EPUB to Azure Blob Storage
    epub_blob_url = await _upload_epub_to_blob(
        epub_path=epub_info["epub_path"],
        file_hash=epub_info["file_hash"]
    )
    
    if existing_store_item:
        # Update existing store item
        existing_store_item.price_usd = price_usd
        existing_store_item.description = description or document.description
        existing_store_item.genres = genres
        existing_store_item.status = StoreItemStatus.ACTIVE
        existing_store_item.epub_blob_url = epub_blob_url
        existing_store_item.file_hash = epub_info["file_hash"]
        existing_store_item.file_size_bytes = epub_info["file_size"]
        existing_store_item.updated_at = datetime.now(timezone.utc)
        
        store_item = existing_store_item
    else:
        # Create new store item
        store_item = StoreItem(
            title=document.title,
            author_name=author_name,
            description=description or document.description,
            long_description=description or document.description,
            genres=genres,
            price_usd=price_usd,
            currency="USD",
            seller_id=user_id,
            status=StoreItemStatus.ACTIVE,
            epub_blob_url=epub_blob_url,
            file_hash=epub_info["file_hash"],
            file_size_bytes=epub_info["file_size"],
            language="en",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(store_item)
    
    # Clean up temporary EPUB file
    try:
        os.remove(epub_info["epub_path"])
    except:
        pass
    
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


async def _upload_epub_to_blob(epub_path: str, file_hash: str) -> str:
    """Upload generated EPUB to Azure Blob Storage"""
    connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    if not connection_string:
        raise HTTPException(status_code=500, detail="Azure Storage not configured")
    
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)
    container_name = "published-books"
    
    # Ensure container exists
    try:
        container_client = blob_service_client.get_container_client(container_name)
        container_client.create_container()
    except:
        pass  # Container already exists
    
    # Upload blob
    blob_name = f"{file_hash}.epub"
    blob_client = blob_service_client.get_blob_client(
        container=container_name,
        blob=blob_name
    )
    
    with open(epub_path, 'rb') as epub_file:
        blob_client.upload_blob(
            epub_file,
            overwrite=True,
            content_settings=ContentSettings(content_type="application/epub+zip")
        )
    
    return blob_client.url
