"""
Invitation model for email invitations
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum
import secrets

from app.models.base import Base


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    status = Column(SQLEnum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="invitations_created")
    acceptor = relationship("User", foreign_keys=[accepted_by], backref="invitations_accepted")

    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def default_expiration() -> datetime:
        """Default expiration is 7 days from now"""
        return datetime.now(timezone.utc) + timedelta(days=7)

    def is_valid(self) -> bool:
        """Check if invitation is still valid"""
        return (
            self.status == InvitationStatus.PENDING
            and self.expires_at > datetime.now(timezone.utc)
        )

    def mark_accepted(self, user_id: int):
        """Mark invitation as accepted"""
        self.status = InvitationStatus.ACCEPTED
        self.accepted_at = datetime.now(timezone.utc)
        self.accepted_by = user_id

    def mark_expired(self):
        """Mark invitation as expired"""
        self.status = InvitationStatus.EXPIRED

    def revoke(self):
        """Revoke the invitation"""
        self.status = InvitationStatus.REVOKED
