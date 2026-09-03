from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from sqlalchemy.sql import func

from app.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

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

    reserved_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    status = Column(
        String,
        default="ACTIVE",
        nullable=False
    )

    ready_until = Column(
        DateTime(timezone=True),
        nullable=True
    )