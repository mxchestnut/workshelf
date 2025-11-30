"""
Test Phase 5: Studio Customization & Analytics
"""
import pytest
import asyncio
from httpx import AsyncClient
from app.main import app


STUDIO_ID = 1
DOCUMENT_ID = 1


@pytest.mark.asyncio
async def test_phase5_theme_customization():
    """Test studio theme customization (colors, fonts, CSS)."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        
        # 1. Create/update theme
        theme_data = {
            "primary_color": "#4F46E5",
            "secondary_color": "#10B981",
            "accent_color": "#F59E0B",
            "background_color": "#FFFFFF",
            "text_color": "#1F2937",
            "heading_font": "Inter",
            "body_font": "System UI",
            "code_font": "JetBrains Mono",
            "custom_css": ".custom { color: red; }",
            "layout_config": {
                "sidebar": "left",
                "width": "1200px"
            }
        }
        
        response = await client.post(
            f"/studios/{STUDIO_ID}/theme",
            json=theme_data
        )
        print(f"\n✓ Create theme: {response.status_code}")
        assert response.status_code == 200
        theme = response.json()
        assert theme["primary_color"] == "#4F46E5"
        assert theme["heading_font"] == "Inter"
        print(f"  Theme ID: {theme['id']}")
        
        # 2. Get theme
        response = await client.get(f"/studios/{STUDIO_ID}/theme")
        print(f"✓ Get theme: {response.status_code}")
        assert response.status_code == 200
        theme = response.json()
        assert theme["primary_color"] == "#4F46E5"
        
        # 3. Update theme
        theme_data["primary_color"] = "#7C3AED"
        response = await client.post(
            f"/studios/{STUDIO_ID}/theme",
            json=theme_data
        )
        print(f"✓ Update theme: {response.status_code}")
        assert response.status_code == 200
        theme = response.json()
        assert theme["primary_color"] == "#7C3AED"


@pytest.mark.asyncio
async def test_phase5_custom_domains():
    """Test custom domain management with DNS verification."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        
        # 1. Add custom domain
        domain_data = {
            "domain": "docs.example.com",
            "subdomain": "docs"
        }
        
        response = await client.post(
            f"/studios/{STUDIO_ID}/custom-domains",
            json=domain_data
        )
        print(f"\n✓ Create custom domain: {response.status_code}")
        assert response.status_code == 200
        domain = response.json()
        assert domain["domain"] == "docs.example.com"
        assert domain["status"] == "pending_verification"
        assert "verification_token" in domain
        assert "dns_records" in domain
        print(f"  Domain ID: {domain['id']}")
        print(f"  Verification token: {domain['verification_token'][:20]}...")
        domain_id = domain["id"]
        
        # 2. List custom domains
        response = await client.get(f"/studios/{STUDIO_ID}/custom-domains")
        print(f"✓ List custom domains: {response.status_code}")
        assert response.status_code == 200
        domains = response.json()
        assert len(domains) > 0
        assert any(d["id"] == domain_id for d in domains)
        
        # 3. Verify domain
        response = await client.post(
            f"/studios/{STUDIO_ID}/custom-domains/{domain_id}/verify"
        )
        print(f"✓ Verify domain: {response.status_code}")
        assert response.status_code == 200
        domain = response.json()
        assert domain["status"] == "verified"
        assert domain["verified_at"] is not None
        print(f"  Status: {domain['status']}")
        
        # 4. Delete domain
        response = await client.delete(
            f"/studios/{STUDIO_ID}/custom-domains/{domain_id}"
        )
        print(f"✓ Delete custom domain: {response.status_code}")
        assert response.status_code == 200


@pytest.mark.asyncio
async def test_phase5_view_tracking():
    """Test document view tracking with analytics."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        
        # 1. Record multiple views
        view_data = {
            "session_id": "session-123",
            "user_agent": "Mozilla/5.0",
            "ip_address": "192.168.1.1",
            "referrer": "https://google.com",
            "view_duration": 120,
            "scroll_depth": 75
        }
        
        # First view
        response = await client.post(
            f"/studios/documents/{DOCUMENT_ID}/views",
            json=view_data
        )
        print(f"\n✓ Record view #1: {response.status_code}")
        assert response.status_code == 200
        result = response.json()
        print(f"  Is unique: {result['is_unique']}")
        
        # Second view (same session - not unique)
        response = await client.post(
            f"/studios/documents/{DOCUMENT_ID}/views",
            json=view_data
        )
        print(f"✓ Record view #2: {response.status_code}")
        assert response.status_code == 200
        result = response.json()
        print(f"  Is unique: {result['is_unique']}")
        
        # Third view (different session - unique)
        view_data["session_id"] = "session-456"
        response = await client.post(
            f"/studios/documents/{DOCUMENT_ID}/views",
            json=view_data
        )
        print(f"✓ Record view #3: {response.status_code}")
        assert response.status_code == 200
        result = response.json()
        print(f"  Is unique: {result['is_unique']}")


@pytest.mark.asyncio
async def test_phase5_analytics():
    """Test studio and document analytics."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        
        # 1. Get studio metrics
        response = await client.get(
            f"/studios/{STUDIO_ID}/analytics",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-12-31"
            }
        )
        print(f"\n✓ Get studio analytics: {response.status_code}")
        assert response.status_code == 200
        metrics = response.json()
        print(f"  Studio ID: {metrics['studio_id']}")
        print(f"  Total views: {metrics['views']['total']}")
        print(f"  Unique views: {metrics['views']['unique']}")
        print(f"  Total documents: {metrics['documents']['total']}")
        
        # 2. Get time-series data
        response = await client.get(
            f"/studios/{STUDIO_ID}/analytics/time-series",
            params={
                "metric": "views",
                "period": "daily",
                "start_date": "2024-01-01",
                "end_date": "2024-01-31"
            }
        )
        print(f"✓ Get time-series data: {response.status_code}")
        assert response.status_code == 200
        time_series = response.json()
        print(f"  Metric: {time_series['metric']}")
        print(f"  Data points: {len(time_series['data'])}")
        
        # 3. Get document metrics
        response = await client.get(
            f"/studios/documents/{DOCUMENT_ID}/analytics",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-12-31"
            }
        )
        print(f"✓ Get document analytics: {response.status_code}")
        assert response.status_code == 200
        doc_metrics = response.json()
        print(f"  Document ID: {doc_metrics['document_id']}")
        print(f"  Total views: {doc_metrics['views']['total']}")


async def run_all_tests():
    """Run all Phase 5 tests."""
    print("=" * 60)
    print("PHASE 5 TEST SUITE: Studio Customization & Analytics")
    print("=" * 60)
    
    try:
        await test_phase5_theme_customization()
        print("\n✅ Theme Customization: PASSED")
    except Exception as e:
        print(f"\n❌ Theme Customization: FAILED - {e}")
    
    try:
        await test_phase5_custom_domains()
        print("\n✅ Custom Domains: PASSED")
    except Exception as e:
        print(f"\n❌ Custom Domains: FAILED - {e}")
    
    try:
        await test_phase5_view_tracking()
        print("\n✅ View Tracking: PASSED")
    except Exception as e:
        print(f"\n❌ View Tracking: FAILED - {e}")
    
    try:
        await test_phase5_analytics()
        print("\n✅ Analytics: PASSED")
    except Exception as e:
        print(f"\n❌ Analytics: FAILED - {e}")
    
    print("\n" + "=" * 60)
    print("PHASE 5 TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
