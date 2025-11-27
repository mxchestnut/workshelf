"""
Group Analytics Models
Analytics and metrics tracking for groups
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class GroupAnalytics(Base, TimestampMixin):
    """
    Group Analytics - Aggregated analytics data for groups
    Stores daily/weekly/monthly metrics
    """
    __tablename__ = "group_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Time period
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    period_type = Column(String(20), default="daily")  # daily, weekly, monthly
    
    # View metrics (for group homepage/posts)
    total_views = Column(Integer, default=0)
    unique_views = Column(Integer, default=0)
    post_views = Column(Integer, default=0)  # Total post views
    
    # Follower metrics
    total_followers = Column(Integer, default=0)
    new_followers = Column(Integer, default=0)
    unfollowed = Column(Integer, default=0)
    
    # Member metrics
    total_members = Column(Integer, default=0)
    new_members = Column(Integer, default=0)
    active_members = Column(Integer, default=0)  # Members who posted/commented
    
    # Content metrics
    total_posts = Column(Integer, default=0)
    new_posts = Column(Integer, default=0)
    
    # Engagement metrics
    total_comments = Column(Integer, default=0)
    total_reactions = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    
    # Growth metrics
    follower_growth_rate = Column(Integer, default=0)  # Percentage * 100
    member_growth_rate = Column(Integer, default=0)    # Percentage * 100
    engagement_rate = Column(Integer, default=0)       # Percentage * 100
    
    # Top content
    top_posts = Column(JSON)  # Top posts by views/engagement
    
    # Relationships
    group = relationship("Group", back_populates="analytics")
    
    def __repr__(self):
        return f"<GroupAnalytics(group_id={self.group_id}, date={self.date}, followers={self.total_followers})>"
