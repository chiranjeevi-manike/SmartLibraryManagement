from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)

    isbn = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )

    title = Column(
        String(200),
        nullable=False,
        index=True
    )

    author_id = Column(
        Integer,
        ForeignKey("authors.id"),
        nullable=False
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=False
    )

    total_copies = Column(
        Integer,
        nullable=False,
        default=1
    )

    available_copies = Column(
        Integer,
        nullable=False,
        default=1
    )

    is_active = Column(
        Boolean,
        default=True
    )

    author = relationship("Author")

    category = relationship("Category")