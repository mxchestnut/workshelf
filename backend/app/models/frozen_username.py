"""
Frozen Username Model
Usernames are frozen for 6 months after account deletion to prevent confusion
"""
from sqlalchemy import Column, Integer, String, DateTime
from app.models.base import Base
from datetime import datetime


class FrozenUsername(Base):
    """
    Frozen username that cannot be reused for 6 months
    Created when a user deletes their account
    """
    __tablename__ = "frozen_usernames"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    frozen_at = Column(DateTime, nullable=False)
    thaw_at = Column(DateTime, nullable=False, index=True)  # 6 months after frozen_at
    original_user_email = Column(String(255), nullable=False)
    original_keycloak_id = Column(String(255), nullable=False)
    
    def __repr__(self):
        return f"<FrozenUsername(username='{self.username}', thaw_at='{self.thaw_at}')>"
