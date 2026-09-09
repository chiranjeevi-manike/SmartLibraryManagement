from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func

from app.database import Base


class RenewalHistory(Base):
    __tablename__ = "renewal_history"

    id = Column(Integer, primary_key=True, index=True)

    issue_id = Column(
        Integer,
        ForeignKey("issues.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    book_id = Column(
        Integer,
        ForeignKey("books.id"),
        nullable=False,
        index=True,
    )

    previous_due_date = Column(
        DateTime,
        nullable=False,
    )

    new_due_date = Column(
        DateTime,
        nullable=False,
    )

    renewal_number = Column(
        Integer,
        nullable=False,
    )

    renewed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    renewed_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )