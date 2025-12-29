"""
Collections API
Universal bookmarking system - save any content type to named collections
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import joinedload
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import Collection, CollectionItem, CollectionItemType
from app.services.user_service import get_or_create_user_from_keycloak

router = APIRouter(prefix="/collections", tags=["collections"])


# Pydantic Schemas
class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: bool = False


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_public: Optional[bool] = None


class CollectionItemCreate(BaseModel):
    item_type: CollectionItemType
    item_id: int
    note: Optional[str] = None


class CollectionItemUpdate(BaseModel):
    note: Optional[str] = None


class CollectionItemResponse(BaseModel):
    id: int
    item_type: CollectionItemType
    item_id: int
    note: Optional[str]
    created_at: str
    
    model_config = ConfigDict(from_attributes=True)


class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_public: bool
    created_at: str
    updated_at: Optional[str]
    item_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class CollectionDetailResponse(CollectionResponse):
    items: List[CollectionItemResponse] = []


# Endpoints

@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    collection_data: CollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new collection"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    collection = Collection(
        user_id=user.id,
        name=collection_data.name,
        description=collection_data.description,
        is_public=1 if collection_data.is_public else 0
    )
    
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        is_public=bool(collection.is_public),
        created_at=collection.created_at.isoformat(),
        updated_at=collection.updated_at.isoformat() if collection.updated_at else None,
        item_count=0
    )


@router.get("", response_model=List[CollectionResponse])
async def list_collections(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all collections for the current user"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    # Query collections with item counts
    query = (
        select(Collection, func.count(CollectionItem.id).label('item_count'))
        .outerjoin(CollectionItem, Collection.id == CollectionItem.collection_id)
        .where(Collection.user_id == user.id)
        .group_by(Collection.id)
        .order_by(Collection.created_at.desc())
    )
    
    result = await db.execute(query)
    collections_with_counts = result.all()
    
    return [
        CollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            is_public=bool(collection.is_public),
            created_at=collection.created_at.isoformat(),
            updated_at=collection.updated_at.isoformat() if collection.updated_at else None,
            item_count=item_count
        )
        for collection, item_count in collections_with_counts
    ]


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific collection with all its items"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    # Query collection with items
    query = (
        select(Collection)
        .options(joinedload(Collection.items))
        .where(Collection.id == collection_id, Collection.user_id == user.id)
    )
    
    result = await db.execute(query)
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    return CollectionDetailResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        is_public=bool(collection.is_public),
        created_at=collection.created_at.isoformat(),
        updated_at=collection.updated_at.isoformat() if collection.updated_at else None,
        item_count=len(collection.items),
        items=[
            CollectionItemResponse(
                id=item.id,
                item_type=item.item_type,
                item_id=item.item_id,
                note=item.note,
                created_at=item.created_at.isoformat()
            )
            for item in collection.items
        ]
    )


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int,
    collection_data: CollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a collection's name, description, or visibility"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    result = await db.execute(query)
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    if collection_data.name is not None:
        collection.name = collection_data.name
    if collection_data.description is not None:
        collection.description = collection_data.description
    if collection_data.is_public is not None:
        collection.is_public = 1 if collection_data.is_public else 0
    
    await db.commit()
    await db.refresh(collection)
    
    # Get item count
    count_query = select(func.count()).where(CollectionItem.collection_id == collection.id)
    count_result = await db.execute(count_query)
    item_count = count_result.scalar()
    
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        is_public=bool(collection.is_public),
        created_at=collection.created_at.isoformat(),
        updated_at=collection.updated_at.isoformat() if collection.updated_at else None,
        item_count=item_count
    )


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a collection and all its items"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    result = await db.execute(query)
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    await db.delete(collection)
    await db.commit()


# Collection Items Endpoints

@router.post("/{collection_id}/items", response_model=CollectionItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item_to_collection(
    collection_id: int,
    item_data: CollectionItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add an item to a collection (save a post, ebook, etc.)"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    # Verify collection belongs to user
    query = select(Collection).where(Collection.id == collection_id, Collection.user_id == user.id)
    result = await db.execute(query)
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Check if item already exists in collection
    check_query = select(CollectionItem).where(
        CollectionItem.collection_id == collection_id,
        CollectionItem.item_type == item_data.item_type,
        CollectionItem.item_id == item_data.item_id
    )
    check_result = await db.execute(check_query)
    existing = check_result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Item already exists in this collection")
    
    # Add item
    item = CollectionItem(
        collection_id=collection_id,
        item_type=item_data.item_type,
        item_id=item_data.item_id,
        note=item_data.note
    )
    
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return CollectionItemResponse(
        id=item.id,
        item_type=item.item_type,
        item_id=item.item_id,
        note=item.note,
        created_at=item.created_at.isoformat()
    )


@router.patch("/{collection_id}/items/{item_id}", response_model=CollectionItemResponse)
async def update_collection_item(
    collection_id: int,
    item_id: int,
    item_data: CollectionItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an item's note"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    # Verify collection belongs to user
    query = (
        select(CollectionItem)
        .join(Collection, CollectionItem.collection_id == Collection.id)
        .where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id,
            Collection.user_id == user.id
        )
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item_data.note is not None:
        item.note = item_data.note
    
    await db.commit()
    await db.refresh(item)
    
    return CollectionItemResponse(
        id=item.id,
        item_type=item.item_type,
        item_id=item.item_id,
        note=item.note,
        created_at=item.created_at.isoformat()
    )


@router.delete("/{collection_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item_from_collection(
    collection_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove an item from a collection"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    # Verify collection belongs to user
    query = (
        select(CollectionItem)
        .join(Collection, CollectionItem.collection_id == Collection.id)
        .where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id,
            Collection.user_id == user.id
        )
    )
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await db.delete(item)
    await db.commit()


# Utility endpoints

@router.get("/check/{item_type}/{item_id}")
async def check_item_saved(
    item_type: CollectionItemType,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Check which collections contain a specific item"""
    user = await get_or_create_user_from_keycloak(db, current_user)
    
    query = (
        select(Collection)
        .join(CollectionItem, Collection.id == CollectionItem.collection_id)
        .where(
            Collection.user_id == user.id,
            CollectionItem.item_type == item_type,
            CollectionItem.item_id == item_id
        )
    )
    
    result = await db.execute(query)
    collections = result.scalars().all()
    
    return {
        "is_saved": len(collections) > 0,
        "collections": [
            {
                "id": col.id,
                "name": col.name
            }
            for col in collections
        ]
    }
