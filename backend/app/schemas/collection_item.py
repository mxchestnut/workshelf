"""
Workspace Collection Item Schemas
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class CollectionItemBase(BaseModel):
    """Base schema for collection items"""

    item_type: str = Field(..., description="Type of item: document, post, ebook, project")
    item_id: int = Field(..., description="ID of the item")
    note: Optional[str] = Field(None, description="Optional note about why this item was added")

    @field_validator("item_type")
    @classmethod
    def validate_item_type(cls, v: str) -> str:
        allowed = ["document", "post", "ebook", "project"]
        if v not in allowed:
            raise ValueError(f"item_type must be one of {allowed}")
        return v


class CollectionItemCreate(CollectionItemBase):
    """Schema for creating a collection item"""

    pass


class CollectionItemResponse(CollectionItemBase):
    """Schema for collection item responses"""

    id: str
    collection_id: str
    added_by: int
    created_at: datetime
    updated_at: Optional[datetime]

    @field_validator("id", "collection_id", mode="before")
    @classmethod
    def convert_id_to_str(cls, v) -> str:
        return str(v) if v is not None else None

    class Config:
        from_attributes = True
