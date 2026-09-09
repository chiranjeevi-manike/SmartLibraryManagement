from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.sql import func

from app.database import Base


class FinePayment(Base):
    __tablename__ = "fine_payments"

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

    amount = Column(
        Numeric(10, 2),
        nullable=False,
    )

    payment_method = Column(
        String(30),
        nullable=False,
        default="MANUAL",
    )

    received_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    paid_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )