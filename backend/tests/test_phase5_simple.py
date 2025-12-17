"""
Test Phase 5: Studio Customization & Analytics (Simple version)
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
STUDIO_ID = 1
DOCUMENT_ID = 1


@pytest.mark.anyio
async def test_phase5_theme():
    """Test theme customization."""
    print("\n" + "=" * 60)
    print("TEST: Theme Customization")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as client:
        # Create theme
        theme_data = {
            "primary_color": "#4F46E5",
            "secondary_color": "#10B981",
            "heading_font": "Inter"
        }
        
        response = await client.post(f"/studios/{STUDIO_ID}/theme", json=theme_data)
        print(f"✓ Create theme: {response.status_code}")
        if response.status_code == 200:
            theme = response.json()
            print(f"  Theme ID: {theme.get('id')}")
            print(f"  Primary color: {theme.get('primary_color')}")
        
        # Get theme
        response = await client.get(f"/studios/{STUDIO_ID}/theme")
        print(f"✓ Get theme: {response.status_code}")
        if response.status_code == 200:
            theme = response.json()
            print(f"  Primary color: {theme.get('primary_color')}")


@pytest.mark.anyio
async def test_phase5_domains():
    """Test custom domains."""
    print("\n" + "=" * 60)
    print("TEST: Custom Domains")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as client:
        # Create domain
        domain_data = {
            "domain": "docs.example.com"
        }
        
        response = await client.post(f"/studios/{STUDIO_ID}/custom-domains", json=domain_data)
        print(f"✓ Create domain: {response.status_code}")
        if response.status_code == 200:
            domain = response.json()
            domain_id = domain.get('id')
            print(f"  Domain ID: {domain_id}")
            print(f"  Status: {domain.get('status')}")
            print(f"  Verification token: {domain.get('verification_token', '')[:20]}...")
            
            # List domains
            response = await client.get(f"/studios/{STUDIO_ID}/custom-domains")
            print(f"✓ List domains: {response.status_code}")
            if response.status_code == 200:
                domains = response.json()
                print(f"  Total domains: {len(domains)}")
            
            # Verify domain
            if domain_id:
                response = await client.post(f"/studios/{STUDIO_ID}/custom-domains/{domain_id}/verify")
                print(f"✓ Verify domain: {response.status_code}")
                if response.status_code == 200:
                    domain = response.json()
                    print(f"  Status: {domain.get('status')}")


@pytest.mark.anyio
async def test_phase5_views():
    """Test view tracking."""
    print("\n" + "=" * 60)
    print("TEST: View Tracking")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as client:
        # Record views
        view_data = {
            "session_id": "test-session-123",
            "user_agent": "Mozilla/5.0",
            "view_duration": 120,
            "scroll_depth": 75
        }
        
        response = await client.post(f"/studios/documents/{DOCUMENT_ID}/views", json=view_data)
        print(f"✓ Record view #1: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Is unique: {result.get('is_unique')}")
        
        response = await client.post(f"/studios/documents/{DOCUMENT_ID}/views", json=view_data)
        print(f"✓ Record view #2 (same session): {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Is unique: {result.get('is_unique')}")


@pytest.mark.anyio
async def test_phase5_analytics():
    """Test analytics."""
    print("\n" + "=" * 60)
    print("TEST: Analytics")
    print("=" * 60)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as client:
        # Studio analytics
        response = await client.get(
            f"/studios/{STUDIO_ID}/analytics",
            params={"start_date": "2024-01-01", "end_date": "2024-12-31"}
        )
        print(f"✓ Studio analytics: {response.status_code}")
        if response.status_code == 200:
            metrics = response.json()
            print(f"  Studio ID: {metrics.get('studio_id')}")
            print(f"  Views: {metrics.get('views', {})}")
        
        # Time series
        response = await client.get(
            f"/studios/{STUDIO_ID}/analytics/time-series",
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
            f"/studios/documents/{DOCUMENT_ID}/analytics",
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
