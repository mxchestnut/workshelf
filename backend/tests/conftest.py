"""
Pytest configuration and shared fixtures
Provides Keycloak authentication mocking for all tests

KEY CONCEPT: Authentication is automatically mocked for ALL tests.
- Every API call in tests runs as an authenticated user
- No need to pass auth headers or tokens
- conftest.py overrides get_current_user globally

The mock user has ID: test-keycloak-id-123
"""
import pytest
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.core.auth import get_current_user, get_current_user_id
from app.main import app


# Test database URL (can be overridden with TEST_DATABASE_URL env var)
TEST_DATABASE_URL = "postgresql+asyncpg://workshelf:workshelf@postgres/workshelf_test"


@pytest.fixture(scope="function")
def anyio_backend():
    """Configure anyio to use asyncio backend"""
    return "asyncio"


# ============================================================================
# Keycloak Authentication Mocking
# ============================================================================


def mock_get_current_user() -> Dict[str, Any]:
    """
    Mock Keycloak user for tests
    Returns a fake JWT payload that simulates a logged-in user

    This replaces the real get_current_user dependency that would normally
    validate JWT tokens from Keycloak.
    """
    return {
        "sub": "test-keycloak-id-123",
        "email": "testuser@example.com",
        "preferred_username": "testuser",
        "name": "Test User",
        "given_name": "Test",
        "family_name": "User",
        "email_verified": True,
        "realm_access": {"roles": ["user"]},
    }


def mock_get_current_user_id() -> str:
    """Mock Keycloak user ID for tests"""
    return "test-keycloak-id-123"


# Staff/admin user mock
def mock_get_staff_user() -> Dict[str, Any]:
    """Mock Keycloak staff user with admin privileges"""
    return {
        "sub": "staff-keycloak-id-456",
        "email": "staff@workshelf.dev",
        "preferred_username": "staffuser",
        "name": "Staff User",
        "given_name": "Staff",
        "family_name": "User",
        "email_verified": True,
        "realm_access": {"roles": ["user", "staff", "admin"]},
    }


def mock_get_staff_user_id() -> str:
    """Mock Keycloak staff user ID"""
    return "staff-keycloak-id-456"


# ============================================================================
# Apply Authentication Mocks
# ============================================================================

# Override the authentication dependencies globally for all tests
app.dependency_overrides[get_current_user] = mock_get_current_user
app.dependency_overrides[get_current_user_id] = mock_get_current_user_id


# ============================================================================
# Custom Test Users
# ============================================================================


@pytest.fixture
def test_user_payload() -> Dict[str, Any]:
    """Get the standard test user payload"""
    return mock_get_current_user()


@pytest.fixture
def staff_user_payload() -> Dict[str, Any]:
    """Get a staff user payload for testing admin features"""
    return mock_get_staff_user()


@pytest.fixture
def override_with_staff_user():
    """
    Context manager to temporarily override the current user with a staff user

    Usage:
        def test_admin_feature(override_with_staff_user):
            # This test will run as a staff user
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.get("/admin/endpoint")
                assert response.status_code == 200
    """
    # Save original
    original_user = app.dependency_overrides.get(get_current_user)
    original_user_id = app.dependency_overrides.get(get_current_user_id)

    # Override with staff user
    app.dependency_overrides[get_current_user] = mock_get_staff_user
    app.dependency_overrides[get_current_user_id] = mock_get_staff_user_id

    yield

    # Restore original
    if original_user:
        app.dependency_overrides[get_current_user] = original_user
    if original_user_id:
        app.dependency_overrides[get_current_user_id] = original_user_id


@pytest.fixture
def custom_user_override():
    """
    Factory fixture to create custom user overrides

    Usage:
        def test_custom_user(custom_user_override):
            with custom_user_override({"sub": "custom-id", "email": "custom@example.com"}):
                # Test with custom user
                pass
    """
    from contextlib import contextmanager

    @contextmanager
    def _override(user_data: Dict[str, Any]):
        # Save original
        original_user = app.dependency_overrides.get(get_current_user)
        original_user_id = app.dependency_overrides.get(get_current_user_id)

        # Override with custom user
        app.dependency_overrides[get_current_user] = lambda: user_data
        app.dependency_overrides[get_current_user_id] = lambda: user_data.get("sub")

        yield

        # Restore original
        if original_user:
            app.dependency_overrides[get_current_user] = original_user
        if original_user_id:
            app.dependency_overrides[get_current_user_id] = original_user_id

    return _override


# ============================================================================
# Database Fixtures (Optional - for integration tests)
# ============================================================================


@pytest.fixture(scope="function", autouse=True)
async def setup_test_user_in_db():
    """
    Auto-create test user and tenant in database for each test function.
    This runs automatically before each test.
    """
    from app.core.database import get_db_engine
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

    engine = get_db_engine()
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        try:
            # Check if test tenant exists
            result = await session.execute(
                text("SELECT id FROM tenants WHERE slug = 'test-workspace' LIMIT 1")
            )
            tenant = result.first()

            if not tenant:
                # Create test tenant with all required fields
                # (including those with defaults since raw SQL doesn't use model defaults)
                await session.execute(
                    text(
                        """
                        INSERT INTO tenants (
                            name, slug, type, is_active, is_verified,
                            plan, max_users, max_storage_gb,
                            created_at, updated_at
                        )
                        VALUES (
                            'Test Workspace', 'test-workspace', 'standard', true, false,
                            'free', 5, 1,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (slug) DO NOTHING
                    """
                    )
                )
                await session.commit()

                # Get tenant ID
                result = await session.execute(
                    text("SELECT id FROM tenants WHERE slug = 'test-workspace' LIMIT 1")
                )
                tenant = result.first()

            tenant_id = tenant[0]

            # Check if test user exists
            result = await session.execute(
                text(
                    "SELECT id FROM users WHERE keycloak_id = 'test-keycloak-id-123' LIMIT 1"
                )
            )
            user = result.first()

            if not user:
                # Create test user with all required NOT NULL columns
                await session.execute(
                    text(
                        """
                        INSERT INTO users (
                            keycloak_id, email, username, tenant_id,
                            newsletter_opt_in, sms_opt_in, house_rules_accepted,
                            is_active, is_verified, is_staff, is_approved,
                            reading_score, beta_score, writer_score,
                            matrix_onboarding_seen,
                            created_at, updated_at
                        )
                        VALUES (
                            'test-keycloak-id-123', 'testuser@example.com', 'testuser', :tenant_id,
                            false, false, false,
                            true, true, false, false,
                            0, 0, 0,
                            false,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                        ON CONFLICT (keycloak_id) DO NOTHING
                    """
                    ),
                    {"tenant_id": tenant_id},
                )
                await session.commit()
        except Exception as e:
            # If tables don't exist, fail fast with clear error message
            print(f"❌ Database setup failed: {e}")
            print("💡 Hint: Run 'alembic upgrade head' before tests")
            await engine.dispose()
            raise RuntimeError(
                f"Test database setup failed. Tables may not exist. "
                f"Error: {e}\n"
                f"Solution: Ensure database migrations are run before tests."
            ) from e

    await engine.dispose()
    yield


@pytest.fixture
async def test_db_session():
    """
    Create a test database session (optional - use only for integration tests)

    Note: Most tests use the real database with the standard get_db dependency.
    This fixture is for tests that need isolated database state.
    """
    # Create test engine
    engine = create_async_engine(
        TEST_DATABASE_URL, poolclass=NullPool, echo=False  # Disable pooling for tests
    )

    # Create session
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    try:
        async with async_session() as session:
            yield session
    finally:
        await engine.dispose()


# ============================================================================
# Cleanup
# ============================================================================


@pytest.fixture(autouse=True)
async def cleanup_test_data():
    """
    Auto-cleanup fixture that runs after each test
    Ensures database connections are properly closed
    """
    yield
    # Cleanup database connections to prevent "Event loop is closed" errors
    from app.core.database import get_db_engine
    try:
        engine = get_db_engine()
        await engine.dispose()
    except Exception:
        pass  # Ignore errors during cleanup
