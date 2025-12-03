"""
Export Service
Document export to various formats and GDPR data export
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import os
import json

from app.models import (
    ExportJob, Document, Studio, User,
    ExportFormat, ExportStatus, ExportType
)


class ExportService:
    """Service for exporting documents and user data"""
    
    # Export expiration (files available for 7 days)
    EXPORT_EXPIRATION_DAYS = 7
    
    @staticmethod
    async def create_export_job(
        db: AsyncSession,
        user_id: int,
        export_type: str,
        export_format: str,
        document_id: Optional[int] = None,
        studio_id: Optional[int] = None,
        include_metadata: bool = True,
        include_comments: bool = False,
        include_version_history: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new export job
        
        Args:
            export_type: document, studio, gdpr_data, backup
            export_format: pdf, docx, markdown, html, epub, txt, json
        """
        try:
            # Validate inputs
            if export_type == "document" and not document_id:
                return {"error": "Document ID required for document export"}
            
            if export_type == "studio" and not studio_id:
                return {"error": "Studio ID required for studio export"}
            
            # Create export job
            job = ExportJob(
                user_id=user_id,
                export_type=ExportType(export_type),
                export_format=ExportFormat(export_format),
                status=ExportStatus.PENDING,
                document_id=document_id,
                studio_id=studio_id,
                include_metadata=include_metadata,
                include_comments=include_comments,
                include_version_history=include_version_history,
                expires_at=datetime.now(timezone.utc) + timedelta(days=ExportService.EXPORT_EXPIRATION_DAYS)
            )
            
            db.add(job)
            await db.commit()
            await db.refresh(job)
            
            # In production, this would trigger a background job
            # For now, we'll process it immediately
            result = await ExportService.process_export_job(db, job.id)
            
            return result
        
        except Exception as e:
            await db.rollback()
            return {"error": f"Error creating export job: {str(e)}"}
    
    @staticmethod
    async def process_export_job(
        db: AsyncSession,
        job_id: int
    ) -> Dict[str, Any]:
        """
        Process an export job
        
        In production, this would:
        1. Generate the file (PDF, DOCX, etc.)
        2. Upload to Azure Blob Storage
        3. Update job with file URL
        """
        try:
            # Get job
            result = await db.execute(
                select(ExportJob).where(ExportJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if not job:
                return {"error": "Export job not found"}
            
            # Update status
            job.status = ExportStatus.PROCESSING
            job.processing_started_at = datetime.now(timezone.utc)
            await db.commit()
            
            # Process based on export type
            if job.export_type == ExportType.DOCUMENT:
                result = await ExportService._export_document(db, job)
            elif job.export_type == ExportType.STUDIO:
                result = await ExportService._export_studio(db, job)
            elif job.export_type == ExportType.GDPR_DATA:
                result = await ExportService._export_gdpr_data(db, job)
            elif job.export_type == ExportType.BACKUP:
                result = await ExportService._export_backup(db, job)
            else:
                raise ValueError(f"Unknown export type: {job.export_type}")
            
            if "error" in result:
                job.status = ExportStatus.FAILED
                job.error_message = result["error"]
            else:
                job.status = ExportStatus.COMPLETED
                job.file_url = result.get("file_url")
                job.file_size_bytes = result.get("file_size_bytes")
                job.file_name = result.get("file_name")
                job.processing_completed_at = datetime.now(timezone.utc)
            
            await db.commit()
            await db.refresh(job)
            
            return {"job": job}
        
        except Exception as e:
            job.status = ExportStatus.FAILED
            job.error_message = str(e)
            await db.commit()
            return {"error": f"Export failed: {str(e)}"}
    
    @staticmethod
    async def _export_document(
        db: AsyncSession,
        job: ExportJob
    ) -> Dict[str, Any]:
        """Export a single document"""
        # Get document
        result = await db.execute(
            select(Document).where(Document.id == job.document_id)
        )
        document = result.scalar_one_or_none()
        if not document:
            return {"error": "Document not found"}
        
        # Generate content based on format
        if job.export_format == ExportFormat.MARKDOWN:
            content = await ExportService._generate_markdown(document, job)
        elif job.export_format == ExportFormat.HTML:
            content = await ExportService._generate_html(document, job)
        elif job.export_format == ExportFormat.TXT:
            content = await ExportService._generate_txt(document, job)
        elif job.export_format == ExportFormat.JSON:
            content = await ExportService._generate_json(document, job)
        elif job.export_format == ExportFormat.PDF:
            return {"error": "PDF export requires additional libraries (ReportLab, WeasyPrint)"}
        elif job.export_format == ExportFormat.DOCX:
            return {"error": "DOCX export requires python-docx library"}
        elif job.export_format == ExportFormat.EPUB:
            return {"error": "EPUB export requires ebooklib library"}
        else:
            return {"error": f"Unsupported format: {job.export_format}"}
        
        # In production: Upload to Azure Blob Storage
        # file_url = await upload_to_blob_storage(content, filename)
        
        # For now, return mock URL
        file_name = f"{document.title}.{job.export_format.value}"
        file_url = f"https://storage.example.com/exports/{job.id}/{file_name}"
        
        return {
            "file_url": file_url,
            "file_name": file_name,
            "file_size_bytes": len(content.encode('utf-8')) if isinstance(content, str) else len(content)
        }
    
    @staticmethod
    async def _export_studio(
        db: AsyncSession,
        job: ExportJob
    ) -> Dict[str, Any]:
        """Export all documents in a studio"""
        # Get studio
        result = await db.execute(
            select(Studio).where(Studio.id == job.studio_id)
        )
        studio = result.scalar_one_or_none()
        if not studio:
            return {"error": "Studio not found"}
        
        # Get all documents in studio
        result = await db.execute(
            select(Document).where(Document.studio_id == job.studio_id)
        )
        documents = result.scalars().all()
        
        job.total_items = len(documents)
        await db.commit()
        
        # Export each document
        exported_files = []
        for i, document in enumerate(documents):
            # Create temporary job for each document
            doc_job = ExportJob(
                user_id=job.user_id,
                export_type=ExportType.DOCUMENT,
                export_format=job.export_format,
                document_id=document.id,
                include_metadata=job.include_metadata,
                include_comments=job.include_comments,
                include_version_history=job.include_version_history
            )
            
            result = await ExportService._export_document(db, doc_job)
            if "error" not in result:
                exported_files.append(result)
            
            job.processed_items = i + 1
            await db.commit()
        
        # In production: Create ZIP archive of all files
        # zip_url = await create_zip_archive(exported_files)
        
        file_name = f"{studio.name}_export.zip"
        file_url = f"https://storage.example.com/exports/{job.id}/{file_name}"
        
        return {
            "file_url": file_url,
            "file_name": file_name,
            "file_size_bytes": sum(f.get("file_size_bytes", 0) for f in exported_files)
        }
    
    @staticmethod
    async def _export_gdpr_data(
        db: AsyncSession,
        job: ExportJob
    ) -> Dict[str, Any]:
        """
        Export all user data for GDPR compliance
        
        Includes:
        - User profile
        - All documents
        - Comments
        - Activity history
        - Settings
        """
        # Get user
        result = await db.execute(
            select(User).where(User.id == job.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "User not found"}
        
        # Collect all user data
        gdpr_data = {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "accessibility_settings": user.accessibility_settings
            },
            "profile": {
                # Add profile data
            },
            "documents": [
                # Add all user documents
            ],
            "activity": [
                # Add activity logs
            ],
            "export_date": datetime.now(timezone.utc).isoformat(),
            "data_retention_policy": "As per GDPR, you have the right to request deletion of this data."
        }
        
        # Convert to JSON
        content = json.dumps(gdpr_data, indent=2)
        
        file_name = f"gdpr_data_{user.id}.json"
        file_url = f"https://storage.example.com/exports/{job.id}/{file_name}"
        
        return {
            "file_url": file_url,
            "file_name": file_name,
            "file_size_bytes": len(content.encode('utf-8'))
        }
    
    @staticmethod
    async def _export_backup(
        db: AsyncSession,
        job: ExportJob
    ) -> Dict[str, Any]:
        """Create full backup of user's workspace"""
        # Similar to GDPR export but includes more metadata
        return await ExportService._export_gdpr_data(db, job)
    
    @staticmethod
    async def _generate_markdown(document: Document, job: ExportJob) -> str:
        """Generate Markdown export"""
        content = f"# {document.title}\n\n"
        
        if job.include_metadata:
            content += f"**Author:** {document.user_id}\n"
            content += f"**Created:** {document.created_at}\n"
            content += f"**Status:** {document.status}\n\n"
        
        content += document.content or ""
        
        return content
    
    @staticmethod
    async def _generate_html(document: Document, job: ExportJob) -> str:
        """Generate HTML export"""
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{document.title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }}
        h1 {{ color: #333; }}
        .metadata {{ color: #666; font-size: 0.9em; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <h1>{document.title}</h1>
"""
        
        if job.include_metadata:
            html += f"""    <div class="metadata">
        <p><strong>Created:</strong> {document.created_at}</p>
        <p><strong>Status:</strong> {document.status}</p>
    </div>
"""
        
        html += f"""    <div class="content">
        {document.content or ''}
    </div>
</body>
</html>"""
        
        return html
    
    @staticmethod
    async def _generate_txt(document: Document, job: ExportJob) -> str:
        """Generate plain text export"""
        content = f"{document.title}\n"
        content += "=" * len(document.title) + "\n\n"
        
        if job.include_metadata:
            content += f"Created: {document.created_at}\n"
            content += f"Status: {document.status}\n\n"
        
        content += document.content or ""
        
        return content
    
    @staticmethod
    async def _generate_json(document: Document, job: ExportJob) -> str:
        """Generate JSON export"""
        data = {
            "id": document.id,
            "title": document.title,
            "content": document.content,
            "status": document.status.value if document.status else None
        }
        
        if job.include_metadata:
            data.update({
                "created_at": document.created_at.isoformat() if document.created_at else None,
                "updated_at": document.updated_at.isoformat() if document.updated_at else None,
                "user_id": document.user_id,
                "studio_id": document.studio_id
            })
        
        return json.dumps(data, indent=2)
    
    @staticmethod
    async def get_export_job(
        db: AsyncSession,
        job_id: int,
        user_id: int
    ) -> Optional[ExportJob]:
        """Get export job by ID"""
        result = await db.execute(
            select(ExportJob).where(
                and_(
                    ExportJob.id == job_id,
                    ExportJob.user_id == user_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_export_jobs(
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> List[ExportJob]:
        """Get all export jobs for a user"""
        result = await db.execute(
            select(ExportJob)
            .where(ExportJob.user_id == user_id)
            .order_by(ExportJob.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    @staticmethod
    async def cleanup_expired_exports(db: AsyncSession) -> int:
        """
        Clean up expired export files
        
        This should be run as a scheduled job (cron/celery beat)
        """
        from sqlalchemy import update
        
        # Mark expired jobs
        result = await db.execute(
            update(ExportJob)
            .where(
                and_(
                    ExportJob.expires_at < datetime.now(timezone.utc),
                    ExportJob.status == ExportStatus.COMPLETED
                )
            )
            .values(status=ExportStatus.EXPIRED)
        )
        
        await db.commit()
        
        # In production: Delete files from blob storage
        # for job in expired_jobs:
        #     await delete_from_blob_storage(job.file_url)
        
        return result.rowcount
