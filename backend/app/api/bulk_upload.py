"""
Bulk Document Upload API
Supports Obsidian vault imports, multiple markdown files, and folder structures
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List
import zipfile
import io
import os
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service

router = APIRouter(prefix="/storage", tags=["bulk-upload", "storage"])


STORAGE_TIERS = {
    "free": 104857600,        # 100 MB
    "basic": 1073741824,      # 1 GB
    "pro": 10737418240,       # 10 GB
    "enterprise": 107374182400 # 100 GB
}


async def get_user_storage(db: AsyncSession, user_id: int) -> dict:
    """Get user's current storage usage and limit"""
    result = await db.execute(
        text("SELECT storage_used_bytes, storage_limit_bytes, subscription_tier FROM users WHERE id = :user_id"),
        {"user_id": user_id}
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "used": row[0] or 0,
        "limit": row[1] or STORAGE_TIERS["free"],
        "tier": row[2] or "free",
        "available": (row[1] or STORAGE_TIERS["free"]) - (row[0] or 0)
    }


async def update_user_storage(db: AsyncSession, user_id: int, bytes_delta: int):
    """Update user's storage usage"""
    await db.execute(
        text("UPDATE users SET storage_used_bytes = storage_used_bytes + :delta WHERE id = :user_id"),
        {"delta": bytes_delta, "user_id": user_id}
    )
    await db.commit()


@router.post("/bulk-upload")
async def bulk_upload_documents(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    folder_id: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk upload documents from a zip file or multiple markdown files.
    Supports Obsidian vault structure with folders and metadata.
    
    Returns import summary with created documents and any errors.
    """
    
    # Get or create user in database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check storage quota
    storage = await get_user_storage(db, user.id)
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    if file_size > storage["available"]:
        return {
            "success": False,
            "error": "storage_quota_exceeded",
            "message": f"Upload size ({file_size:,} bytes) exceeds available storage ({storage['available']:,} bytes)",
            "storage": storage
        }
    
    imported_docs = []
    errors = []
    total_bytes = 0
    
    try:
        # Handle zip file
        if file.filename.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(content)) as zip_ref:
                # Get all markdown files from zip
                md_files = [f for f in zip_ref.namelist() if f.endswith(('.md', '.markdown')) and not f.startswith('__MACOSX')]
                
                for file_path in md_files:
                    try:
                        # Read file content
                        file_content = zip_ref.read(file_path).decode('utf-8', errors='ignore')
                        file_size_bytes = len(file_content.encode('utf-8'))
                        
                        # Extract metadata from Obsidian-style frontmatter
                        title, clean_content = parse_frontmatter(file_content, file_path)
                        
                        # Determine folder structure
                        folder_name = os.path.dirname(file_path)
                        
                        # Create document
                        word_count = len(clean_content.split())
                        
                        result = await db.execute(
                            text("""
                                INSERT INTO documents (
                                    owner_id, tenant_id, project_id,
                                    title, content, word_count, file_size,
                                    status, visibility, current_version,
                                    created_at, updated_at
                                )
                                VALUES (
                                    :owner_id, :tenant_id, :project_id,
                                    :title, :content, :word_count, :file_size,
                                    'DRAFT', 'PRIVATE', 1,
                                    :now, :now
                                )
                                RETURNING id, title
                            """),
                            {
                                "owner_id": user.id,
                                "tenant_id": user.tenant_id,
                                "project_id": project_id,
                                "title": title,
                                "content": clean_content,
                                "word_count": word_count,
                                "file_size": file_size_bytes,
                                "now": datetime.utcnow()
                            }
                        )
                        
                        doc = result.first()
                        imported_docs.append({
                            "id": doc[0],
                            "title": doc[1],
                            "path": file_path,
                            "size": file_size_bytes,
                            "words": word_count
                        })
                        total_bytes += file_size_bytes
                        
                    except Exception as e:
                        errors.append({
                            "file": file_path,
                            "error": str(e)
                        })
        
        # Handle single markdown file
        elif file.filename.endswith(('.md', '.markdown')):
            file_content = content.decode('utf-8', errors='ignore')
            file_size_bytes = len(content)
            
            title, clean_content = parse_frontmatter(file_content, file.filename)
            word_count = len(clean_content.split())
            
            result = await db.execute(
                text("""
                    INSERT INTO documents (
                        owner_id, tenant_id, project_id,
                        title, content, word_count, file_size,
                        status, visibility, current_version,
                        created_at, updated_at
                    )
                    VALUES (
                        :owner_id, :tenant_id, :project_id,
                        :title, :content, :word_count, :file_size,
                        'DRAFT', 'PRIVATE', 1,
                        :now, :now
                    )
                    RETURNING id, title
                """),
                {
                    "owner_id": user.id,
                    "tenant_id": user.tenant_id,
                    "project_id": project_id,
                    "title": title,
                    "content": clean_content,
                    "word_count": word_count,
                    "file_size": file_size_bytes,
                    "now": datetime.utcnow()
                }
            )
            
            doc = result.first()
            imported_docs.append({
                "id": doc[0],
                "title": doc[1],
                "size": file_size_bytes,
                "words": word_count
            })
            total_bytes += file_size_bytes
        
        else:
            raise HTTPException(status_code=400, detail="Only .zip, .md, or .markdown files are supported")
        
        # Update storage usage
        if total_bytes > 0:
            await update_user_storage(db, user.id, total_bytes)
        
        await db.commit()
        
        # Get updated storage info
        updated_storage = await get_user_storage(db, user.id)
        
        return {
            "success": True,
            "imported": len(imported_docs),
            "documents": imported_docs,
            "errors": errors,
            "total_bytes": total_bytes,
            "storage": updated_storage
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


def parse_frontmatter(content: str, filename: str) -> tuple[str, str]:
    """
    Parse Obsidian-style YAML frontmatter and extract title.
    Returns (title, clean_content)
    """
    lines = content.split('\n')
    
    # Check for frontmatter
    if lines and lines[0].strip() == '---':
        # Find end of frontmatter
        end_idx = None
        title = None
        
        for i, line in enumerate(lines[1:], 1):
            if line.strip() == '---':
                end_idx = i
                break
            # Extract title from frontmatter
            if line.startswith('title:'):
                title = line.split(':', 1)[1].strip().strip('"\'')
        
        if end_idx:
            # Remove frontmatter from content
            clean_content = '\n'.join(lines[end_idx + 1:]).strip()
            
            # Use frontmatter title if found, otherwise derive from filename or first heading
            if not title:
                title = derive_title_from_content(clean_content, filename)
            
            return title, clean_content
    
    # No frontmatter - derive title and return full content
    title = derive_title_from_content(content, filename)
    return title, content


def derive_title_from_content(content: str, filename: str) -> str:
    """Extract title from first heading or use filename"""
    lines = content.split('\n')
    
    # Look for first markdown heading
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('#'):
            return stripped.lstrip('#').strip()
    
    # Use filename without extension
    return os.path.splitext(os.path.basename(filename))[0].replace('_', ' ').replace('-', ' ').title()


@router.get("/info")
async def get_storage_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's storage usage and limits"""
    # Get or create user in database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    storage = await get_user_storage(db, user.id)
    
    return {
        "used_bytes": storage["used"],
        "limit_bytes": storage["limit"],
        "available_bytes": storage["available"],
        "used_formatted": format_bytes(storage["used"]),
        "limit_formatted": format_bytes(storage["limit"]),
        "available_formatted": format_bytes(storage["available"]),
        "usage_percentage": (storage["used"] / storage["limit"] * 100) if storage["limit"] > 0 else 0,
        "tier": storage["tier"],
        "tiers_available": {
            "free": {"limit": STORAGE_TIERS["free"], "formatted": "100 MB", "price": "$0/mo"},
            "basic": {"limit": STORAGE_TIERS["basic"], "formatted": "1 GB", "price": "$5/mo"},
            "pro": {"limit": STORAGE_TIERS["pro"], "formatted": "10 GB", "price": "$15/mo"},
            "enterprise": {"limit": STORAGE_TIERS["enterprise"], "formatted": "100 GB", "price": "$50/mo"}
        }
    }


def format_bytes(bytes_val: int) -> str:
    """Format bytes to human-readable string"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} PB"
