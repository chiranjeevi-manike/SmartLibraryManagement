# from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint, Index

from app.database import Base


class Book(Base):
    __tablename__ = "books"

    __table_args__ = (
    UniqueConstraint("isbn", name="books_isbn_key"),
    Index("ix_books_isbn", "isbn", unique=True),
)


    copies = relationship(
    "BookCopy",
    back_populates="book",
    cascade="all, delete-orphan",
)

    id = Column(Integer, primary_key=True, index=True)

    isbn = Column(String, nullable=False)
    

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