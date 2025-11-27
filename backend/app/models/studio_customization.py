"""
Studio Customization Models - Phase 5
Advanced studio branding, themes, and analytics tracking
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, JSON, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin


class StudioTheme(Base, TimestampMixin):
    """
    Studio Theme - Custom visual branding for studios
    Stores color schemes, fonts, and custom CSS
    """
    __tablename__ = "studio_themes"
    
    id = Column(Integer, primary_key=True, index=True)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    
    # Colors
    primary_color = Column(String(7), default="#3B82F6")  # Hex color
    secondary_color = Column(String(7), default="#8B5CF6")
    accent_color = Column(String(7), default="#10B981")
    background_color = Column(String(7), default="#FFFFFF")
    text_color = Column(String(7), default="#1F2937")
    
    # Typography
    heading_font = Column(String(100), default="Inter")
    body_font = Column(String(100), default="Inter")
    code_font = Column(String(100), default="JetBrains Mono")
    
    # Custom CSS
    custom_css = Column(Text)  # User-provided CSS for advanced customization
    
    # Layout preferences
    layout_config = Column(JSON)  # JSON object for layout settings
    
    # Active state
    is_active = Column(Boolean, default=True)
    
    # Relationships
    studio = relationship("Studio", back_populates="theme")
    
    def __repr__(self):
        return f"<StudioTheme(studio_id={self.studio_id}, primary={self.primary_color})>"


class StudioCustomDomain(Base, TimestampMixin):
    """
    Studio Custom Domain - Custom domain settings for studios
    Manages custom domain verification and SSL configuration
    """
    __tablename__ = "studio_custom_domains"
    
    id = Column(Integer, primary_key=True, index=True)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Domain info
    domain = Column(String(255), nullable=False, unique=True, index=True)
    subdomain = Column(String(100))  # Optional subdomain (e.g., blog.example.com)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(100))  # Token for DNS verification
    verification_method = Column(String(20), default="TXT")  # TXT, CNAME, etc.
    verified_at = Column(DateTime(timezone=True))
    
    # SSL/TLS
    ssl_enabled = Column(Boolean, default=False)
    ssl_certificate = Column(Text)  # Certificate data
    ssl_issued_at = Column(DateTime(timezone=True))
    ssl_expires_at = Column(DateTime(timezone=True))
    auto_renew_ssl = Column(Boolean, default=True)
    
    # DNS settings
    dns_records = Column(JSON)  # Required DNS records for setup
    
    # Status
    is_active = Column(Boolean, default=False)
    status = Column(String(20), default="pending")  # pending, verifying, active, failed
    error_message = Column(Text)
    
    # Relationships
    studio = relationship("Studio", back_populates="custom_domains")
    
    def __repr__(self):
        return f"<StudioCustomDomain(domain='{self.domain}', verified={self.is_verified})>"


class DocumentView(Base, TimestampMixin):
    """
    Document View - Tracks document views for analytics
    Records each view with metadata for insights
    """
    __tablename__ = "document_views"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), index=True)  # Null for anonymous
    
    # View metadata
    view_duration = Column(Integer)  # Duration in seconds
    scroll_depth = Column(Integer)  # Percentage scrolled (0-100)
    referrer = Column(String(500))  # Where the view came from
    
    # Device/browser info
    user_agent = Column(String(500))
    ip_address = Column(String(45))  # IPv4 or IPv6
    country_code = Column(String(2))  # ISO country code
    city = Column(String(100))
    
    # Engagement metrics
    is_unique = Column(Boolean, default=True)  # First view from this user/session
    session_id = Column(String(100), index=True)  # Session identifier
    
    # Relationships
    document = relationship("Document", back_populates="views")
    user = relationship("User")
    
    def __repr__(self):
        return f"<DocumentView(document_id={self.document_id}, user_id={self.user_id})>"


class StudioAnalytics(Base, TimestampMixin):
    """
    Studio Analytics - Aggregated analytics data for studios
    Stores daily/weekly/monthly metrics
    """
    __tablename__ = "studio_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Time period
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    period_type = Column(String(20), default="daily")  # daily, weekly, monthly
    
    # View metrics
    total_views = Column(Integer, default=0)
    unique_views = Column(Integer, default=0)
    avg_view_duration = Column(Integer, default=0)  # Seconds
    
    # User metrics
    total_users = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    returning_users = Column(Integer, default=0)
    
    # Content metrics
    total_documents = Column(Integer, default=0)
    published_documents = Column(Integer, default=0)
    total_words = Column(Integer, default=0)
    
    # Engagement metrics
    total_comments = Column(Integer, default=0)
    total_reactions = Column(Integer, default=0)
    total_shares = Column(Integer, default=0)
    total_bookmarks = Column(Integer, default=0)
    
    # Geographic data
    top_countries = Column(JSON)  # Top countries by views
    
    # Referral data
    top_referrers = Column(JSON)  # Top referral sources
    
    # Relationships
    studio = relationship("Studio", back_populates="analytics")
    
    def __repr__(self):
        return f"<StudioAnalytics(studio_id={self.studio_id}, date={self.date}, views={self.total_views})>"
