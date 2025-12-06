"""
Document Models
Documents are the core content in Work Shelf with full version control
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, BigInteger
from sqlalchemy.orm import relationship
import enum
from app.models.base import Base, TimestampMixin, TenantMixin


class DocumentStatus(str, enum.Enum):
    """Document workflow status"""
    DRAFT = "draft"
    BETA = "beta"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class DocumentMode(str, enum.Enum):
    """
    Document mode - Git-style workflow for writers
    Controls UI, permissions, and collaboration features
    """
    ALPHA = "alpha"      # Draft Room - collaborative drafting
    BETA = "beta"        # Workshop - structured feedback
    PUBLISH = "publish"  # Print Queue - finalization
    READ = "read"        # Bookshelf - consumer reading


class DocumentVisibility(str, enum.Enum):
    """Document visibility settings"""
    PRIVATE = "private"
    TENANT = "tenant"  # Visible within tenant
    PUBLIC = "public"
    STUDIO = "studio"  # Visible within studio only


class CollaboratorRole(str, enum.Enum):
    """Collaborator roles on documents"""
    OWNER = "owner"
    EDITOR = "editor"
    COMMENTER = "commenter"
    VIEWER = "viewer"
    BETA_READER = "beta_reader"


class Document(Base, TimestampMixin, TenantMixin):
    """
    Document - Core content entity
    Supports versioning, collaboration, and multi-stage workflow
    """
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Owner
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Project association (optional)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='SET NULL'), index=True)
    
    # Folder association (optional) - for organizing documents
    folder_id = Column(Integer, ForeignKey('folders.id', ondelete='SET NULL'), index=True)
    
    # Studio association (optional)
    studio_id = Column(Integer, ForeignKey('studios.id', ondelete='SET NULL'), index=True)
    
    # Document metadata
    title = Column(String(500), nullable=False)
    slug = Column(String(200), index=True)
    description = Column(Text)
    
    # Content (current version - denormalized for performance)
    content = Column(Text)
    content_html = Column(Text)  # Rendered HTML
    word_count = Column(Integer, default=0)
    
    # Status and workflow
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False, index=True)
    mode = Column(SQLEnum(DocumentMode), default=DocumentMode.ALPHA, nullable=False, index=True)
    visibility = Column(SQLEnum(DocumentVisibility), default=DocumentVisibility.PRIVATE, nullable=False)
    
    # Publishing
    published_at = Column(DateTime)
    
    # Version tracking
    current_version = Column(Integer, default=1)
    
    # Flags
    is_featured = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)  # Prevent editing
    allow_comments = Column(Boolean, default=True)
    
    # Soft delete (trash bin)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    
    # Storage
    file_path = Column(String(1000))  # Path in blob storage
    file_size = Column(BigInteger)  # Size in bytes
    
    # SEO
    meta_description = Column(String(500))
    meta_keywords = Column(String(500))
    
    # Relationships
    tenant = relationship("Tenant", back_populates="documents")
    owner = relationship("User", back_populates="documents")
    project = relationship("Project", back_populates="documents")
    studio = relationship("Studio", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version.desc()")
    collaborators = relationship("DocumentCollaborator", back_populates="document", cascade="all, delete-orphan")
    share_links = relationship("ShareLink", back_populates="document", cascade="all, delete-orphan")
    
    # Phase 3: Reading relationships
    bookmarks = relationship("Bookmark", back_populates="document", cascade="all, delete-orphan")
    reading_list_items = relationship("ReadingListItem", back_populates="document", cascade="all, delete-orphan")
    bookshelf_items = relationship("BookshelfItem", back_populates="document", cascade="all, delete-orphan")
    reading_progress = relationship("ReadingProgress", back_populates="document", cascade="all, delete-orphan")
    
    # Phase 4: Collaboration relationships
    comments = relationship("Comment", back_populates="document", cascade="all, delete-orphan")
    beta_requests = relationship("BetaRequest", foreign_keys="BetaRequest.document_id", back_populates="document", cascade="all, delete-orphan")
    
    # Phase 5: Analytics relationships
    views = relationship("DocumentView", back_populates="document", cascade="all, delete-orphan")
    
    # Phase 7: Advanced Features
    integrity_checks = relationship("IntegrityCheck", back_populates="document", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", foreign_keys="ExportJob.document_id", back_populates="document", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Document(id={self.id}, title='{self.title}', status='{self.status}')>"


class DocumentVersion(Base, TimestampMixin):
    """
    Document version history
    Complete version control for all document changes
    """
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Version info
    version = Column(Integer, nullable=False)
    
    # Content snapshot
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    content_html = Column(Text)
    word_count = Column(Integer, default=0)
    
    # Mode tracking (Git-style workflow)
    mode = Column(SQLEnum(DocumentMode), nullable=False)  # Mode at time of version
    previous_mode = Column(SQLEnum(DocumentMode))  # Previous mode (for transitions)
    
    # Who made this version
    created_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    
    # Change metadata
    change_summary = Column(Text)  # What changed in this version (Git commit message)
    is_major_version = Column(Boolean, default=False)  # Major vs minor version
    is_mode_transition = Column(Boolean, default=False)  # Created during mode change
    
    # Storage
    file_path = Column(String(1000))  # Snapshot in blob storage
    file_size = Column(BigInteger)
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    created_by = relationship("User")
    
    __table_args__ = (
        {'schema': None},  # Will add unique constraint in migration
    )
    
    def __repr__(self):
        return f"<DocumentVersion(id={self.id}, document_id={self.document_id}, version={self.version})>"


class DocumentCollaborator(Base, TimestampMixin):
    """
    Document collaborators and beta readers
    Defines who can access and what they can do with a document
    """
    __tablename__ = "document_collaborators"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Role and permissions
    role = Column(SQLEnum(CollaboratorRole), nullable=False)
    
    # Access control
    can_edit = Column(Boolean, default=False)
    can_comment = Column(Boolean, default=True)
    can_share = Column(Boolean, default=False)
    
    # Invitation
    invited_by_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    invited_at = Column(DateTime)
    accepted_at = Column(DateTime)
    
    # Relationships
    document = relationship("Document", back_populates="collaborators")
    user = relationship("User", back_populates="document_collaborations", foreign_keys=[user_id])
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    
    def __repr__(self):
        return f"<DocumentCollaborator(document_id={self.document_id}, user_id={self.user_id}, role='{self.role}')>"


class Tag(Base, TimestampMixin):
    """
    User-created tags for organizing documents
    """
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Tag metadata
    name = Column(String(100), nullable=False, index=True)
    color = Column(String(20))  # Hex color code
    
    # Relationships
    user = relationship("User", back_populates="tags")
    document_tags = relationship("DocumentTag", back_populates="tag", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tag(id={self.id}, name='{self.name}')>"


class DocumentTag(Base, TimestampMixin):
    """
    Many-to-many relationship between documents and tags
    """
    __tablename__ = "document_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Relationships
    document = relationship("Document")
    tag = relationship("Tag", back_populates="document_tags")
    
    def __repr__(self):
        return f"<DocumentTag(document_id={self.document_id}, tag_id={self.tag_id})>"
