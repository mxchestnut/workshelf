"""
Project Template Models
Templates for studios with pre-built structures and AI prompts
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin


class ProjectTemplate(Base, TimestampMixin):
    """
    Pre-built project templates (Novel, Business Plan, etc.)
    """
    __tablename__ = "project_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Template identity
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Categorization
    category = Column(String(100), nullable=True, index=True)  # 'creative', 'business', 'academic', 'technical', 'gaming'
    icon = Column(String(50), nullable=True)  # emoji like "📖" or "💼"
    
    # Settings
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)  # for custom ordering in UI
    usage_count = Column(Integer, default=0, nullable=False, index=True)  # popularity tracking
    
    # Relationships
    sections = relationship("TemplateSection", back_populates="template", cascade="all, delete-orphan")
    studios = relationship("Studio", back_populates="template")
    searches = relationship("TemplateSearch", back_populates="selected_template")
    interest_mappings = relationship("TemplateInterestMapping", back_populates="template", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_template_active_category', 'is_active', 'category'),
    )


class TemplateSection(Base):
    """
    Pre-defined sections for each template (e.g., "Executive Summary" for Business Plan)
    """
    __tablename__ = "template_sections"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey('project_templates.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Section info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, index=True)
    
    # Nesting support (e.g., "Characters" > "Protagonist Profile")
    parent_section_id = Column(Integer, ForeignKey('template_sections.id', ondelete='CASCADE'), nullable=True)
    
    # AI prompts for this section
    # Format: [{"id": "prompt1", "question": "What is...", "type": "short_text", "help_text": "..."}, ...]
    ai_prompts = Column(JSONB, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=text('now()'), nullable=False)
    
    # Relationships
    template = relationship("ProjectTemplate", back_populates="sections")
    parent = relationship("TemplateSection", remote_side=[id], back_populates="children", foreign_keys=[parent_section_id])
    children = relationship("TemplateSection", back_populates="parent", cascade="all, delete-orphan")


class TemplateSearch(Base):
    """
    Track what users search for when looking for templates
    Helps Kit know what templates to create next
    """
    __tablename__ = "template_searches"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Search data
    search_query = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Results
    found_results = Column(Boolean, default=False, nullable=False)
    selected_template_id = Column(Integer, ForeignKey('project_templates.id', ondelete='SET NULL'), nullable=True)
    created_blank = Column(Boolean, default=False, nullable=False)  # user chose "Start from Scratch"
    
    created_at = Column(DateTime(timezone=True), server_default=text('now()'), nullable=False, index=True)
    
    # Relationships
    user = relationship("User")
    selected_template = relationship("ProjectTemplate", back_populates="searches")
    
    __table_args__ = (
        Index('ix_search_query_date', 'search_query', 'created_at'),
    )
