"""
S3 Storage Cleanup Script
Removes orphaned files and old versions from S3-compatible storage

Usage:
    python -m app.scripts.cleanup_s3_storage --dry-run  # Preview what would be deleted
    python -m app.scripts.cleanup_s3_storage            # Actually delete files
    python -m app.scripts.cleanup_s3_storage --days 90  # Delete files older than 90 days
"""
import asyncio
import argparse
from datetime import datetime, timedelta
from typing import List, Tuple
import logging

import boto3
from botocore.exceptions import ClientError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_async_session
from app.models.document import Document

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class S3StorageCleanup:
    """Clean up orphaned and old files from S3 storage"""
    
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.bucket_name = settings.S3_BUCKET_NAME
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
            aws_access_key_id=settings.S3_ACCESS_KEY_ID_CLEAN,
            aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY_CLEAN,
            region_name=settings.S3_REGION
        )
        
        logger.info(f"Initialized S3 cleanup (dry_run={dry_run})")
        logger.info(f"Bucket: {self.bucket_name}")
    
    async def get_all_s3_keys(self) -> List[str]:
        """List all object keys in the S3 bucket"""
        keys = []
        
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name)
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        keys.append(obj['Key'])
            
            logger.info(f"Found {len(keys)} objects in S3")
            return keys
            
        except ClientError as e:
            logger.error(f"Error listing S3 objects: {e}")
            return []
    
    async def get_database_file_paths(self, db: AsyncSession) -> set:
        """Get all file paths referenced in the database"""
        file_paths = set()
        
        # Get all document file paths
        result = await db.execute(
            select(Document.file_path)
            .where(Document.file_path.isnot(None))
        )
        paths = result.scalars().all()
        
        for path in paths:
            if path:
                file_paths.add(path)
        
        logger.info(f"Found {len(file_paths)} file paths in database")
        return file_paths
    
    async def find_orphaned_files(self, db: AsyncSession) -> List[str]:
        """Find S3 files not referenced in database"""
        s3_keys = await self.get_all_s3_keys()
        db_paths = await self.get_database_file_paths(db)
        
        # Orphaned files = in S3 but not in database
        orphaned = [key for key in s3_keys if key not in db_paths]
        
        logger.info(f"Found {len(orphaned)} orphaned files")
        return orphaned
    
    async def find_old_document_versions(self) -> List[Tuple[str, datetime]]:
        """
        Find old document versions (keep latest only)
        
        Document versions are stored as:
        tenant_id/documents/document_id/content_TIMESTAMP.txt
        """
        all_keys = await self.get_all_s3_keys()
        
        # Group by document
        document_versions = {}
        for key in all_keys:
            parts = key.split('/')
            if len(parts) >= 3 and parts[1] == 'documents':
                doc_key = '/'.join(parts[:3])  # tenant_id/documents/document_id
                if doc_key not in document_versions:
                    document_versions[doc_key] = []
                document_versions[doc_key].append(key)
        
        # Find old versions (keep latest)
        old_versions = []
        for doc_key, versions in document_versions.items():
            if len(versions) > 1:
                # Sort by filename (timestamp is in filename)
                versions.sort(reverse=True)
                # Keep the first (latest), mark others as old
                for old_version in versions[1:]:
                    old_versions.append(old_version)
        
        logger.info(f"Found {len(old_versions)} old document versions")
        return old_versions
    
    async def get_file_info(self, key: str) -> dict:
        """Get metadata about an S3 object"""
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return {
                'size': response['ContentLength'],
                'last_modified': response['LastModified'],
                'content_type': response.get('ContentType', 'unknown')
            }
        except ClientError as e:
            logger.error(f"Error getting info for {key}: {e}")
            return {}
    
    async def delete_files(self, keys: List[str]) -> int:
        """Delete files from S3"""
        if not keys:
            return 0
        
        deleted_count = 0
        total_size = 0
        
        for key in keys:
            try:
                # Get file info for logging
                info = await self.get_file_info(key)
                size = info.get('size', 0)
                
                if self.dry_run:
                    logger.info(f"[DRY RUN] Would delete: {key} ({size / 1024:.2f} KB)")
                else:
                    self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                    logger.info(f"Deleted: {key} ({size / 1024:.2f} KB)")
                
                deleted_count += 1
                total_size += size
                
            except ClientError as e:
                logger.error(f"Error deleting {key}: {e}")
        
        logger.info(f"{'Would delete' if self.dry_run else 'Deleted'} {deleted_count} files ({total_size / 1024 / 1024:.2f} MB)")
        return deleted_count
    
    async def cleanup_old_files(self, days: int = 90) -> int:
        """Delete files older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        old_files = []
        
        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name)
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                            old_files.append(obj['Key'])
            
            logger.info(f"Found {len(old_files)} files older than {days} days")
            
            if old_files:
                return await self.delete_files(old_files)
            
            return 0
            
        except ClientError as e:
            logger.error(f"Error finding old files: {e}")
            return 0
    
    async def run_cleanup(self, db: AsyncSession, cleanup_type: str = "all"):
        """
        Run cleanup operations
        
        Args:
            db: Database session
            cleanup_type: Type of cleanup - "orphaned", "old_versions", "all"
        """
        logger.info(f"Starting S3 cleanup (type={cleanup_type}, dry_run={self.dry_run})")
        
        total_deleted = 0
        
        if cleanup_type in ["orphaned", "all"]:
            logger.info("\n=== Finding Orphaned Files ===")
            orphaned = await self.find_orphaned_files(db)
            deleted = await self.delete_files(orphaned)
            total_deleted += deleted
        
        if cleanup_type in ["old_versions", "all"]:
            logger.info("\n=== Finding Old Document Versions ===")
            old_versions = await self.find_old_document_versions()
            deleted = await self.delete_files(old_versions)
            total_deleted += deleted
        
        logger.info(f"\n{'Would delete' if self.dry_run else 'Deleted'} {total_deleted} total files")
        
        if self.dry_run:
            logger.info("\n⚠️  This was a dry run. Use --no-dry-run to actually delete files.")


async def main():
    """Main cleanup function"""
    parser = argparse.ArgumentParser(description="Clean up S3 storage")
    parser.add_argument(
        '--dry-run',
        action='store_true',
        default=True,
        help='Preview deletions without actually deleting (default: True)'
    )
    parser.add_argument(
        '--no-dry-run',
        dest='dry_run',
        action='store_false',
        help='Actually delete files (use with caution!)'
    )
    parser.add_argument(
        '--type',
        choices=['orphaned', 'old_versions', 'all'],
        default='all',
        help='Type of cleanup to perform'
    )
    parser.add_argument(
        '--days',
        type=int,
        default=None,
        help='Delete files older than N days (optional)'
    )
    
    args = parser.parse_args()
    
    # Initialize cleanup
    cleanup = S3StorageCleanup(dry_run=args.dry_run)
    
    # Get database session
    async for db in get_async_session():
        try:
            # Run cleanup by age if specified
            if args.days:
                logger.info(f"\n=== Deleting Files Older Than {args.days} Days ===")
                await cleanup.cleanup_old_files(args.days)
            else:
                # Run standard cleanup
                await cleanup.run_cleanup(db, cleanup_type=args.type)
            
            break  # Only use first session
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
