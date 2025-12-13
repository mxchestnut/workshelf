# Roleplay Studio Testing Guide

**Last Updated:** December 13, 2025

## Testing Strategy

This document outlines the comprehensive testing approach for the Roleplay Studio system.

---

## Test Coverage Goals

- **Unit Tests:** >90% coverage for services and models
- **Integration Tests:** >80% coverage for API endpoints
- **E2E Tests:** Critical user flows only
- **Overall Target:** >80% coverage

---

## Test Infrastructure Setup

### Pytest Configuration

**File:** `backend/pytest.ini`
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --asyncio-mode=auto
```

### Test Database Setup

Use a separate test database to avoid polluting dev/prod data:

```python
# backend/tests/conftest.py

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.base import Base

TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_pass@localhost:5432/workshelf_test"

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop all tables after tests
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
async def db_session(test_engine):
    """Provide a test database session"""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()  # Rollback after each test
```

### Mock Data Generators

Create realistic test data with factories:

```python
# backend/tests/factories.py

import factory
from factory.alchemy import SQLAlchemyModelFactory
from app.models import User, Project, RoleplayProject, RoleplayCharacter

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"
    
    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    is_verified = True

class ProjectFactory(SQLAlchemyModelFactory):
    class Meta:
        model = Project
        sqlalchemy_session_persistence = "commit"
    
    title = factory.Sequence(lambda n: f"Project {n}")
    project_type = "roleplay"
    user = factory.SubFactory(UserFactory)

class RoleplayProjectFactory(SQLAlchemyModelFactory):
    class Meta:
        model = RoleplayProject
        sqlalchemy_session_persistence = "commit"
    
    project = factory.SubFactory(ProjectFactory)
    genre = "fantasy"
    rating = "PG-13"
    posting_order = "free-form"
    dice_enabled = True

class CharacterFactory(SQLAlchemyModelFactory):
    class Meta:
        model = RoleplayCharacter
        sqlalchemy_session_persistence = "commit"
    
    roleplay = factory.SubFactory(RoleplayProjectFactory)
    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Character {n}")
    species = "Human"
    is_active = True
```

---

## Unit Tests

### Model Tests

**File:** `backend/tests/test_roleplay_models.py`

```python
import pytest
from sqlalchemy import select
from app.models.roleplay import RoleplayProject, RoleplayCharacter, RoleplayPassage

@pytest.mark.asyncio
async def test_create_roleplay_project(db_session):
    """Test creating a roleplay project"""
    project = Project(title="Test RP", project_type="roleplay", user_id=1, tenant_id=1)
    db_session.add(project)
    await db_session.flush()
    
    roleplay = RoleplayProject(
        project_id=project.id,
        genre="fantasy",
        rating="PG-13",
        dice_enabled=True
    )
    db_session.add(roleplay)
    await db_session.commit()
    
    # Verify
    result = await db_session.execute(
        select(RoleplayProject).where(RoleplayProject.id == roleplay.id)
    )
    saved_rp = result.scalar_one()
    
    assert saved_rp.genre == "fantasy"
    assert saved_rp.dice_enabled is True

@pytest.mark.asyncio
async def test_character_relationships(db_session):
    """Test character relationships to roleplay and user"""
    # Create test data
    user = User(username="alice", email="alice@example.com")
    db_session.add(user)
    await db_session.flush()
    
    project = Project(title="Test RP", project_type="roleplay", user_id=user.id, tenant_id=1)
    db_session.add(project)
    await db_session.flush()
    
    roleplay = RoleplayProject(project_id=project.id, genre="fantasy")
    db_session.add(roleplay)
    await db_session.flush()
    
    character = RoleplayCharacter(
        roleplay_id=roleplay.id,
        user_id=user.id,
        name="Aria"
    )
    db_session.add(character)
    await db_session.commit()
    
    # Test relationships
    assert character.roleplay.id == roleplay.id
    assert character.user.username == "alice"
    assert len(roleplay.characters) == 1

@pytest.mark.asyncio
async def test_passage_sequence_numbering(db_session):
    """Test passages are correctly sequenced"""
    # Setup roleplay
    roleplay = await create_test_roleplay(db_session)
    
    # Create passages
    passage1 = RoleplayPassage(
        roleplay_id=roleplay.id,
        user_id=1,
        content="First post",
        sequence_number=1,
        word_count=2
    )
    passage2 = RoleplayPassage(
        roleplay_id=roleplay.id,
        user_id=1,
        content="Second post",
        sequence_number=2,
        word_count=2
    )
    
    db_session.add_all([passage1, passage2])
    await db_session.commit()
    
    # Verify ordering
    result = await db_session.execute(
        select(RoleplayPassage)
        .where(RoleplayPassage.roleplay_id == roleplay.id)
        .order_by(RoleplayPassage.sequence_number)
    )
    passages = result.scalars().all()
    
    assert len(passages) == 2
    assert passages[0].sequence_number == 1
    assert passages[1].sequence_number == 2

@pytest.mark.asyncio
async def test_cascade_delete_roleplay(db_session):
    """Test deleting roleplay cascades to passages and characters"""
    # Create roleplay with characters and passages
    roleplay = await create_test_roleplay(db_session)
    character = await create_test_character(db_session, roleplay.id)
    passage = await create_test_passage(db_session, roleplay.id, character.id)
    
    roleplay_id = roleplay.id
    character_id = character.id
    passage_id = passage.id
    
    # Delete roleplay
    await db_session.delete(roleplay)
    await db_session.commit()
    
    # Verify cascaded deletes
    assert await db_session.get(RoleplayProject, roleplay_id) is None
    assert await db_session.get(RoleplayCharacter, character_id) is None
    assert await db_session.get(RoleplayPassage, passage_id) is None
```

### Schema Tests

**File:** `backend/tests/test_roleplay_schemas.py`

```python
import pytest
from pydantic import ValidationError
from app.schemas.roleplay import (
    RoleplayProjectCreate,
    CharacterCreate,
    PassageCreate
)

def test_roleplay_project_create_valid():
    """Test valid roleplay project creation schema"""
    data = {
        "title": "Test RP",
        "genre": "fantasy",
        "rating": "PG-13",
        "posting_order": "free-form",
        "min_post_length": 100,
        "dice_enabled": True
    }
    
    schema = RoleplayProjectCreate(**data)
    assert schema.genre == "fantasy"
    assert schema.min_post_length == 100

def test_roleplay_project_create_invalid_genre():
    """Test invalid genre raises validation error"""
    data = {
        "title": "Test RP",
        "genre": "invalid_genre",  # Invalid
        "rating": "PG-13"
    }
    
    with pytest.raises(ValidationError) as exc_info:
        RoleplayProjectCreate(**data)
    
    assert "genre" in str(exc_info.value)

def test_character_create_valid():
    """Test valid character creation"""
    data = {
        "name": "Aria Shadowblade",
        "species": "Half-Elf",
        "short_description": "A rogue seeking redemption",
        "stats": {"strength": 12, "dexterity": 18}
    }
    
    schema = CharacterCreate(**data)
    assert schema.name == "Aria Shadowblade"
    assert schema.stats["dexterity"] == 18

def test_character_create_missing_name():
    """Test character without name fails"""
    data = {"species": "Elf"}
    
    with pytest.raises(ValidationError):
        CharacterCreate(**data)

def test_passage_create_valid():
    """Test valid passage creation"""
    data = {
        "character_id": 15,
        "content": {"type": "doc", "content": []},
        "scene_id": 2
    }
    
    schema = PassageCreate(**data)
    assert schema.character_id == 15
    assert schema.scene_id == 2

def test_passage_create_dice_roll_format():
    """Test dice roll validation"""
    data = {
        "character_id": 15,
        "content": {"type": "doc", "content": []},
        "dice_rolls": [
            {"roll": "2d6+3", "result": 11, "reason": "Attack"}
        ]
    }
    
    schema = PassageCreate(**data)
    assert len(schema.dice_rolls) == 1
    assert schema.dice_rolls[0]["roll"] == "2d6+3"
```

---

## Integration Tests

### API Endpoint Tests

**File:** `backend/tests/test_roleplay_api.py`

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    """HTTP client for API testing"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(test_user):
    """Generate auth headers with JWT token"""
    token = create_test_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_create_roleplay_project(client, auth_headers, db_session):
    """Test POST /roleplay/projects"""
    response = await client.post(
        "/api/v1/roleplay/projects",
        json={
            "title": "Test Roleplay",
            "genre": "fantasy",
            "rating": "PG-13",
            "dice_enabled": True
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Roleplay"
    assert data["genre"] == "fantasy"
    assert "folders" in data

@pytest.mark.asyncio
async def test_create_roleplay_unauthorized(client):
    """Test creating roleplay without auth fails"""
    response = await client.post(
        "/api/v1/roleplay/projects",
        json={"title": "Test"}
    )
    
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_roleplay_project(client, auth_headers, test_roleplay):
    """Test GET /roleplay/projects/{id}"""
    response = await client.get(
        f"/api/v1/roleplay/projects/{test_roleplay.id}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_roleplay.id
    assert "participant_count" in data
    assert "passage_count" in data

@pytest.mark.asyncio
async def test_create_character(client, auth_headers, test_roleplay):
    """Test POST /roleplay/projects/{id}/characters"""
    response = await client.post(
        f"/api/v1/roleplay/projects/{test_roleplay.id}/characters",
        json={
            "name": "Aria Shadowblade",
            "species": "Half-Elf",
            "stats": {"dexterity": 18}
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Aria Shadowblade"
    assert data["roleplay_id"] == test_roleplay.id

@pytest.mark.asyncio
async def test_post_passage(client, auth_headers, test_roleplay, test_character):
    """Test POST /roleplay/projects/{id}/passages"""
    response = await client.post(
        f"/api/v1/roleplay/projects/{test_roleplay.id}/passages",
        json={
            "character_id": test_character.id,
            "content": {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Test passage"}]}
                ]
            }
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["character_id"] == test_character.id
    assert data["word_count"] == 2
    assert "sequence_number" in data

@pytest.mark.asyncio
async def test_list_passages_pagination(client, auth_headers, test_roleplay):
    """Test GET /roleplay/projects/{id}/passages with pagination"""
    # Create 25 test passages
    for i in range(25):
        await create_test_passage(test_roleplay.id, sequence_number=i+1)
    
    # Request first page (limit 20)
    response = await client.get(
        f"/api/v1/roleplay/projects/{test_roleplay.id}/passages?limit=20",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["passages"]) == 20
    assert data["has_more"] is True
    assert "next_cursor" in data

@pytest.mark.asyncio
async def test_permission_checks(client, auth_headers, test_roleplay, other_user_headers):
    """Test non-participant cannot post passages"""
    response = await client.post(
        f"/api/v1/roleplay/projects/{test_roleplay.id}/passages",
        json={
            "character_id": 1,
            "content": {"type": "doc", "content": []}
        },
        headers=other_user_headers  # Different user
    )
    
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_compile_to_document(client, auth_headers, test_roleplay_with_passages):
    """Test POST /roleplay/projects/{id}/compile"""
    response = await client.post(
        f"/api/v1/roleplay/projects/{test_roleplay_with_passages.id}/compile",
        json={
            "attribution_style": "keep",
            "document_title": "Compiled Story"
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "document_id" in data
    assert data["passage_count"] > 0
    assert "word_count" in data
```

---

## E2E Tests (Playwright)

### Critical User Flows

**File:** `frontend/tests/roleplay.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Roleplay Studio', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="username"]', 'alice');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('create roleplay project', async ({ page }) => {
    // Navigate to projects
    await page.goto('/projects');
    
    // Click create project
    await page.click('button:has-text("New Project")');
    
    // Fill form
    await page.fill('input[name="title"]', 'Test Roleplay');
    await page.selectOption('select[name="project_type"]', 'roleplay');
    await page.fill('textarea[name="description"]', 'A test roleplay');
    
    // Set roleplay settings
    await page.selectOption('select[name="genre"]', 'fantasy');
    await page.selectOption('select[name="rating"]', 'PG-13');
    await page.check('input[name="dice_enabled"]');
    
    // Submit
    await page.click('button:has-text("Create")');
    
    // Verify redirect to roleplay studio
    await expect(page).toHaveURL(/\/roleplay\/\d+/);
    await expect(page.locator('h1')).toContainText('Test Roleplay');
  });

  test('create character and post passage', async ({ page }) => {
    // Go to test roleplay
    await page.goto('/roleplay/1');
    
    // Create character
    await page.click('button:has-text("New Character")');
    await page.fill('input[name="name"]', 'Aria Shadowblade');
    await page.fill('input[name="species"]', 'Half-Elf');
    await page.fill('textarea[name="short_description"]', 'A stealthy rogue');
    await page.click('button:has-text("Create Character")');
    
    // Verify character appears in selector
    await expect(page.locator('select[name="character"]')).toContainText('Aria Shadowblade');
    
    // Post passage
    await page.selectOption('select[name="character"]', 'Aria Shadowblade');
    await page.fill('.tiptap-editor', 'Aria crept through the shadows, her footsteps silent.');
    await page.click('button:has-text("Post")');
    
    // Verify passage appears in feed
    await expect(page.locator('.passage-card').first()).toContainText('Aria crept through');
  });

  test('react to passage', async ({ page }) => {
    await page.goto('/roleplay/1');
    
    // Find first passage and click heart reaction
    await page.locator('.passage-card').first().locator('button[title="React: Heart"]').click();
    
    // Verify reaction count updates
    await expect(page.locator('.passage-card').first().locator('.reaction-count')).toContainText('1');
  });

  test('compile to document', async ({ page }) => {
    await page.goto('/roleplay/1');
    
    // Click compile button
    await page.click('button:has-text("Compile")');
    
    // Select options in modal
    await page.check('input[value="keep-attribution"]');
    await page.fill('input[name="document_title"]', 'Full Story');
    
    // Compile
    await page.click('button:has-text("Compile to Document")');
    
    // Verify success and redirect
    await expect(page.locator('.toast')).toContainText('Document created');
    await expect(page).toHaveURL(/\/documents\/\d+/);
  });
});
```

---

## Load Testing (Optional)

### Using Locust

**File:** `backend/tests/load/locustfile.py`

```python
from locust import HttpUser, task, between

class RoleplayUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login and get token"""
        import os
        response = self.client.post("/api/v1/auth/login", json={
            "username": "testuser",
            "password": os.getenv("TEST_USER_PASSWORD")
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def list_passages(self):
        """List passages (most common operation)"""
        self.client.get(
            "/api/v1/roleplay/projects/1/passages?limit=20",
            headers=self.headers
        )
    
    @task(1)
    def post_passage(self):
        """Post a new passage"""
        self.client.post(
            "/api/v1/roleplay/projects/1/passages",
            headers=self.headers,
            json={
                "character_id": 1,
                "content": {"type": "doc", "content": []}
            }
        )
    
    @task(2)
    def react_to_passage(self):
        """React to passage"""
        self.client.post(
            "/api/v1/roleplay/passages/1/react",
            headers=self.headers,
            json={"reaction_type": "heart"}
        )
```

**Run load test:**
```bash
locust -f backend/tests/load/locustfile.py --host=http://localhost:8000
```

---

## Manual Testing Checklist

### Pre-Deployment QA

- [ ] **Roleplay Creation**
  - [ ] Can create roleplay with all settings
  - [ ] Folders are auto-generated correctly
  - [ ] Roleplay appears in project list

- [ ] **Character Management**
  - [ ] Can create character with all fields
  - [ ] Can upload avatar image
  - [ ] Can edit character bio
  - [ ] Can add stats (JSONB)
  - [ ] Can retire character (soft delete)

- [ ] **Passage Posting**
  - [ ] Can select character from dropdown
  - [ ] Can write in TipTap editor
  - [ ] Word count updates live
  - [ ] Can post passage
  - [ ] Passage appears in feed immediately
  - [ ] Sequence numbers are correct

- [ ] **Reactions**
  - [ ] Can react to passage
  - [ ] Reaction count updates
  - [ ] Can change reaction
  - [ ] Can remove reaction

- [ ] **Scenes**
  - [ ] Can create scene
  - [ ] Can filter passages by scene
  - [ ] Can archive scene

- [ ] **Lore Wiki**
  - [ ] Can create lore entry
  - [ ] Can browse by category
  - [ ] Can search lore
  - [ ] Can edit own lore

- [ ] **Compilation**
  - [ ] Can compile passages to document
  - [ ] Attribution styles work correctly
  - [ ] Scene filtering works
  - [ ] Character filtering works
  - [ ] Document is created in correct folder

- [ ] **Permissions**
  - [ ] Non-participants cannot access private roleplay
  - [ ] Editors can post passages
  - [ ] Commenters can only react
  - [ ] Viewers are read-only
  - [ ] Owner can delete roleplay

- [ ] **Edge Cases**
  - [ ] Very long passages (10,000+ words)
  - [ ] Empty passages rejected
  - [ ] Invalid dice expressions rejected
  - [ ] Special characters in names
  - [ ] Emoji in content

---

## Continuous Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test-roleplay.yml`

```yaml
name: Roleplay Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/app/models/roleplay.py'
      - 'backend/app/api/roleplay.py'
      - 'backend/app/schemas/roleplay.py'
      - 'backend/tests/test_roleplay_*'
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: workshelf_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_pass@localhost:5432/workshelf_test
        run: |
          cd backend
          pytest tests/test_roleplay_* -v --cov=app/models/roleplay --cov=app/api/roleplay --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

---

## Test Data Management

### Seed Script for Development

**File:** `backend/scripts/seed_roleplay_test_data.py`

```python
"""
Seed test roleplay data for development
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Project, RoleplayProject, RoleplayCharacter, RoleplayPassage
from app.core.config import settings

async def seed_test_data():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession)
    
    async with async_session() as session:
        # Create test roleplay
        project = Project(
            title="The Crystal Caves Adventure",
            project_type="roleplay",
            user_id=1,
            tenant_id=1
        )
        session.add(project)
        await session.flush()
        
        roleplay = RoleplayProject(
            project_id=project.id,
            genre="fantasy",
            rating="PG-13",
            dice_enabled=True
        )
        session.add(roleplay)
        await session.flush()
        
        # Create characters
        aria = RoleplayCharacter(
            roleplay_id=roleplay.id,
            user_id=1,
            name="Aria Shadowblade",
            species="Half-Elf",
            short_description="A stealthy rogue"
        )
        kael = RoleplayCharacter(
            roleplay_id=roleplay.id,
            user_id=2,
            name="Kael Ironheart",
            species="Human",
            short_description="A brave warrior"
        )
        session.add_all([aria, kael])
        await session.flush()
        
        # Create sample passages
        passages = [
            RoleplayPassage(
                roleplay_id=roleplay.id,
                user_id=1,
                character_id=aria.id,
                content="Aria crept through the darkened corridor...",
                sequence_number=1,
                word_count=20
            ),
            RoleplayPassage(
                roleplay_id=roleplay.id,
                user_id=2,
                character_id=kael.id,
                content="Kael followed behind, sword drawn...",
                sequence_number=2,
                word_count=15
            )
        ]
        session.add_all(passages)
        
        await session.commit()
        print("✅ Test data seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
```

**Run:** `python backend/scripts/seed_roleplay_test_data.py`

---

## Summary

### Test Execution Commands

```bash
# Run all roleplay tests
pytest backend/tests/test_roleplay_* -v

# Run with coverage
pytest backend/tests/test_roleplay_* --cov=app --cov-report=html

# Run specific test file
pytest backend/tests/test_roleplay_api.py -v

# Run load tests
locust -f backend/tests/load/locustfile.py --host=http://localhost:8000

# Run E2E tests
npx playwright test frontend/tests/roleplay.spec.ts
```

### Coverage Reports

- **HTML Report:** `backend/htmlcov/index.html`
- **Terminal:** Shows missing lines
- **CI:** Uploads to Codecov

### Success Criteria

- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ E2E tests for critical flows pass
- ✅ >80% code coverage
- ✅ No critical bugs found in manual QA
- ✅ Load tests show acceptable performance (<200ms p95)
