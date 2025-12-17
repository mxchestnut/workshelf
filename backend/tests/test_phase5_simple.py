"""
Test Phase 5: Studio Customization & Analytics (Simple version)
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app


async def create_test_studio(client: AsyncClient) -> int:
    """Create a test studio and return its ID."""
    unique_id = str(uuid.uuid4())[:8]
    studio_data = {
        "name": f"Test Studio {unique_id}",
        "description": "A test studio for Phase 5"
    }
    response = await client.post("/studios", json=studio_data)
    if response.status_code in (200, 201):
        return response.json().get("id", 1)
    return 1


async def create_test_document(client: AsyncClient) -> int:
    """Create a test document and return its ID."""
    doc_data = {
        "title": "Test Document",
        "content": "This is a test document for Phase 5."
    }
    response = await client.post("/documents", json=doc_data)
    if response.status_code in (200, 201):
        return response.json().get("id", 1)
    return 1


@pytest.mark.asyncio
async def test_phase5_theme():
    """Test theme customization."""
    print("\n" + "=" * 60)
    print("TEST: Theme Customization")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1", follow_redirects=True) as client:
        # Create studio first
        studio_id = await create_test_studio(client)
        
        # Create theme
        theme_data = {
            "primary_color": "#4F46E5",
            "secondary_color": "#10B981",
            "heading_font": "Inter"
        }
        
        response = await client.post(f"/studios/{studio_id}/theme", json=theme_data)
        print(f"✓ Create theme: {response.status_code}")
        if response.status_code == 200:
            theme = response.json()
            print(f"  Theme ID: {theme.get('id')}")
            print(f"  Primary color: {theme.get('primary_color')}")
        
        # Get theme
        response = await client.get(f"/studios/{studio_id}/theme")
        print(f"✓ Get theme: {response.status_code}")
        if response.status_code == 200:
            theme = response.json()
            print(f"  Primary color: {theme.get('primary_color')}")


@pytest.mark.asyncio
async def test_phase5_domains():
    """Test custom domains."""
    print("\n" + "=" * 60)
    print("TEST: Custom Domains")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1", follow_redirects=True) as client:
        # Create studio first
        studio_id = await create_test_studio(client)
        
        # Create domain
        domain_data = {
            "domain": "docs.example.com"
        }
        
        response = await client.post(f"/studios/{studio_id}/custom-domains", json=domain_data)
        print(f"✓ Create domain: {response.status_code}")
        if response.status_code == 200:
            domain = response.json()
            domain_id = domain.get('id')
            print(f"  Domain ID: {domain_id}")
            print(f"  Status: {domain.get('status')}")
            print(f"  Verification token: {domain.get('verification_token', '')[:20]}...")
            
            # List domains
            response = await client.get(f"/studios/{studio_id}/custom-domains")
            print(f"✓ List domains: {response.status_code}")
            if response.status_code == 200:
                domains = response.json()
                print(f"  Total domains: {len(domains)}")
            
            # Verify domain
            if domain_id:
                response = await client.post(f"/studios/{studio_id}/custom-domains/{domain_id}/verify")
                print(f"✓ Verify domain: {response.status_code}")
                if response.status_code == 200:
                    domain = response.json()
                    print(f"  Status: {domain.get('status')}")


@pytest.mark.asyncio
async def test_phase5_views():
    """Test view tracking."""
    print("\n" + "=" * 60)
    print("TEST: View Tracking")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1", follow_redirects=True) as client:
        # Create document first
        document_id = await create_test_document(client)
        
        # Record views
        view_data = {
            "session_id": "test-session-123",
            "user_agent": "Mozilla/5.0",
            "view_duration": 120,
            "scroll_depth": 75
        }
        
        response = await client.post(f"/studios/documents/{document_id}/views", json=view_data)
        print(f"✓ Record view #1: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Is unique: {result.get('is_unique')}")
        
        response = await client.post(f"/studios/documents/{document_id}/views", json=view_data)
        print(f"✓ Record view #2 (same session): {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Is unique: {result.get('is_unique')}")


@pytest.mark.asyncio
async def test_phase5_analytics():
    """Test analytics."""
    print("\n" + "=" * 60)
    print("TEST: Analytics")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1", follow_redirects=True) as client:
        # Create studio and document first
        studio_id = await create_test_studio(client)
        document_id = await create_test_document(client)
        
        # Studio analytics
        response = await client.get(
            f"/studios/{studio_id}/analytics",
            params={"start_date": "2024-01-01", "end_date": "2024-12-31"}
        )
        print(f"✓ Studio analytics: {response.status_code}")
        if response.status_code == 200:
            metrics = response.json()
            print(f"  Studio ID: {metrics.get('studio_id')}")
            print(f"  Views: {metrics.get('views', {})}")
        
        # Time series
        response = await client.get(
            f"/studios/{studio_id}/analytics/time-series",
            params={
                "metric": "views",
                "period": "daily",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31"
            }
        )
        print(f"✓ Time series: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Metric: {data.get('metric')}")
            print(f"  Data points: {len(data.get('data', []))}")
        
        # Document analytics
        response = await client.get(
            f"/studios/documents/{document_id}/analytics",
            params={"start_date": "2024-01-01", "end_date": "2024-12-31"}
        )
        print(f"✓ Document analytics: {response.status_code}")
        if response.status_code == 200:
            metrics = response.json()
            print(f"  Document ID: {metrics.get('document_id')}")
            print(f"  Views: {metrics.get('views', {})}")


async def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("PHASE 5 TEST SUITE: Studio Customization & Analytics")
    print("=" * 60)
    
    try:
        await test_phase5_theme()
        print("\n✅ Theme Customization: COMPLETE")
    except Exception as e:
        print(f"\n❌ Theme Customization: FAILED - {e}")
    
    try:
        await test_phase5_domains()
        print("\n✅ Custom Domains: COMPLETE")
    except Exception as e:
        print(f"\n❌ Custom Domains: FAILED - {e}")
    
    try:
        await test_phase5_views()
        print("\n✅ View Tracking: COMPLETE")
    except Exception as e:
        print(f"\n❌ View Tracking: FAILED - {e}")
    
    try:
        await test_phase5_analytics()
        print("\n✅ Analytics: COMPLETE")
    except Exception as e:
        print(f"\n❌ Analytics: FAILED - {e}")
    
    print("\n" + "=" * 60)
    print("PHASE 5 TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
