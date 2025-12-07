"""
Storage Service
Handles document file storage using S3-compatible object storage (AWS S3, MinIO, etc.)
"""
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
import logging
from datetime import datetime
from io import BytesIO

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for storing and retrieving document files from S3-compatible storage"""
    
    def __init__(self):
        """Initialize S3 client"""
        self.s3_client = None
        self.bucket_name = settings.S3_BUCKET_NAME
        
        # Only initialize if S3 is configured
        if settings.S3_ACCESS_KEY_ID_CLEAN and settings.S3_SECRET_ACCESS_KEY_CLEAN:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
                    aws_access_key_id=settings.S3_ACCESS_KEY_ID_CLEAN,
                    aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY_CLEAN,
                    region_name=settings.S3_REGION
                )
                logger.info(f"S3 client initialized with endpoint: {settings.S3_ENDPOINT_URL or 'AWS S3'}")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.s3_client = None
    
    def _ensure_bucket_exists(self) -> bool:
        """Ensure the S3 bucket exists, create if it doesn't"""
        if not self.s3_client:
            return False
            
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Created S3 bucket: {self.bucket_name}")
                    return True
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    return False
            else:
                logger.error(f"Error checking bucket: {e}")
                return False
    
    def upload_document(
        self,
        document_id: int,
        content: str,
        tenant_id: int
    ) -> Optional[str]:
        """
        Upload document content to S3
        
        Args:
            document_id: Document ID
            content: Document content (text/JSON)
            tenant_id: Tenant ID for organization
            
        Returns:
            S3 object key (path) if successful, None otherwise
        """
        if not self.s3_client:
            logger.warning("S3 not configured, falling back to database storage")
            return None
        
        if not self._ensure_bucket_exists():
            return None
        
        # Create organized path: tenant_id/documents/document_id/content.json
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        object_key = f"{tenant_id}/documents/{document_id}/content_{timestamp}.txt"
        
        try:
            # Convert content to bytes
            content_bytes = content.encode('utf-8') if isinstance(content, str) else content
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=content_bytes,
                ContentType='text/plain',
                Metadata={
                    'document_id': str(document_id),
                    'tenant_id': str(tenant_id),
                    'uploaded_at': timestamp
                }
            )
            
            logger.info(f"Uploaded document {document_id} to S3: {object_key}")
            return object_key
            
        except ClientError as e:
            logger.error(f"Failed to upload document {document_id} to S3: {e}")
            return None
    
    def download_document(self, object_key: str) -> Optional[str]:
        """
        Download document content from S3
        
        Args:
            object_key: S3 object key (path)
            
        Returns:
            Document content as string, None if failed
        """
        if not self.s3_client:
            return None
        
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            
            # Read and decode content
            content = response['Body'].read().decode('utf-8')
            logger.info(f"Downloaded document from S3: {object_key}")
            return content
            
        except ClientError as e:
            logger.error(f"Failed to download document from S3: {e}")
            return None
    
    def delete_document(self, object_key: str) -> bool:
        """
        Delete document from S3
        
        Args:
            object_key: S3 object key (path)
            
        Returns:
            True if successful, False otherwise
        """
        if not self.s3_client:
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            logger.info(f"Deleted document from S3: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete document from S3: {e}")
            return False
    
    def get_document_url(self, object_key: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate presigned URL for direct document access
        
        Args:
            object_key: S3 object key (path)
            expiration: URL expiration time in seconds (default 1 hour)
            
        Returns:
            Presigned URL if successful, None otherwise
        """
        if not self.s3_client:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key
                },
                ExpiresIn=expiration
            )
            return url
            
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return None


# Global storage service instance
storage_service = StorageService()
