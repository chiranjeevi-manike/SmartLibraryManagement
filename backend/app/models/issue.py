from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    String,
    Numeric
)

from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    book_id = Column(
        Integer,
        ForeignKey("books.id"),
        nullable=False
    )

    issue_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    due_date = Column(
        DateTime,
        nullable=False
    )

    return_date = Column(
        DateTime,
        nullable=True
    )

    status = Column(
        String(20),
        default="ISSUED",
        nullable=False
    )

    overdue_days = Column(
        Integer,
        default=0,
        nullable=False
    )

    fine_amount = Column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )

    fine_status = Column(
        String(20),
        nullable=False,
        default="UNPAID"
    )

    fine_paid_at = Column(
        DateTime,
        nullable=True
    )

    renewal_count = Column(
        Integer,
        default=0,
        nullable=False
    )
    user = relationship("User")
    book = relationship("Book")