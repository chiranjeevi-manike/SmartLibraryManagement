from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class BookCopy(Base):
    __tablename__ = "book_copies"

    id = Column(Integer, primary_key=True, index=True)

    book_id = Column(
        Integer,
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    accession_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    status = Column(
        String(20),
        nullable=False,
        default="AVAILABLE",
    )

    shelf_location = Column(
        String(100),
        nullable=True,
    )

    acquired_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    book = relationship("Book", back_populates="copies")