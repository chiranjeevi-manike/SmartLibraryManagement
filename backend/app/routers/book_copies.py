from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.book import Book
from app.models.book_copy import BookCopy
from app.models.user import User
from app.utils.dependencies import get_current_user, require_roles


router = APIRouter(
    prefix="/book-copies",
    tags=["Book Copies"]
)


@router.get("/")
def get_book_copies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return (
        db.query(BookCopy)
        .order_by(BookCopy.id.asc())
        .all()
    )


@router.get("/book/{book_id}")
def get_copies_by_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return (
        db.query(BookCopy)
        .filter(BookCopy.book_id == book_id)
        .order_by(BookCopy.id.asc())
        .all()
    )


@router.get("/accession/{accession_number}")
def get_copy_by_accession(
    accession_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    copy = (
        db.query(BookCopy)
        .filter(BookCopy.accession_number == accession_number)
        .first()
    )

    if not copy:
        raise HTTPException(
            status_code=404,
            detail="Book copy not found"
        )

    return copy


@router.patch("/{copy_id}/shelf-location")
def update_shelf_location(
    copy_id: int,
    shelf_location: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    copy = (
        db.query(BookCopy)
        .filter(BookCopy.id == copy_id)
        .first()
    )

    if not copy:
        raise HTTPException(
            status_code=404,
            detail="Book copy not found"
        )

    copy.shelf_location = shelf_location

    db.commit()
    db.refresh(copy)

    return copy


@router.post("/", status_code=201)
def create_book_copy(
    book_id: int,
    accession_number: str,
    shelf_location: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    book = (
        db.query(Book)
        .filter(Book.id == book_id)
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Book not found"
        )

    existing_copy = (
        db.query(BookCopy)
        .filter(
            BookCopy.accession_number == accession_number
        )
        .first()
    )

    if existing_copy:
        raise HTTPException(
            status_code=400,
            detail="Accession number already exists"
        )

    new_copy = BookCopy(
        book_id=book_id,
        accession_number=accession_number,
        status="AVAILABLE",
        shelf_location=shelf_location
    )

    db.add(new_copy)

    book.total_copies += 1
    book.available_copies += 1

    db.commit()
    db.refresh(new_copy)

    return new_copy


@router.delete("/{copy_id}")
def delete_book_copy(
    copy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    copy = (
        db.query(BookCopy)
        .filter(BookCopy.id == copy_id)
        .first()
    )

    if not copy:
        raise HTTPException(
            status_code=404,
            detail="Book copy not found"
        )

    if copy.status != "AVAILABLE":
        raise HTTPException(
            status_code=400,
            detail="Issued book copy cannot be deleted"
        )

    book = (
        db.query(Book)
        .filter(Book.id == copy.book_id)
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Book not found"
        )

    accession_number = copy.accession_number

    db.delete(copy)

    book.total_copies -= 1
    book.available_copies -= 1

    db.commit()

    return {
        "message": "Book copy deleted successfully",
        "accession_number": accession_number
    }