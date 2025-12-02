"""
Bulk Document Upload API
Supports Obsidian vault imports, multiple markdown files, and folder structures
"""
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, List
import ast
import zipfile
import io
import os
import json
import re
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import user_service

router = APIRouter(prefix="/storage", tags=["bulk-upload", "storage"])

# Security configurations
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB per upload
MAX_ZIP_ENTRIES = 1000  # Max files in a zip
MAX_FILENAME_LENGTH = 255
ALLOWED_EXTENSIONS = {'.md', '.markdown'}
BLOCKED_FILENAMES = {'__MACOSX', '.DS_Store', 'thumbs.db', 'desktop.ini'}

def is_safe_path(path: str) -> bool:
    """Check if path is safe (no directory traversal, no absolute paths)"""
    # Normalize path and check for suspicious patterns
    normalized = os.path.normpath(path)
    
    # Block absolute paths
    if os.path.isabs(normalized):
        return False
    
    # Block directory traversal attempts
    if '..' in normalized or normalized.startswith('/'):
        return False
    
    # Block hidden files and system files
    parts = normalized.split(os.sep)
    for part in parts:
        if part.startswith('.') or part.lower() in BLOCKED_FILENAMES:
            return False
    
    return True

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent injection attacks"""
    # Remove directory components
    filename = os.path.basename(filename)
    
    # Remove null bytes and control characters
    filename = ''.join(c for c in filename if ord(c) > 31 and c not in '<>:"|?*')
    
    # Limit length
    if len(filename) > MAX_FILENAME_LENGTH:
        name, ext = os.path.splitext(filename)
        filename = name[:MAX_FILENAME_LENGTH - len(ext)] + ext
    
    return filename

def validate_markdown_content(content: str) -> bool:
    """Basic validation that content appears to be text/markdown"""
    # Check for null bytes (binary files)
    if '\x00' in content:
        return False
    
    # Check for excessive non-printable characters
    non_printable = sum(1 for c in content if ord(c) < 32 and c not in '\n\r\t')
    if non_printable > len(content) * 0.1:  # More than 10% non-printable
        return False
    
    return True


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
    files: List[UploadFile] = File(...),
    project_id: Optional[int] = Form(None),
    file_paths: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk upload documents from zip file, multiple markdown files, or folder structures.
    Supports Obsidian vault structure with folders and metadata.
    
    Security measures:
    - File size limits (100 MB per upload)
    - Extension whitelist (.md, .markdown only)
    - Path traversal prevention
    - Filename sanitization
    - Content validation (text-only)
    - Zip bomb protection (max 1000 entries)
    
    Returns import summary with created documents and any errors.
    """
    
    # Get or create user in database
    user = await user_service.get_or_create_user_from_keycloak(db, current_user)
    
    # Check storage quota
    storage = await get_user_storage(db, user.id)
    
    # Parse file paths if provided (for folder uploads)
    path_map = {}
    if file_paths:
        try:
            import json
            path_map = json.loads(file_paths)
        except:
            pass
    
    imported_docs = []
    errors = []
    total_bytes = 0
    
    try:
        # Handle zip file (single file mode)
        if len(files) == 1 and files[0].filename.endswith('.zip'):
            file = files[0]
            content = await file.read()
            file_size = len(content)
            
            # Security: Check max file size
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024:.0f} MB"
                )
            
            # Security: Validate file extension
            file_ext = os.path.splitext(file.filename)[1].lower()
            if file_ext not in ALLOWED_EXTENSIONS and file_ext != '.zip':
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type. Only .md, .markdown, and .zip files are allowed"
                )
            
            if file_size > storage["available"]:
                return {
                    "success": False,
                    "error": "storage_quota_exceeded",
                    "message": f"Upload size ({file_size:,} bytes) exceeds available storage ({storage['available']:,} bytes)",
                    "storage": storage
                }
            
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as zip_ref:
                    # Security: Check for zip bombs (too many entries)
                    if len(zip_ref.namelist()) > MAX_ZIP_ENTRIES:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Zip file contains too many entries. Maximum is {MAX_ZIP_ENTRIES}"
                        )
                    
                    # Get all markdown files from zip
                    md_files = []
                    for f in zip_ref.namelist():
                        # Security: Validate path safety
                        if not is_safe_path(f):
                            errors.append(f"Skipped unsafe path: {f}")
                            continue
                        
                        # Security: Check file extension
                        if f.endswith(('.md', '.markdown')) and not os.path.basename(f).startswith('.'):
                            md_files.append(f)
                    
                    # Sort files to process them in a predictable order
                    md_files.sort()
                    
                    # Track created folders/projects by path
                    folder_to_project = {}
                    folder_id_map = {}  # Maps folder path to folder ID
                    
                    print(f"[BULK UPLOAD] Processing {len(md_files)} markdown files from zip")
                    
                    # First pass: Create all unique folders from directory structure
                    unique_folders = set()
                    for file_path in md_files:
                        folder_path = os.path.dirname(file_path)
                        if folder_path:
                            # Add all parent folders too (for nested structure)
                            parts = folder_path.split('/')
                            for i in range(len(parts)):
                                folder_path_segment = '/'.join(parts[:i+1])
                                # Skip macOS metadata folders
                                if '__MACOSX' not in folder_path_segment and not any(p.startswith('.') for p in folder_path_segment.split('/')):
                                    unique_folders.add(folder_path_segment)
                    
                    # Sort folders by depth (parents before children)
                    sorted_folders = sorted(unique_folders, key=lambda x: x.count('/'))
                    
                    print(f"[BULK UPLOAD] Found {len(sorted_folders)} unique folders to create")
                    
                    # Create folder records
                    for folder_path in sorted_folders:
                        parts = folder_path.split('/')
                        folder_name = parts[-1]
                        parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
                        parent_id = folder_id_map.get(parent_path) if parent_path else None
                        
                        # Create folder record
                        folder_result = await db.execute(
                            text("""
                                INSERT INTO folders (
                                    user_id, tenant_id, name, parent_id, created_at, updated_at
                                )
                                VALUES (:user_id, :tenant_id, :name, :parent_id, :now, :now)
                                RETURNING id
                            """),
                            {
                                "user_id": user.id,
                                "tenant_id": user.tenant_id,
                                "name": folder_name,
                                "parent_id": parent_id,
                                "now": datetime.utcnow()
                            }
                        )
                        new_folder = folder_result.first()
                        folder_id_map[folder_path] = new_folder[0]
                        print(f"[BULK UPLOAD] Created folder '{folder_name}' (path: {folder_path}) with ID {new_folder[0]}")
                    
                    # Process each markdown file
                    for file_path in md_files:
                        try:
                            # Security: Sanitize filename
                            safe_filename = sanitize_filename(os.path.basename(file_path))
                            
                            # Read file content
                            raw_content = zip_ref.read(file_path)
                            
                            # Security: Check for excessive size (decompression bomb)
                            if len(raw_content) > MAX_FILE_SIZE:
                                errors.append(f"Skipped {safe_filename}: File too large after decompression")
                                continue
                            
                            # Decode content
                            try:
                                file_content = raw_content.decode('utf-8')
                            except UnicodeDecodeError:
                                errors.append(f"Skipped {safe_filename}: Not a valid text file")
                                continue
                            
                            # Security: Validate content is actually text/markdown
                            if not validate_markdown_content(file_content):
                                errors.append(f"Skipped {safe_filename}: Content validation failed")
                                continue
                            
                            file_size_bytes = len(file_content.encode('utf-8'))
                            
                            # Extract metadata from Obsidian-style frontmatter
                            title, clean_content = parse_frontmatter(file_content, safe_filename)
                            
                            # Convert markdown to TipTap JSON format
                            tiptap_content = markdown_to_tiptap(clean_content)
                            
                            # Handle folder structure - create project from top-level folder
                            folder_path = os.path.dirname(file_path)
                            target_project_id = project_id  # Use provided project_id if given
                            target_folder_id = None
                            
                            # Get folder_id from the path
                            if folder_path and folder_path in folder_id_map:
                                target_folder_id = folder_id_map[folder_path]
                            
                            if folder_path and not project_id:
                                # Get the top-level folder name (first component of path)
                                folder_parts = folder_path.split('/')
                                top_folder = folder_parts[0] if folder_parts else None
                                
                                if top_folder:
                                    # Create or reuse project for this folder
                                    if top_folder not in folder_to_project:
                                        # Create new project for this folder
                                        project_result = await db.execute(
                                            text("""
                                                INSERT INTO projects (
                                                    user_id, tenant_id, title, project_type,
                                                    description, current_word_count, created_at, updated_at
                                                )
                                                VALUES (
                                                    :user_id, :tenant_id, :title, 'novel',
                                                    :description, 0, :now, :now
                                                )
                                                RETURNING id
                                            """),
                                            {
                                                "user_id": user.id,
                                                "tenant_id": user.tenant_id,
                                                "title": top_folder,
                                                "description": f"Imported from {file.filename}",
                                                "now": datetime.utcnow()
                                            }
                                        )
                                        new_project = project_result.first()
                                        folder_to_project[top_folder] = new_project[0]
                                        print(f"[BULK UPLOAD] Created project '{top_folder}' with ID {new_project[0]}")
                                    
                                    target_project_id = folder_to_project[top_folder]
                            
                            # Create document
                            word_count = len(clean_content.split())
                            
                            result = await db.execute(
                                text("""
                                    INSERT INTO documents (
                                        owner_id, tenant_id, project_id, folder_id,
                                        title, content, word_count, file_size,
                                        status, visibility, current_version,
                                        created_at, updated_at
                                    )
                                    VALUES (
                                        :owner_id, :tenant_id, :project_id, :folder_id,
                                        :title, :content, :word_count, :file_size,
                                        'DRAFT', 'PRIVATE', 1,
                                        :now, :now
                                    )
                                    RETURNING id, title
                                """),
                                {
                                    "owner_id": user.id,
                                    "tenant_id": user.tenant_id,
                                    "project_id": target_project_id,
                                    "folder_id": target_folder_id,
                                    "title": title,
                                    "content": json.dumps(tiptap_content),
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
                                "folder": folder_path or "root",
                                "folder_id": target_folder_id,
                                "project_id": target_project_id,
                                "size": file_size_bytes,
                                "words": word_count
                            })
                            total_bytes += file_size_bytes
                            
                        except Exception as e:
                            print(f"[BULK UPLOAD] Error processing {file_path}: {str(e)}")
                            errors.append({
                                "file": file_path,
                                "error": str(e)
                            })
            
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Invalid or corrupted zip file")
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error reading zip file: {str(e)}")
        
        # Handle single markdown file
        elif file.filename.endswith(('.md', '.markdown')):
            # Security: Sanitize filename
            safe_filename = sanitize_filename(file.filename)
            
            # Decode content
            try:
                file_content = content.decode('utf-8')
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="File is not a valid text file")
            
            # Security: Validate content
            if not validate_markdown_content(file_content):
                raise HTTPException(status_code=400, detail="Content validation failed")
            
            file_size_bytes = len(content)
            
            title, clean_content = parse_frontmatter(file_content, safe_filename)
            
            # Convert markdown to TipTap JSON format
            tiptap_content = markdown_to_tiptap(clean_content)
            
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
                    "content": json.dumps(tiptap_content),
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
        
        # Handle multiple files (folder upload)
        elif len(files) > 1 and file_paths:
            # Parse the file paths mapping
            import json
            path_map = json.loads(file_paths)
            
            print(f"[BULK UPLOAD] Processing {len(files)} files from folder upload")
            
            # First pass: Create all unique folders from file paths
            unique_folders = set()
            for idx, file_obj in enumerate(files):
                relative_path = path_map.get(str(idx), file_obj.filename)
                folder_path = os.path.dirname(relative_path)
                if folder_path:
                    # Add all parent folders
                    parts = folder_path.split('/')
                    for i in range(len(parts)):
                        folder_path_segment = '/'.join(parts[:i+1])
                        # Skip macOS metadata folders
                        if '__MACOSX' not in folder_path_segment and not any(p.startswith('.') for p in folder_path_segment.split('/')):
                            unique_folders.add(folder_path_segment)
            
            # Sort folders by depth (parents before children)
            sorted_folders = sorted(unique_folders, key=lambda x: x.count('/'))
            folder_id_map = {}
            
            print(f"[BULK UPLOAD] Found {len(sorted_folders)} unique folders to create")
            
            # Create folder records
            for folder_path in sorted_folders:
                parts = folder_path.split('/')
                folder_name = parts[-1]
                parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
                parent_id = folder_id_map.get(parent_path) if parent_path else None
                
                folder_result = await db.execute(
                    text("""
                        INSERT INTO folders (
                            user_id, tenant_id, name, parent_id, created_at, updated_at
                        )
                        VALUES (:user_id, :tenant_id, :name, :parent_id, :now, :now)
                        RETURNING id
                    """),
                    {
                        "user_id": user.id,
                        "tenant_id": user.tenant_id,
                        "name": folder_name,
                        "parent_id": parent_id,
                        "now": datetime.utcnow()
                    }
                )
                folder_id = folder_result.scalar_one()
                folder_id_map[folder_path] = folder_id
                print(f"[BULK UPLOAD] Created folder: {folder_path} (id={folder_id}, parent_id={parent_id})")
            
            # Second pass: Process each file
            for idx, file_obj in enumerate(files):
                try:
                    relative_path = path_map.get(str(idx), file_obj.filename)
                    
                    # Skip non-markdown files
                    if not relative_path.endswith(('.md', '.markdown')):
                        continue
                    
                    # Skip hidden files
                    if os.path.basename(relative_path).startswith('.'):
                        continue
                    
                    file_content_bytes = await file_obj.read()
                    file_size_bytes = len(file_content_bytes)
                    
                    # Decode content
                    try:
                        file_content = file_content_bytes.decode('utf-8')
                    except UnicodeDecodeError:
                        errors.append({"file": relative_path, "error": "Not a valid UTF-8 file"})
                        continue
                    
                    # Parse frontmatter and get title
                    title, clean_content = parse_frontmatter(file_content, os.path.basename(relative_path))
                    
                    # Convert to TipTap format
                    tiptap_content = markdown_to_tiptap(clean_content)
                    word_count = len(clean_content.split())
                    
                    # Determine folder_id from path
                    folder_path = os.path.dirname(relative_path)
                    folder_id = folder_id_map.get(folder_path) if folder_path else None
                    
                    # Insert document
                    result = await db.execute(
                        text("""
                            INSERT INTO documents (
                                owner_id, tenant_id, project_id, folder_id,
                                title, content, word_count, file_size,
                                status, visibility, current_version,
                                created_at, updated_at
                            )
                            VALUES (
                                :owner_id, :tenant_id, :project_id, :folder_id,
                                :title, :content, :word_count, :file_size,
                                'draft', 'private', 1,
                                :now, :now
                            )
                            RETURNING id, title
                        """),
                        {
                            "owner_id": user.id,
                            "tenant_id": user.tenant_id,
                            "project_id": project_id,
                            "folder_id": folder_id,
                            "title": title,
                            "content": json.dumps(tiptap_content),
                            "word_count": word_count,
                            "file_size": file_size_bytes,
                            "now": datetime.utcnow()
                        }
                    )
                    doc = result.fetchone()
                    
                    imported_docs.append({
                        "id": doc[0],
                        "title": doc[1],
                        "path": relative_path,
                        "folder": folder_path or "root",
                        "folder_id": folder_id,
                        "size": file_size_bytes,
                        "words": word_count
                    })
                    total_bytes += file_size_bytes
                    
                except Exception as e:
                    print(f"[BULK UPLOAD] Error processing {relative_path}: {str(e)}")
                    errors.append({"file": relative_path, "error": str(e)})
        
        else:
            raise HTTPException(status_code=400, detail="Invalid upload: provide either a .zip file, a single .md/.markdown file, or multiple files with file_paths")
        
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


def markdown_to_tiptap(markdown: str) -> dict:
    """
    Convert markdown text to TipTap JSON format.
    Supports common markdown features: headings, bold, italic, lists, links, code, etc.
    """
    content = []
    lines = markdown.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Empty line - add empty paragraph to preserve spacing
        if not stripped:
            content.append({
                "type": "paragraph",
                "content": []
            })
            i += 1
            continue
        
        # Headings
        if stripped.startswith('#'):
            level = len(stripped) - len(stripped.lstrip('#'))
            level = min(level, 3)  # Max level 3
            text = stripped.lstrip('#').strip()
            content.append({
                "type": "heading",
                "attrs": {"level": level},
                "content": parse_inline_markdown(text)
            })
            i += 1
            continue
        
        # Bullet list
        if stripped.startswith(('- ', '* ', '+ ')):
            list_items = []
            while i < len(lines) and lines[i].strip().startswith(('- ', '* ', '+ ')):
                item_text = lines[i].strip()[2:]
                list_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": parse_inline_markdown(item_text)
                    }]
                })
                i += 1
            content.append({
                "type": "bulletList",
                "content": list_items
            })
            continue
        
        # Numbered list
        if re.match(r'^\d+\.\s', stripped):
            list_items = []
            while i < len(lines) and re.match(r'^\d+\.\s', lines[i].strip()):
                item_text = re.sub(r'^\d+\.\s', '', lines[i].strip())
                list_items.append({
                    "type": "listItem",
                    "content": [{
                        "type": "paragraph",
                        "content": parse_inline_markdown(item_text)
                    }]
                })
                i += 1
            content.append({
                "type": "orderedList",
                "content": list_items
            })
            continue
        
        # Blockquote
        if stripped.startswith('>'):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                quote_lines.append(lines[i].strip()[1:].strip())
                i += 1
            content.append({
                "type": "blockquote",
                "content": [{
                    "type": "paragraph",
                    "content": parse_inline_markdown(' '.join(quote_lines))
                }]
            })
            continue
        
        # Code block
        if stripped.startswith('```'):
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1  # Skip closing ```
            content.append({
                "type": "codeBlock",
                "content": [{
                    "type": "text",
                    "text": '\n'.join(code_lines)
                }]
            })
            continue
        
        # Regular paragraph - preserve line breaks within paragraph
        para_lines = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#', '-', '*', '+', '>', '```')) and not re.match(r'^\d+\.\s', lines[i].strip()):
            para_lines.append(lines[i])
            i += 1
        
        # Parse paragraph with line breaks preserved
        para_content = []
        for idx, pline in enumerate(para_lines):
            para_content.extend(parse_inline_markdown(pline))
            # Add hard break between lines (except last line)
            if idx < len(para_lines) - 1:
                para_content.append({"type": "hardBreak"})
        
        content.append({
            "type": "paragraph",
            "content": para_content
        })
    
    return {
        "type": "doc",
        "content": content
    }


def parse_inline_markdown(text: str) -> list:
    """Parse inline markdown formatting (bold, italic, code, links)"""
    if not text:
        return [{"type": "text", "text": ""}]
    
    parts = []
    current_text = ""
    i = 0
    
    while i < len(text):
        # Bold **text**
        if text[i:i+2] == '**':
            if current_text:
                parts.append({"type": "text", "text": current_text})
                current_text = ""
            end = text.find('**', i + 2)
            if end != -1:
                parts.append({
                    "type": "text",
                    "text": text[i+2:end],
                    "marks": [{"type": "bold"}]
                })
                i = end + 2
                continue
        
        # Italic *text*
        if text[i] == '*' and (i == 0 or text[i-1] != '*') and (i+1 >= len(text) or text[i+1] != '*'):
            if current_text:
                parts.append({"type": "text", "text": current_text})
                current_text = ""
            end = text.find('*', i + 1)
            if end != -1 and (end+1 >= len(text) or text[end+1] != '*'):
                parts.append({
                    "type": "text",
                    "text": text[i+1:end],
                    "marks": [{"type": "italic"}]
                })
                i = end + 1
                continue
        
        # Code `text`
        if text[i] == '`':
            if current_text:
                parts.append({"type": "text", "text": current_text})
                current_text = ""
            end = text.find('`', i + 1)
            if end != -1:
                parts.append({
                    "type": "text",
                    "text": text[i+1:end],
                    "marks": [{"type": "code"}]
                })
                i = end + 1
                continue
        
        # Links [text](url)
        if text[i] == '[':
            link_match = re.match(r'\[([^\]]+)\]\(([^)]+)\)', text[i:])
            if link_match:
                if current_text:
                    parts.append({"type": "text", "text": current_text})
                    current_text = ""
                parts.append({
                    "type": "text",
                    "text": link_match.group(1),
                    "marks": [{"type": "link", "attrs": {"href": link_match.group(2)}}]
                })
                i += len(link_match.group(0))
                continue
        
        current_text += text[i]
        i += 1
    
    if current_text:
        parts.append({"type": "text", "text": current_text})
    
    return parts if parts else [{"type": "text", "text": ""}]


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
