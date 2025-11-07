"""
Store models for WorkShelf marketplace where authors can sell their books.
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Numeric, JSON, Index
from sqlalchemy.orm import relationship

from app.models.base import Base


class StoreItemStatus(str, Enum):
    """Status of a store item listing."""
    DRAFT = "draft"  # Author still preparing
    PENDING_REVIEW = "pending_review"  # Submitted for moderation
    ACTIVE = "active"  # Live in store
    INACTIVE = "inactive"  # Temporarily hidden
    REJECTED = "rejected"  # Failed moderation


class PurchaseStatus(str, Enum):
    """Status of a purchase transaction."""
    PENDING = "pending"  # Payment initiated
    COMPLETED = "completed"  # Payment successful, access granted
    FAILED = "failed"  # Payment failed
    REFUNDED = "refunded"  # Purchase refunded


class StoreItem(Base):
    """
    A book available for purchase in the WorkShelf store.
    Can be created by authors or publishers.
    """
    __tablename__ = "store_items"

    id = Column(Integer, primary_key=True, index=True)
    
    # Book Information
    title = Column(String(500), nullable=False, index=True)
    author_name = Column(String(255), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=True)  # Link to author if they have profile
    description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)  # Full book description/synopsis
    genres = Column(JSON, nullable=True)  # Array of genre strings
    isbn = Column(String(20), nullable=True, index=True)
    publisher = Column(String(255), nullable=True)
    publication_date = Column(DateTime, nullable=True)
    language = Column(String(10), default="en")
    page_count = Column(Integer, nullable=True)
    
    # Pricing & Sales
    price_usd = Column(Numeric(10, 2), nullable=False)  # Price in USD (e.g., 9.99)
    currency = Column(String(3), default="USD")
    discount_percentage = Column(Integer, default=0)  # 0-100 for sales/promotions
    
    # Content Storage
    epub_blob_url = Column(String(1000), nullable=False)  # Azure Blob Storage URL for EPUB
    cover_blob_url = Column(String(1000), nullable=True)  # Book cover image
    sample_blob_url = Column(String(1000), nullable=True)  # Free sample chapters
    file_hash = Column(String(64), nullable=False, unique=True)  # SHA-256 of EPUB for deduplication
    file_size_bytes = Column(Integer, nullable=False)
    
    # Store Management
    status = Column(String(20), default=StoreItemStatus.DRAFT, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who is selling this
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who reviewed it
    moderator_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Analytics
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Numeric(10, 2), default=0.00)
    view_count = Column(Integer, default=0)
    rating_average = Column(Numeric(3, 2), nullable=True)  # 0.00 to 5.00
    rating_count = Column(Integer, default=0)
    
    # Featured & Promotion
    is_featured = Column(Boolean, default=False)
    featured_at = Column(DateTime, nullable=True)
    is_bestseller = Column(Boolean, default=False)
    is_new_release = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    published_at = Column(DateTime, nullable=True)  # When it went live in store
    
    # Relationships
    seller = relationship("User", foreign_keys=[seller_id], back_populates="store_items")
    moderator = relationship("User", foreign_keys=[moderator_id])
    author = relationship("Author", foreign_keys=[author_id], back_populates="store_items")
    purchases = relationship("Purchase", back_populates="store_item", cascade="all, delete-orphan")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_store_items_status_price', 'status', 'price_usd'),
        Index('idx_store_items_author', 'author_id', 'status'),
        Index('idx_store_items_bestseller', 'is_bestseller', 'status'),
    )


class Purchase(Base):
    """
    Record of a user purchasing a book from the store.
    Links to Stripe payment and grants EPUB access.
    """
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    
    # Transaction Details
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    store_item_id = Column(Integer, ForeignKey("store_items.id"), nullable=False, index=True)
    
    # Payment Information
    amount_paid = Column(Numeric(10, 2), nullable=False)  # Actual amount paid (after discounts)
    currency = Column(String(3), default="USD")
    stripe_payment_intent_id = Column(String(255), unique=True, nullable=False, index=True)
    stripe_charge_id = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)  # card, apple_pay, google_pay, etc.
    
    # Purchase Status
    status = Column(String(20), default=PurchaseStatus.PENDING, index=True)
    completed_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    refund_reason = Column(Text, nullable=True)
    
    # Access Control
    bookshelf_item_id = Column(Integer, ForeignKey("bookshelf_items.id"), nullable=True)  # Auto-added to shelf
    access_granted = Column(Boolean, default=False)
    access_granted_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="purchases")
    store_item = relationship("StoreItem", foreign_keys=[store_item_id], back_populates="purchases")
    bookshelf_item = relationship("BookshelfItem", foreign_keys=[bookshelf_item_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_purchases_user_completed', 'user_id', 'completed_at'),
        Index('idx_purchases_store_item', 'store_item_id', 'status'),
    )


class AuthorEarnings(Base):
    """
    Track earnings for authors from their book sales.
    Used for revenue sharing and payout calculations.
    """
    __tablename__ = "author_earnings"

    id = Column(Integer, primary_key=True, index=True)
    
    # Author & Book
    author_id = Column(Integer, ForeignKey("authors.id"), nullable=False, index=True)
    store_item_id = Column(Integer, ForeignKey("store_items.id"), nullable=False)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False, unique=True)
    
    # Earnings Breakdown
    sale_amount = Column(Numeric(10, 2), nullable=False)  # Full sale price
    platform_fee = Column(Numeric(10, 2), nullable=False)  # WorkShelf's cut (e.g., 30%)
    author_earnings = Column(Numeric(10, 2), nullable=False)  # What author receives (70%)
    payment_processing_fee = Column(Numeric(10, 2), default=0.00)  # Stripe fees
    
    # Payout Status
    payout_status = Column(String(20), default="pending", index=True)  # pending, processing, paid, failed
    payout_date = Column(DateTime, nullable=True)
    stripe_payout_id = Column(String(255), nullable=True)  # Stripe Connect payout ID
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    author = relationship("Author", foreign_keys=[author_id], back_populates="earnings")
    store_item = relationship("StoreItem", foreign_keys=[store_item_id])
    purchase = relationship("Purchase", foreign_keys=[purchase_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_author_earnings_status', 'author_id', 'payout_status'),
        Index('idx_author_earnings_payout', 'payout_status', 'created_at'),
    )
