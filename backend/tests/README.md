# Test Suite Guide

## Authentication Mocking

**All tests automatically run as authenticated users!**

The `conftest.py` file globally mocks Keycloak authentication for the entire test suite:
- No need to pass Authorization headers
- No need to register/login users
- Every API call runs as a logged-in user

### Default Test User

```python
{
    "sub": "test-keycloak-id-123",
    "email": "testuser@example.com", 
    "preferred_username": "testuser",
    "name": "Test User"
}
```

### Writing Tests

**Simple Example:**
```python
@pytest.mark.asyncio
async def test_my_feature():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Auth is automatic - just make the request!
        response = await client.get("/api/v1/my-endpoint")
        assert response.status_code == 200
```

**No Need For:**
- ❌ Login endpoints
- ❌ Token management  
- ❌ Authorization headers
- ❌ User registration

### Testing Admin Features

Use the `override_with_staff_user` fixture:

```python
@pytest.mark.asyncio
async def test_admin_feature(override_with_staff_user):
    async with AsyncClient(app=app, base_url="http://test") as client:
        # This test runs as a staff user with admin privileges
        response = await client.get("/api/v1/admin/endpoint")
        assert response.status_code == 200
```

### Custom User Testing

Use the `custom_user_override` fixture:

```python
@pytest.mark.asyncio
async def test_specific_user(custom_user_override):
    user_data = {
        "sub": "my-custom-id",
        "email": "custom@example.com",
        "preferred_username": "customuser"
    }
    
    with custom_user_override(user_data):
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/profile")
            assert response.json()["email"] == "custom@example.com"
```

## Running Tests

```bash
# Run all tests
docker exec workshelf-backend pytest

# Run specific test file
docker exec workshelf-backend pytest tests/test_phase7.py

# Run specific test
docker exec workshelf-backend pytest tests/test_phase7.py::test_create_plagiarism_check

# Run with verbose output
docker exec workshelf-backend pytest -v

# Run with print statements visible
docker exec workshelf-backend pytest -s
```

## Test Organization

- **test_health.py** - Basic health checks (sync tests)
- **test_document_access_control.py** - Access control unit tests
- **test_epub_moderation_access.py** - EPUB moderation access tests
- **test_phase5.py** - Phase 5 studio customization tests (✅ auth mocked)
- **test_phase7.py** - Phase 7 content integrity/export tests (✅ auth mocked)
- **test_group_multitenant.py** - Group multi-tenant features (needs refactoring)
- **test_jwt_verification.py** - JWT verification tests (complex mocking needed)

## Current Status

- ✅ **27 passing** - Core functionality
- ⏭️ **85 skipped** - Waiting for auth mocking or refactoring
- ❌ **0 failing**

### Recently Enabled

- ✅ Phase 7 tests now use conftest.py auth mocking
- Tests no longer need manual login/registration
- Clean, simple test patterns

### Next Steps

1. Apply same pattern to `test_phase5.py`
2. Refactor `test_group_multitenant.py` to use AsyncClient in test body
3. Apply conftest.py auth mocking to group tests
4. Fix any data setup issues (users/tenants may need to exist)

## Common Issues

### 404 Errors or SQLAlchemy Type Errors

The tests are getting 404 errors or database type mismatches because:

**Root Cause**: The mock test user doesn't exist in the database yet.

When you create a document or access protected endpoints, the API needs:
1. A user record in the `users` table
2. A tenant record in the `tenants` table  
3. Proper relationships set up

**Solutions**:

1. **Call /auth/me first** (recommended for quick testing):
   ```python
   @pytest.mark.asyncio
   async def test_something():
       async with AsyncClient(app=app, base_url="http://test") as client:
           # Auto-create user in database
           await client.get("/api/v1/auth/me")
           
           # Now make your actual test requests
           response = await client.get("/api/v1/documents")
   ```

2. **Use a test database** (recommended for CI/CD):
   - Create a separate test database
   - Add fixtures to set up test users/tenants before each test
   - Clean up after tests

3. **Add setup fixtures** (recommended for the long term):
   ```python
   @pytest.fixture
   async def setup_test_user(test_db_session):
       """Create test user and tenant in database"""
       user = User(
           keycloak_id="test-keycloak-id-123",
           email="testuser@example.com",
           username="testuser",
           display_name="Test User"
       )
       # ... create tenant, save to DB
       yield user
       # ... cleanup
   ```

**Why This Happens**:
- conftest.py mocks the Keycloak authentication (✅ working)
- Tests send authenticated requests (✅ working)
- But the API expects database records to exist (❌ missing)
- Creating documents requires a tenant_id and user_id that exist in the database

### Database State

Tests currently use the same database as development. For isolated testing:
- Set `TEST_DATABASE_URL` environment variable
- Use the `test_db_session` fixture for isolated transactions
- Add setup/teardown fixtures to manage test data

## Migration from Old Pattern

**Old (manual auth):**
```python
@pytest.mark.asyncio
async def test_old_way():
    async with AsyncClient(app=app) as client:
        # Register
        await client.post("/register", json=user_data)
        
        # Login
        login_response = await client.post("/login", data=credentials)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Make request
        response = await client.get("/endpoint", headers=headers)
```

**New (automatic auth):**
```python
@pytest.mark.asyncio
async def test_new_way():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Just make the request - auth is automatic!
        response = await client.get("/api/v1/endpoint")
```

Much cleaner! 🎉
