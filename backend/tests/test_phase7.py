"""
Phase 7 Feature Tests
Tests for content integrity, export, and accessibility features
"""
import pytest
from httpx import AsyncClient
from app.main import app


# Test user credentials
TEST_USER = {
    "username": "testwriter",
    "email": "test@example.com",
    "password": "SecurePass123!"
}


@pytest.fixture
async def auth_headers():
    """Get authentication headers"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register user
        await client.post("/api/v1/auth/register", json=TEST_USER)
        
        # Login
        response = await client.post(
            "/api/v1/auth/login",
            data={
                "username": TEST_USER["username"],
                "password": TEST_USER["password"]
            }
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_document(auth_headers):
    """Create a test document"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/documents",
            headers=auth_headers,
            json={
                "title": "Test Document for Phase 7",
                "content": "# Introduction\n\nThis is a test document with multiple paragraphs.\n\n![](image.jpg)\n\nSome more content here."
            }
        )
        return response.json()


# ===== CONTENT INTEGRITY TESTS =====

@pytest.mark.asyncio
async def test_create_plagiarism_check(auth_headers, test_document):
    """Test creating a plagiarism check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "plagiarism"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "check" in data
        assert data["check"]["check_type"] == "plagiarism"
        assert "status" in data["check"]


@pytest.mark.asyncio
async def test_create_ai_detection_check(auth_headers, test_document):
    """Test creating an AI detection check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "ai_detection"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["check"]["check_type"] == "ai_detection"


@pytest.mark.asyncio
async def test_create_combined_check(auth_headers, test_document):
    """Test creating a combined plagiarism + AI check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "combined"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["check"]["check_type"] == "combined"


@pytest.mark.asyncio
async def test_get_check_results(auth_headers, test_document):
    """Test retrieving check results"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create check
        create_response = await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "plagiarism"
            }
        )
        check_id = create_response.json()["check"]["id"]
        
        # Get results
        response = await client.get(
            f"/api/v1/integrity/check/{check_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "check" in data


@pytest.mark.asyncio
async def test_get_document_checks(auth_headers, test_document):
    """Test getting all checks for a document"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create multiple checks
        await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "plagiarism"
            }
        )
        await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "ai_detection"
            }
        )
        
        # Get all checks
        response = await client.get(
            f"/api/v1/integrity/document/{test_document['id']}/checks",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "checks" in data
        assert len(data["checks"]) >= 2


@pytest.mark.asyncio
async def test_get_my_checks(auth_headers, test_document):
    """Test getting all checks for current user"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/integrity/my-checks",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "checks" in data


# ===== EXPORT TESTS =====

@pytest.mark.asyncio
async def test_export_document_markdown(auth_headers, test_document):
    """Test exporting a document as Markdown"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={
                "export_format": "markdown",
                "include_metadata": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "job" in data
        assert data["job"]["export_format"] == "markdown"
        assert data["job"]["status"] in ["pending", "processing", "completed"]


@pytest.mark.asyncio
async def test_export_document_html(auth_headers, test_document):
    """Test exporting a document as HTML"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={
                "export_format": "html",
                "include_metadata": True,
                "include_comments": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["job"]["export_format"] == "html"


@pytest.mark.asyncio
async def test_export_document_json(auth_headers, test_document):
    """Test exporting a document as JSON"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={
                "export_format": "json",
                "include_metadata": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["job"]["export_format"] == "json"


@pytest.mark.asyncio
async def test_export_document_txt(auth_headers, test_document):
    """Test exporting a document as plain text"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={
                "export_format": "txt"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["job"]["export_format"] == "txt"


@pytest.mark.asyncio
async def test_export_gdpr_data(auth_headers):
    """Test GDPR data export"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/export/gdpr",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["job"]["export_type"] == "gdpr_data"
        assert data["job"]["export_format"] == "json"


@pytest.mark.asyncio
async def test_get_export_jobs(auth_headers, test_document):
    """Test getting all export jobs"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create an export
        await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={"export_format": "markdown"}
        )
        
        # Get all jobs
        response = await client.get(
            "/api/v1/export/jobs",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert len(data["jobs"]) >= 1


@pytest.mark.asyncio
async def test_get_export_job_detail(auth_headers, test_document):
    """Test getting export job details"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create export
        create_response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={"export_format": "markdown"}
        )
        job_id = create_response.json()["job"]["id"]
        
        # Get job details
        response = await client.get(
            f"/api/v1/export/job/{job_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "job" in data


# ===== ACCESSIBILITY TESTS =====

@pytest.mark.asyncio
async def test_get_accessibility_settings(auth_headers):
    """Test getting default accessibility settings"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/accessibility/settings",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "settings" in data
        assert "font_size" in data["settings"]
        assert "high_contrast" in data["settings"]


@pytest.mark.asyncio
async def test_update_accessibility_settings(auth_headers):
    """Test updating accessibility settings"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.put(
            "/api/v1/accessibility/settings",
            headers=auth_headers,
            json={
                "font_size": 18,
                "high_contrast": True,
                "dyslexia_font": True,
                "reduce_animations": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["font_size"] == 18
        assert data["settings"]["high_contrast"] is True


@pytest.mark.asyncio
async def test_update_color_blind_mode(auth_headers):
    """Test setting color blind mode"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.put(
            "/api/v1/accessibility/settings",
            headers=auth_headers,
            json={"color_blind_mode": "protanopia"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["settings"]["color_blind_mode"] == "protanopia"


@pytest.mark.asyncio
async def test_check_document_accessibility(auth_headers, test_document):
    """Test running WCAG compliance check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/accessibility/check-document/{test_document['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "issues" in data
        assert "wcag_level" in data
        assert "reading_level" in data
        
        # Should detect missing alt text
        assert any(issue["type"] == "missing_alt_text" for issue in data["issues"])


@pytest.mark.asyncio
async def test_accessibility_report(auth_headers, test_document):
    """Test generating accessibility report"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/accessibility/report",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_documents" in data
        assert "average_score" in data
        assert "total_issues" in data
        assert "documents" in data


# ===== INTEGRATION TESTS =====

@pytest.mark.asyncio
async def test_full_workflow(auth_headers, test_document):
    """Test full Phase 7 workflow"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. Check content integrity
        integrity_response = await client.post(
            "/api/v1/integrity/check",
            headers=auth_headers,
            json={
                "document_id": test_document["id"],
                "check_type": "combined"
            }
        )
        assert integrity_response.status_code == 200
        
        # 2. Check accessibility
        accessibility_response = await client.post(
            f"/api/v1/accessibility/check-document/{test_document['id']}",
            headers=auth_headers
        )
        assert accessibility_response.status_code == 200
        
        # 3. Export document
        export_response = await client.post(
            f"/api/v1/export/document/{test_document['id']}",
            headers=auth_headers,
            json={"export_format": "html"}
        )
        assert export_response.status_code == 200
        
        # 4. Update accessibility settings
        settings_response = await client.put(
            "/api/v1/accessibility/settings",
            headers=auth_headers,
            json={"font_size": 20}
        )
        assert settings_response.status_code == 200
        
        # All operations should succeed
        assert all([
            integrity_response.status_code == 200,
            accessibility_response.status_code == 200,
            export_response.status_code == 200,
            settings_response.status_code == 200
        ])
