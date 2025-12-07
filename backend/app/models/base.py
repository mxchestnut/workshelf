"""
"""Base model with common fields for all tables
"""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import declared_attr

Base = declarative_base()


def utc_now():
    """Get current UTC time with timezone info"""
    return datetime.now(timezone.utc)


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)


class TenantMixin:
    """Mixin for multi-tenant tables"""
    
    @declared_attr
    def tenant_id(cls):
        from sqlalchemy import Column, Integer, ForeignKey
        # nullable=True for MVP - users can create/join tenants later
        return Column(Integer, ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True, index=True)
