"""
Store Service - Publishing documents to the WorkShelf marketplace
"""
import json
import os
import boto3
from botocore.exceptions import ClientError
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.document import Document, DocumentStatus
from app.models.store import StoreItem, StoreItemStatus
from app.models.user import User
from app.services.epub_generation_service import EpubGenerationService
from app.core.config import settings


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
    
    # Upload EPUB to AWS S3
    epub_blob_url = await _upload_epub_to_s3(
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


async def _upload_epub_to_s3(epub_path: str, file_hash: str) -> str:
    """Upload generated EPUB to AWS S3"""
    if not settings.S3_ACCESS_KEY_ID_CLEAN or not settings.S3_SECRET_ACCESS_KEY_CLEAN:
        raise HTTPException(status_code=500, detail="S3 storage not configured")
    
    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID_CLEAN,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY_CLEAN,
        region_name=settings.S3_REGION
    )
    
    bucket_name = settings.S3_BUCKET_NAME
    
    # Ensure bucket exists
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=bucket_name)
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Failed to create S3 bucket: {e}")
    
    # Upload to S3
    object_key = f"published-books/{file_hash}.epub"
    
    with open(epub_path, 'rb') as epub_file:
        s3_client.upload_fileobj(
            epub_file,
            bucket_name,
            object_key,
            ExtraArgs={
                'ContentType': 'application/epub+zip',
                'ContentDisposition': 'inline'
            }
        )
    
    # Generate public URL
    if settings.S3_ENDPOINT_URL:
        # Custom endpoint (MinIO, etc.)
        url = f"{settings.S3_ENDPOINT_URL}/{bucket_name}/{object_key}"
    else:
        # AWS S3
        url = f"https://{bucket_name}.s3.{settings.S3_REGION}.amazonaws.com/{object_key}"
    
    return url
