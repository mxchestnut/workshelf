"""Project database model."""
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime, timezone


class Project(Base):
    """Writing project model."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(String(50), nullable=False)  # novel, short_story, etc.
    target_word_count = Column(Integer, nullable=True)
    current_word_count = Column(Integer, default=0)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    
    # Template support
    template_id = Column(Integer, ForeignKey("project_templates.id", ondelete="SET NULL"), nullable=True, index=True)
    ai_template_id = Column(Integer, ForeignKey("ai_generated_templates.id", ondelete="SET NULL"), nullable=True, index=True)
    prompt_responses = Column(JSONB, nullable=True)  # User's answers to template prompts
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Soft delete (trash bin)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="projects")
    user = relationship("User", back_populates="projects")
    folder = relationship("Folder", back_populates="projects")
    documents = relationship("Document", back_populates="project")
    template = relationship("ProjectTemplate", foreign_keys=[template_id])
    ai_template = relationship("AIGeneratedTemplate", foreign_keys=[ai_template_id])
