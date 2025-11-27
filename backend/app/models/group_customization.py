"""
Group Customization Models
Advanced group branding, themes, and custom styling for multi-tenant communities
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class GroupTheme(Base, TimestampMixin):
    """
    Group Theme - Custom visual branding for groups
    Stores color schemes, fonts, logos, and custom CSS for branded community spaces
    """
    __tablename__ = "group_themes"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Colors
    primary_color = Column(String(7), default="#B34B0C")  # Hex color - matches platform default
    secondary_color = Column(String(7), default="#524944")  # Secondary background
    accent_color = Column(String(7), default="#D97706")  # Accent/highlight color
    background_color = Column(String(7), default="#1F1B18")  # Page background
    text_color = Column(String(7), default="#FFFFFF")  # Primary text color
    
    # Typography
    heading_font = Column(String(100), default="Inter")  # Font for headings
    body_font = Column(String(100), default="Inter")  # Font for body text
    
    # Branding Assets
    logo_url = Column(String(500))  # Group logo/icon
    banner_url = Column(String(500))  # Hero/header banner image
    favicon_url = Column(String(500))  # Custom favicon for subdomain
    
    # Custom CSS
    custom_css = Column(Text)  # User-provided CSS for advanced customization
    
    # Layout preferences
    layout_config = Column(JSON)  # JSON object for layout settings (sidebar position, card style, etc.)
    
    # Active state
    is_active = Column(Boolean, default=True)
    
    # Relationships
    group = relationship("Group", back_populates="theme")
    
    def __repr__(self):
        return f"<GroupTheme(group_id={self.group_id}, primary={self.primary_color})>"
