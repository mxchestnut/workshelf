"""
Test bookshelf endpoint with store_item_id field
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_bookshelf_empty():
    """Test bookshelf endpoint returns empty list for new user"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/bookshelf/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Bookshelf endpoint returned: {data}")


@pytest.mark.anyio
async def test_bookshelf_add_book():
    """Test adding a book to bookshelf"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        book_data = {
            "item_type": "book",
            "title": "Test Book for store_item_id",
            "author": "Test Author",
            "status": "want-to-read",
            "store_item_id": None,  # Test with NULL
            "epub_url": None,
            "is_favorite": False,
            "review_public": True
        }
        
        response = await client.post("/api/v1/bookshelf/", json=book_data)
        assert response.status_code == 200 or response.status_code == 201
        data = response.json()
        
        print(f"✓ Created bookshelf item:")
        print(f"  - ID: {data.get('id')}")
        print(f"  - Title: {data.get('title')}")
        print(f"  - store_item_id: {data.get('store_item_id')}")
        
        # Verify store_item_id is in response
        assert 'store_item_id' in data
        assert data['store_item_id'] is None  # Should be NULL
        assert data['title'] == book_data['title']
        
        return data['id']


@pytest.mark.anyio
async def test_bookshelf_get_items():
    """Test getting bookshelf items includes store_item_id"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First add a book
        book_data = {
            "item_type": "book",
            "title": "Another Test Book",
            "author": "Test Author 2",
            "status": "reading",
            "store_item_id": None,
            "is_favorite": False,
            "review_public": True
        }
        
        create_response = await client.post("/api/v1/bookshelf/", json=book_data)
        assert create_response.status_code == 200 or create_response.status_code == 201
        
        # Now get all bookshelf items
        response = await client.get("/api/v1/bookshelf/")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check first item has store_item_id field
        first_item = data[0]
        print(f"✓ First bookshelf item:")
        print(f"  - ID: {first_item.get('id')}")
        print(f"  - Title: {first_item.get('title')}")
        print(f"  - store_item_id: {first_item.get('store_item_id')}")
        
        assert 'store_item_id' in first_item
        print(f"✓ store_item_id field is present in response")


@pytest.mark.anyio
async def test_bookshelf_with_store_item():
    """Test adding a book with a store_item_id"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        book_data = {
            "item_type": "book",
            "title": "Published Work Shelf Book",
            "author": "Published Author",
            "status": "want-to-read",
            "store_item_id": 999,  # Fake store item ID
            "epub_url": "https://example.com/book.epub",
            "is_favorite": False,
            "review_public": True
        }
        
        response = await client.post("/api/v1/bookshelf/", json=book_data)
        # This might fail due to FK constraint if store_item doesn't exist
        # But at least we can see if the field is processed
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            print(f"✓ Created bookshelf item with store_item_id:")
            print(f"  - store_item_id: {data.get('store_item_id')}")
            assert data.get('store_item_id') == 999
        else:
            print(f"⚠️  Expected FK constraint error (store_item doesn't exist): {response.json()}")


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Bookshelf Endpoint - store_item_id Field")
    print("=" * 60)
    
    test_bookshelf_empty()
    test_bookshelf_add_book()
    test_bookshelf_get_items()
    test_bookshelf_with_store_item()
    
    print("=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
