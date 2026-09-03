from sqlalchemy.orm import Session

from app.models.book import Book
from app.schemas.book import BookCreate, BookUpdate


# ---------------------------------------------------------
# CREATE BOOK
# Does NOT commit.
# Router/service controls transaction.
# ---------------------------------------------------------
def create_book(
    db: Session,
    book: BookCreate
):

    new_book = Book(
        isbn=book.isbn,
        title=book.title,
        author_id=book.author_id,
        category_id=book.category_id,
        total_copies=book.total_copies,
        available_copies=book.total_copies
    )

    db.add(new_book)

    # Send INSERT to database and generate ID,
    # but keep transaction open.
    db.flush()

    return new_book


# ---------------------------------------------------------
# GET ALL ACTIVE BOOKS
# ---------------------------------------------------------
def get_all_books(
    db: Session
):

    return (
        db.query(Book)
        .filter(
            Book.is_active == True
        )
        .all()
    )


# ---------------------------------------------------------
# GET BOOK BY ID
# ---------------------------------------------------------
def get_book_by_id(
    db: Session,
    book_id: int
):

    return (
        db.query(Book)
        .filter(
            Book.id == book_id
        )
        .first()
    )


# ---------------------------------------------------------
# GET BOOK BY ISBN
# ---------------------------------------------------------
def get_book_by_isbn(
    db: Session,
    isbn: str
):

    return (
        db.query(Book)
        .filter(
            Book.isbn == isbn
        )
        .first()
    )


# ---------------------------------------------------------
# SEARCH BOOKS BY TITLE
# ---------------------------------------------------------
def search_books(
    db: Session,
    title: str
):

    return (
        db.query(Book)
        .filter(
            Book.title.ilike(
                f"%{title}%"
            ),
            Book.is_active == True
        )
        .all()
    )


# ---------------------------------------------------------
# UPDATE BOOK
# Does NOT commit.
# Router/service controls transaction.
# ---------------------------------------------------------
def update_book(
    db: Session,
    book_id: int,
    book_data: BookUpdate
):

    book = get_book_by_id(
        db,
        book_id
    )

    if not book:
        return None

    update_data = book_data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------------------
    # HANDLE TOTAL COPY CHANGES
    # -----------------------------------------------------
    if "total_copies" in update_data:

        new_total = update_data["total_copies"]

        issued_copies = (
            book.total_copies -
            book.available_copies
        )

        # Cannot reduce total copies below
        # number of copies currently issued.
        if new_total < issued_copies:
            raise ValueError(
                "Total copies cannot be less than "
                "currently issued copies"
            )

        book.available_copies = (
            new_total - issued_copies
        )

    # -----------------------------------------------------
    # UPDATE FIELDS
    # -----------------------------------------------------
    for field, value in update_data.items():
        setattr(
            book,
            field,
            value
        )

    # Flush changes but do not commit.
    db.flush()

    return book


# ---------------------------------------------------------
# DELETE / DEACTIVATE BOOK
# Soft delete
# Does NOT commit.
# Router/service controls transaction.
# ---------------------------------------------------------
def delete_book(
    db: Session,
    book_id: int
):

    book = get_book_by_id(
        db,
        book_id
    )

    if not book:
        return None

    # Soft delete
    book.is_active = False

    # Flush but do not commit.
    db.flush()

    return book