from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint
)

from sqlalchemy.orm import relationship

from app.database import Base


class BookRating(Base):
    __tablename__ = "book_ratings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    book_id = Column(
        Integer,
        ForeignKey("books.id"),
        nullable=False,
        index=True
    )

    # Rating from 1 to 5
    rating = Column(
        Integer,
        nullable=False
    )

    # Optional written review
    review = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user = relationship("User")
    book = relationship("Book")

    # One member can rate a particular book only once.
    # The rating can later be updated.
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "book_id",
            name="uq_user_book_rating"
        ),
    )