"""
Test S3 Document Storage
Quick test to verify S3/MinIO document storage is working
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.storage_service import storage_service


async def test_storage():
    """Test document upload, download, and delete"""
    print("=" * 60)
    print("Testing S3 Document Storage")
    print("=" * 60)
    
    # Check if S3 is configured
    if not storage_service.s3_client:
        print("❌ S3 client not initialized")
        print("Make sure these environment variables are set:")
        print("  - S3_ENDPOINT_URL (e.g., http://localhost:9000 for MinIO)")
        print("  - S3_ACCESS_KEY_ID")
        print("  - S3_SECRET_ACCESS_KEY")
        print("  - S3_BUCKET_NAME")
        return False
    
    print("✅ S3 client initialized")
    print(f"   Bucket: {storage_service.bucket_name}")
    
    # Test data
    test_document_id = 999
    test_tenant_id = 1
    test_content = "This is a test document. Hello from WorkShelf!"
    
    print("\n" + "-" * 60)
    print("Test 1: Upload document")
    print("-" * 60)
    
    file_path = storage_service.upload_document(
        document_id=test_document_id,
        content=test_content,
        tenant_id=test_tenant_id
    )
    
    if file_path:
        print(f"✅ Upload successful")
        print(f"   Path: {file_path}")
    else:
        print("❌ Upload failed")
        return False
    
    print("\n" + "-" * 60)
    print("Test 2: Download document")
    print("-" * 60)
    
    downloaded_content = storage_service.download_document(file_path)
    
    if downloaded_content:
        print(f"✅ Download successful")
        print(f"   Content: {downloaded_content[:50]}...")
        
        if downloaded_content == test_content:
            print("✅ Content matches original")
        else:
            print("❌ Content mismatch!")
            return False
    else:
        print("❌ Download failed")
        return False
    
    print("\n" + "-" * 60)
    print("Test 3: Generate presigned URL")
    print("-" * 60)
    
    url = storage_service.get_document_url(file_path, expiration=300)
    
    if url:
        print(f"✅ URL generated")
        print(f"   URL: {url[:80]}...")
    else:
        print("⚠️  URL generation failed (may not be supported by MinIO)")
    
    print("\n" + "-" * 60)
    print("Test 4: Delete document")
    print("-" * 60)
    
    deleted = storage_service.delete_document(file_path)
    
    if deleted:
        print(f"✅ Delete successful")
    else:
        print("❌ Delete failed")
        return False
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print("\nDocument storage is working correctly with S3/MinIO.")
    print("Documents will be stored in S3 instead of the database.")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_storage())
    sys.exit(0 if success else 1)
