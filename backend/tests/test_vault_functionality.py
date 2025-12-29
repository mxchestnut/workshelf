"""
Test vault and bookshelf functionality
Tests CRUD operations for vault articles, reading lists, and recommendations

These tests verify:
1. Vault article creation and retrieval
2. Reading list management
3. Book recommendations
4. Vault item access control
"""
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.vault import VaultArticle
from app.models.reading_list import ReadingList, ReadingListItem
from app.models.user import User


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user for vault tests"""
    user = User(
        keycloak_id="vault-test-user-123",
        email="vaultuser@example.com",
        username="vaultuser",
        display_name="Vault Test User"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def other_user(db_session: AsyncSession) -> User:
    """Create another test user for access control tests"""
    user = User(
        keycloak_id="other-user-456",
        email="otheruser@example.com",
        username="otheruser",
        display_name="Other User"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestVaultArticles:
    """Test vault article CRUD operations"""
    
    @pytest.mark.asyncio
    async def test_create_vault_article(self, db_session: AsyncSession, test_user: User):
        """Test creating a new vault article"""
        article = VaultArticle(
            user_id=test_user.id,
            title="Test Article",
            content="This is test content",
            source_url="https://example.com/article"
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)
        
        assert article.id is not None
        assert article.user_id == test_user.id
        assert article.title == "Test Article"
        assert article.content == "This is test content"
        assert article.created_at is not None
    
    @pytest.mark.asyncio
    async def test_retrieve_user_vault_articles(self, db_session: AsyncSession, test_user: User):
        """Test retrieving all vault articles for a user"""
        # Create multiple articles
        article1 = VaultArticle(
            user_id=test_user.id,
            title="Article 1",
            content="Content 1"
        )
        article2 = VaultArticle(
            user_id=test_user.id,
            title="Article 2",
            content="Content 2"
        )
        db_session.add_all([article1, article2])
        await db_session.commit()
        
        # Retrieve articles
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == test_user.id)
            .order_by(VaultArticle.created_at.desc())
        )
        articles = result.scalars().all()
        
        assert len(articles) == 2
        assert articles[0].title in ["Article 1", "Article 2"]
        assert articles[1].title in ["Article 1", "Article 2"]
    
    @pytest.mark.asyncio
    async def test_update_vault_article(self, db_session: AsyncSession, test_user: User):
        """Test updating a vault article"""
        article = VaultArticle(
            user_id=test_user.id,
            title="Original Title",
            content="Original Content"
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)
        
        # Update article
        article.title = "Updated Title"
        article.content = "Updated Content"
        await db_session.commit()
        await db_session.refresh(article)
        
        assert article.title == "Updated Title"
        assert article.content == "Updated Content"
    
    @pytest.mark.asyncio
    async def test_delete_vault_article(self, db_session: AsyncSession, test_user: User):
        """Test deleting a vault article"""
        article = VaultArticle(
            user_id=test_user.id,
            title="To Delete",
            content="Will be deleted"
        )
        db_session.add(article)
        await db_session.commit()
        article_id = article.id
        
        # Delete article
        await db_session.delete(article)
        await db_session.commit()
        
        # Verify deletion
        result = await db_session.execute(
            select(VaultArticle).where(VaultArticle.id == article_id)
        )
        deleted_article = result.scalar_one_or_none()
        
        assert deleted_article is None
    
    @pytest.mark.asyncio
    async def test_vault_article_access_control(
        self, 
        db_session: AsyncSession, 
        test_user: User, 
        other_user: User
    ):
        """Test that users can only access their own vault articles"""
        # Create article for test_user
        article = VaultArticle(
            user_id=test_user.id,
            title="Private Article",
            content="Only for test_user"
        )
        db_session.add(article)
        await db_session.commit()
        
        # Try to retrieve as other_user
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == other_user.id)
        )
        other_user_articles = result.scalars().all()
        
        # other_user should not see test_user's article
        assert len(other_user_articles) == 0
        
        # Verify test_user can see their own article
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == test_user.id)
        )
        test_user_articles = result.scalars().all()
        
        assert len(test_user_articles) == 1
        assert test_user_articles[0].title == "Private Article"


class TestReadingLists:
    """Test reading list functionality"""
    
    @pytest.mark.asyncio
    async def test_create_reading_list(self, db_session: AsyncSession, test_user: User):
        """Test creating a new reading list"""
        reading_list = ReadingList(
            user_id=test_user.id,
            name="To Read",
            description="Books I want to read"
        )
        db_session.add(reading_list)
        await db_session.commit()
        await db_session.refresh(reading_list)
        
        assert reading_list.id is not None
        assert reading_list.user_id == test_user.id
        assert reading_list.name == "To Read"
        assert reading_list.description == "Books I want to read"
    
    @pytest.mark.asyncio
    async def test_add_item_to_reading_list(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test adding a vault article to a reading list"""
        # Create reading list
        reading_list = ReadingList(
            user_id=test_user.id,
            name="Currently Reading"
        )
        db_session.add(reading_list)
        await db_session.commit()
        await db_session.refresh(reading_list)
        
        # Create vault article
        article = VaultArticle(
            user_id=test_user.id,
            title="Book to Read",
            content="Content"
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)
        
        # Add article to reading list
        list_item = ReadingListItem(
            reading_list_id=reading_list.id,
            vault_article_id=article.id
        )
        db_session.add(list_item)
        await db_session.commit()
        
        # Verify item was added
        result = await db_session.execute(
            select(ReadingListItem)
            .where(ReadingListItem.reading_list_id == reading_list.id)
        )
        items = result.scalars().all()
        
        assert len(items) == 1
        assert items[0].vault_article_id == article.id
    
    @pytest.mark.asyncio
    async def test_retrieve_reading_list_items(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test retrieving all items in a reading list"""
        # Create reading list
        reading_list = ReadingList(
            user_id=test_user.id,
            name="My List"
        )
        db_session.add(reading_list)
        await db_session.commit()
        
        # Create multiple articles
        articles = [
            VaultArticle(user_id=test_user.id, title=f"Book {i}", content=f"Content {i}")
            for i in range(3)
        ]
        db_session.add_all(articles)
        await db_session.commit()
        
        # Add articles to reading list
        for article in articles:
            list_item = ReadingListItem(
                reading_list_id=reading_list.id,
                vault_article_id=article.id
            )
            db_session.add(list_item)
        await db_session.commit()
        
        # Retrieve items with joined articles
        result = await db_session.execute(
            select(ReadingListItem)
            .where(ReadingListItem.reading_list_id == reading_list.id)
        )
        items = result.scalars().all()
        
        assert len(items) == 3
    
    @pytest.mark.asyncio
    async def test_remove_item_from_reading_list(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test removing an item from a reading list"""
        # Create reading list and article
        reading_list = ReadingList(user_id=test_user.id, name="List")
        article = VaultArticle(user_id=test_user.id, title="Book", content="Content")
        db_session.add_all([reading_list, article])
        await db_session.commit()
        
        # Add to list
        list_item = ReadingListItem(
            reading_list_id=reading_list.id,
            vault_article_id=article.id
        )
        db_session.add(list_item)
        await db_session.commit()
        
        # Remove from list
        await db_session.delete(list_item)
        await db_session.commit()
        
        # Verify removal
        result = await db_session.execute(
            select(ReadingListItem)
            .where(ReadingListItem.reading_list_id == reading_list.id)
        )
        items = result.scalars().all()
        
        assert len(items) == 0
    
    @pytest.mark.asyncio
    async def test_delete_reading_list(self, db_session: AsyncSession, test_user: User):
        """Test deleting a reading list (should cascade delete items)"""
        # Create reading list with items
        reading_list = ReadingList(user_id=test_user.id, name="To Delete")
        article = VaultArticle(user_id=test_user.id, title="Book", content="Content")
        db_session.add_all([reading_list, article])
        await db_session.commit()
        
        list_item = ReadingListItem(
            reading_list_id=reading_list.id,
            vault_article_id=article.id
        )
        db_session.add(list_item)
        await db_session.commit()
        
        list_id = reading_list.id
        
        # Delete reading list
        await db_session.delete(reading_list)
        await db_session.commit()
        
        # Verify list is deleted
        result = await db_session.execute(
            select(ReadingList).where(ReadingList.id == list_id)
        )
        deleted_list = result.scalar_one_or_none()
        assert deleted_list is None
        
        # Verify items are also deleted (cascade)
        result = await db_session.execute(
            select(ReadingListItem)
            .where(ReadingListItem.reading_list_id == list_id)
        )
        items = result.scalars().all()
        assert len(items) == 0


class TestVaultRecommendations:
    """Test book recommendation features"""
    
    @pytest.mark.asyncio
    async def test_vault_article_has_metadata(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test that vault articles can store book metadata"""
        article = VaultArticle(
            user_id=test_user.id,
            title="The Great Gatsby",
            content="Full book content here...",
            source_url="https://example.com/gatsby",
            author="F. Scott Fitzgerald",
            isbn="9780743273565"
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)
        
        assert article.author == "F. Scott Fitzgerald"
        assert article.isbn == "9780743273565"
    
    @pytest.mark.asyncio
    async def test_search_vault_by_title(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test searching vault articles by title"""
        # Create multiple articles
        articles = [
            VaultArticle(user_id=test_user.id, title="Python Programming", content="Content 1"),
            VaultArticle(user_id=test_user.id, title="JavaScript Basics", content="Content 2"),
            VaultArticle(user_id=test_user.id, title="Python Advanced", content="Content 3"),
        ]
        db_session.add_all(articles)
        await db_session.commit()
        
        # Search for "Python"
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == test_user.id)
            .where(VaultArticle.title.ilike("%Python%"))
        )
        python_articles = result.scalars().all()
        
        assert len(python_articles) == 2
        assert all("Python" in article.title for article in python_articles)
    
    @pytest.mark.asyncio
    async def test_vault_article_with_tags(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test that vault articles can have associated tags"""
        article = VaultArticle(
            user_id=test_user.id,
            title="Machine Learning Guide",
            content="Content about ML",
            tags=["machine-learning", "ai", "python"]
        )
        db_session.add(article)
        await db_session.commit()
        await db_session.refresh(article)
        
        assert "machine-learning" in article.tags
        assert "ai" in article.tags
        assert len(article.tags) == 3


class TestVaultPerformance:
    """Test vault performance and optimization"""
    
    @pytest.mark.asyncio
    async def test_vault_query_pagination(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test that vault articles can be paginated efficiently"""
        # Create many articles
        articles = [
            VaultArticle(user_id=test_user.id, title=f"Article {i}", content=f"Content {i}")
            for i in range(50)
        ]
        db_session.add_all(articles)
        await db_session.commit()
        
        # Query first page (limit 10)
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == test_user.id)
            .order_by(VaultArticle.created_at.desc())
            .limit(10)
            .offset(0)
        )
        page1 = result.scalars().all()
        
        assert len(page1) == 10
        
        # Query second page
        result = await db_session.execute(
            select(VaultArticle)
            .where(VaultArticle.user_id == test_user.id)
            .order_by(VaultArticle.created_at.desc())
            .limit(10)
            .offset(10)
        )
        page2 = result.scalars().all()
        
        assert len(page2) == 10
        assert page1[0].id != page2[0].id  # Different pages
    
    @pytest.mark.asyncio
    async def test_vault_article_count(
        self, 
        db_session: AsyncSession, 
        test_user: User
    ):
        """Test counting total vault articles for a user"""
        from sqlalchemy import func
        
        # Create articles
        articles = [
            VaultArticle(user_id=test_user.id, title=f"Article {i}", content="Content")
            for i in range(25)
        ]
        db_session.add_all(articles)
        await db_session.commit()
        
        # Count articles
        result = await db_session.execute(
            select(func.count(VaultArticle.id))
            .where(VaultArticle.user_id == test_user.id)
        )
        count = result.scalar()
        
        assert count == 25
