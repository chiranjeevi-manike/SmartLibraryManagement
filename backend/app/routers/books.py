from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

import csv
import io

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db

from app.models.user import User
from app.models.author import Author
from app.models.category import Category
from app.models.book import Book
from sqlalchemy import func
from app.models.issue import Issue

from app.schemas.book import (
    BookCreate,
    BookUpdate,
    BookResponse
)

from app.models.book_copy import BookCopy

from app.repositories import book as book_repository

from app.services.audit_service import create_audit_log

from app.utils.dependencies import (
    get_current_user,
    require_role,
    require_roles
)

from datetime import datetime
from fastapi.responses import StreamingResponse

from sqlalchemy import func
from app.models.issue import Issue
from app.models.book_rating import BookRating

router = APIRouter(
    prefix="/books",
    tags=["Books"]
)



@router.post("/import/csv")
async def import_books_from_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    ),
):
    if (
        not file.filename
        or not file.filename.lower().endswith(".csv")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )

    content = await file.read()

    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must not exceed 2 MB",
        )

    try:
        decoded_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file must use UTF-8 encoding",
        )

    reader = csv.DictReader(
        io.StringIO(decoded_content)
    )

    required_columns = {
        "isbn",
        "title",
        "author_id",
        "category_id",
        "total_copies",
    }

    received_columns = set(
        reader.fieldnames or []
    )

    missing_columns = (
        required_columns - received_columns
    )

    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Missing required columns: "
                + ", ".join(
                    sorted(missing_columns)
                )
            ),
        )

    author_ids = {
        author_id
        for (author_id,) in db.query(
            Author.id
        ).all()
    }

    category_ids = {
        category_id
        for (category_id,) in db.query(
            Category.id
        ).all()
    }

    existing_isbns = {
        isbn.strip().lower()
        for (isbn,) in db.query(
            Book.isbn
        ).all()
        if isbn
    }

    seen_isbns = set()
    valid_books = []
    errors = []

    for row_number, row in enumerate(
        reader,
        start=2,
    ):
        isbn = (
            row.get("isbn") or ""
        ).strip()

        title = (
            row.get("title") or ""
        ).strip()

        row_errors = []

        try:
            author_id = int(
                row.get("author_id") or ""
            )
        except ValueError:
            author_id = None
            row_errors.append(
                "author_id must be an integer"
            )

        try:
            category_id = int(
                row.get("category_id") or ""
            )
        except ValueError:
            category_id = None
            row_errors.append(
                "category_id must be an integer"
            )

        try:
            total_copies = int(
                row.get("total_copies") or ""
            )

            if total_copies <= 0:
                row_errors.append(
                    "total_copies must be greater than 0"
                )
        except ValueError:
            total_copies = None
            row_errors.append(
                "total_copies must be an integer"
            )

        normalized_isbn = isbn.lower()

        if not isbn:
            row_errors.append(
                "ISBN is required"
            )
        elif normalized_isbn in existing_isbns:
            row_errors.append(
                "ISBN already exists"
            )
        elif normalized_isbn in seen_isbns:
            row_errors.append(
                "Duplicate ISBN in CSV file"
            )

        if not title:
            row_errors.append(
                "Title is required"
            )

        if (
            author_id is not None
            and author_id not in author_ids
        ):
            row_errors.append(
                "Author not found"
            )

        if (
            category_id is not None
            and category_id not in category_ids
        ):
            row_errors.append(
                "Category not found"
            )

        if row_errors:
            errors.append({
                "row": row_number,
                "isbn": isbn,
                "errors": row_errors,
            })
            continue

        seen_isbns.add(normalized_isbn)

        valid_books.append({
            "isbn": isbn,
            "title": title,
            "author_id": author_id,
            "category_id": category_id,
            "total_copies": total_copies,
        })

    imported_books = []

    try:
        for book_data in valid_books:
            book_create = BookCreate(
                **book_data
            )

            new_book = (
                book_repository.create_book(
                    db,
                    book_create,
                )
            )

            for copy_number in range(
                1,
                book_create.total_copies + 1,
            ):
                db.add(
                    BookCopy(
                        book_id=new_book.id,
                        accession_number=(
                            f"BOOK-{new_book.id:06d}-"
                            f"COPY-{copy_number:03d}"
                        ),
                        status="AVAILABLE",
                    )
                )

            create_audit_log(
                db=db,
                user_id=current_user.id,
                action="BOOK_IMPORTED",
                entity_type="BOOK",
                entity_id=new_book.id,
                details=(
                    f"Imported book from CSV: "
                    f"{new_book.title}"
                ),
            )

            imported_books.append({
                "id": new_book.id,
                "isbn": new_book.isbn,
                "title": new_book.title,
            })

        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to import books",
        )

    return {
        "imported_count": len(imported_books),
        "failed_count": len(errors),
        "imported_books": imported_books,
        "errors": errors,
    }

@router.post(
    "/",
    response_model=BookResponse,
    status_code=status.HTTP_201_CREATED
)
def create_book(
    book: BookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    # Check duplicate ISBN
    existing_book = book_repository.get_book_by_isbn(
        db,
        book.isbn
    )

    if existing_book:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book with this ISBN already exists"
        )

    # Check author
    author = (
        db.query(Author)
        .filter(
            Author.id == book.author_id
        )
        .first()
    )

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found"
        )

    # Check category
    category = (
        db.query(Category)
        .filter(
            Category.id == book.category_id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    try:

        # Create book
        new_book = book_repository.create_book(
            db,
            book
        )


        # Create one physical record for every copy.
        for copy_number in range(1, book.total_copies + 1):
            physical_copy = BookCopy(
                book_id=new_book.id,
                accession_number=(
                    f"BOOK-{new_book.id:06d}-"
                    f"COPY-{copy_number:03d}"
                ),
                status="AVAILABLE",
            )
            db.add(physical_copy)

        # Send physical-copy inserts to the database.
        # The final commit below saves the book, copies and audit log together.
        db.flush()

        # Create audit log
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_CREATED",
            entity_type="BOOK",
            entity_id=new_book.id,
            details=f"Created book: {new_book.title}"
        )

        # Save book + audit log together
        db.commit()

        db.refresh(new_book)

        return new_book

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create book"
        )

    except Exception:

        db.rollback()
        raise

@router.get("/")
def get_books(
    skip: int = 0,
    limit: int = 10,
    sort_by: str = "title",
    search: str | None = None,
    author_id: int | None = None,
    author: str | None = None,
    category_id: int | None = None,
    category: str | None = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="skip cannot be negative"
        )

    if limit <= 0 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100"
        )

    query = db.query(Book).filter(
        Book.is_active == True
    )

    # General search: TITLE + ISBN only
    if search:
        search_value = search.strip()

        if search_value:
            pattern = f"%{search_value}%"

            query = query.filter(
                (Book.title.ilike(pattern)) |
                (Book.isbn.ilike(pattern))
            )

    # Author ID filter
    if author_id is not None:
        query = query.filter(
            Book.author_id == author_id
        )

    # Author name filter
    if author:
        author_value = author.strip()

        if author_value:
            query = (
                query
                .join(
                    Author,
                    Book.author_id == Author.id
                )
                .filter(
                    Author.name.ilike(
                        f"%{author_value}%"
                    )
                )
            )

    # Category ID filter
    if category_id is not None:
        query = query.filter(
            Book.category_id == category_id
        )

    # Category name filter
    if category:
        category_value = category.strip()

        if category_value:
            query = (
                query
                .join(
                    Category,
                    Book.category_id == Category.id
                )
                .filter(
                    Category.name.ilike(
                        f"%{category_value}%"
                    )
                )
            )

    # Available books only
    if available_only:
        query = query.filter(
            Book.available_copies > 0
        )

    # Sorting
    if sort_by == "title":
        query = query.order_by(
            Book.title.asc()
        )

    elif sort_by == "id":
        query = query.order_by(
            Book.id.asc()
        )

    elif sort_by == "available_copies":
        query = query.order_by(
            Book.available_copies.desc()
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid sort field. "
                "Use title, id, or available_copies"
            )
        )

    # -----------------------------------------------------
    # TOTAL MATCHING RECORDS
    # Calculate before applying pagination
    # -----------------------------------------------------
    total = query.order_by(None).distinct().count()


    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------
    books = (
        query
        .distinct()
        .offset(skip)
        .limit(limit)
        .all()
    )


    # -----------------------------------------------------
    # RESPONSE WITH PAGINATION METADATA
    # -----------------------------------------------------
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "returned": len(books),
        "books": books
    }



@router.get("/export/csv")
def export_books_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    ),
):
    books = (
        db.query(Book)
        .join(
            Author,
            Book.author_id == Author.id,
        )
        .join(
            Category,
            Book.category_id == Category.id,
        )
        .order_by(Book.id.asc())
        .all()
    )

    output = io.StringIO(newline="")
    writer = csv.writer(output)

    writer.writerow([
        "id",
        "isbn",
        "title",
        "author_id",
        "author",
        "category_id",
        "category",
        "total_copies",
        "available_copies",
        "issued_copies",
        "is_active",
    ])

    def safe_value(value):
        if value is None:
            return ""

        text_value = str(value)

        if text_value.startswith(
            ("=", "+", "-", "@")
        ):
            return "'" + text_value

        return text_value

    for book in books:
        issued_copies = max(
            int(book.total_copies or 0)
            - int(book.available_copies or 0),
            0,
        )

        writer.writerow([
            book.id,
            safe_value(book.isbn),
            safe_value(book.title),
            book.author_id,
            safe_value(
                book.author.name
                if book.author
                else ""
            ),
            book.category_id,
            safe_value(
                book.category.name
                if book.category
                else ""
            ),
            book.total_copies,
            book.available_copies,
            issued_copies,
            book.is_active,
        ])

    csv_content = output.getvalue()
    output.close()

    filename = (
        "library_books_"
        f"{datetime.utcnow():%Y%m%d_%H%M%S}.csv"
    )

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"'
        },
    )

# ---------------------------------------------------------
# BOOK AVAILABILITY
# Keep this before /{book_id}
# ---------------------------------------------------------
@router.get("/{book_id}/availability")
def check_book_availability(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    book = (
        db.query(Book)
        .filter(
            Book.id == book_id,
            Book.is_active == True
        )
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    return {
        "book_id": book.id,
        "title": book.title,
        "total_copies": book.total_copies,
        "available_copies": book.available_copies,
        "is_available": book.available_copies > 0
    }




# ---------------------------------------------------------
# POPULAR BOOKS
# Most frequently borrowed books
# ALL AUTHENTICATED USERS
# ---------------------------------------------------------
@router.get("/popular")
def get_popular_books(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if limit <= 0 or limit > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 50"
        )

    results = (
        db.query(
            Book.id.label("book_id"),
            Book.title.label("title"),
            Book.isbn.label("isbn"),
            Book.total_copies.label("total_copies"),
            Book.available_copies.label("available_copies"),
            func.count(Issue.id).label("borrow_count")
        )
        .join(
            Issue,
            Issue.book_id == Book.id
        )
        .filter(
            Book.is_active == True
        )
        .group_by(
            Book.id,
            Book.title,
            Book.isbn,
            Book.total_copies,
            Book.available_copies
        )
        .order_by(
            func.count(Issue.id).desc(),
            Book.title.asc()
        )
        .limit(limit)
        .all()
    )

    popular_books = []

    for row in results:
        popular_books.append({
            "book_id": row.book_id,
            "title": row.title,
            "isbn": row.isbn,
            "total_copies": row.total_copies,
            "available_copies": row.available_copies,
            "is_available": row.available_copies > 0,
            "borrow_count": row.borrow_count
        })

    return {
        "limit": limit,
        "returned": len(popular_books),
        "popular_books": popular_books
    }


# ---------------------------------------------------------
# PERSONALIZED BOOK RECOMMENDATIONS
# Based on member borrowing history
# Excludes previously borrowed books
# ---------------------------------------------------------
@router.get("/recommendations")
def get_book_recommendations(
    limit: int = 5,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)
):

    # -----------------------------------------------------
    # 1. GET BOOKS ALREADY BORROWED BY CURRENT MEMBER
    # -----------------------------------------------------

    borrowed_records = (
        db.query(
            Issue.book_id,
            Book.category_id
        )
        .join(
            Book,
            Book.id == Issue.book_id
        )
        .filter(
            Issue.user_id == current_user.id
        )
        .all()
    )

    borrowed_book_ids = {
        record.book_id
        for record in borrowed_records
    }


    # -----------------------------------------------------
    # 2. FIND MEMBER'S PREFERRED CATEGORIES
    #
    # Categories are inferred from borrowing history.
    # The more books borrowed from a category,
    # the stronger the preference.
    # -----------------------------------------------------

    category_frequency = {}

    for record in borrowed_records:

        if record.category_id is not None:

            category_frequency[record.category_id] = (
                category_frequency.get(
                    record.category_id,
                    0
                ) + 1
            )


    # Sort categories by borrowing frequency
    preferred_categories = sorted(
        category_frequency,
        key=category_frequency.get,
        reverse=True
    )[:3]


    # -----------------------------------------------------
    # 3. GET CANDIDATE BOOKS
    #
    # Conditions:
    # - active books only
    # - copies must be available
    # - exclude previously borrowed books
    # -----------------------------------------------------

    candidate_query = (
        db.query(Book)
        .filter(
            Book.is_active == True,
            Book.available_copies > 0
        )
    )

    if borrowed_book_ids:

        candidate_query = candidate_query.filter(
            ~Book.id.in_(borrowed_book_ids)
        )

    candidate_books = candidate_query.all()


    if not candidate_books:

        return {
            "user_id": current_user.id,
            "preferred_categories": preferred_categories,
            "total_recommendations": 0,
            "recommendations": []
        }


    candidate_book_ids = [
        book.id
        for book in candidate_books
    ]


    # -----------------------------------------------------
    # 4. GET AVERAGE RATINGS
    # -----------------------------------------------------

    rating_rows = (
        db.query(
            BookRating.book_id,
            func.avg(BookRating.rating).label(
                "average_rating"
            ),
            func.count(BookRating.id).label(
                "rating_count"
            )
        )
        .filter(
            BookRating.book_id.in_(
                candidate_book_ids
            )
        )
        .group_by(
            BookRating.book_id
        )
        .all()
    )


    rating_map = {
        row.book_id: {
            "average_rating": float(
                row.average_rating
            ),
            "rating_count": row.rating_count
        }
        for row in rating_rows
    }


    # -----------------------------------------------------
    # 5. GET BORROWING POPULARITY
    # -----------------------------------------------------

    popularity_rows = (
        db.query(
            Issue.book_id,
            func.count(Issue.id).label(
                "borrow_count"
            )
        )
        .filter(
            Issue.book_id.in_(
                candidate_book_ids
            )
        )
        .group_by(
            Issue.book_id
        )
        .all()
    )


    popularity_map = {
        row.book_id: row.borrow_count
        for row in popularity_rows
    }


    # -----------------------------------------------------
    # 6. CALCULATE RECOMMENDATION SCORE
    #
    # Category preference = maximum 3 points
    # Rating             = maximum 2 points
    # Popularity         = maximum 1 point
    #
    # Maximum total      = 6 points
    # -----------------------------------------------------

    recommendations = []


    for book in candidate_books:

        # ---------------------------------------------
        # CATEGORY SCORE
        # ---------------------------------------------

        category_score = 0.0

        if book.category_id in preferred_categories:

            category_rank = (
                preferred_categories.index(
                    book.category_id
                )
            )

            if category_rank == 0:
                category_score = 3.0

            elif category_rank == 1:
                category_score = 2.0

            elif category_rank == 2:
                category_score = 1.0


        # ---------------------------------------------
        # RATING SCORE
        #
        # 5 stars = 2 points
        # 4 stars = 1.6 points
        # etc.
        # ---------------------------------------------

        rating_info = rating_map.get(
            book.id,
            {
                "average_rating": 0,
                "rating_count": 0
            }
        )

        average_rating = (
            rating_info["average_rating"]
        )

        rating_count = (
            rating_info["rating_count"]
        )

        rating_score = (
            average_rating / 5
        ) * 2


        # ---------------------------------------------
        # POPULARITY SCORE
        #
        # 10 or more borrows = full 1 point
        # ---------------------------------------------

        borrow_count = popularity_map.get(
            book.id,
            0
        )

        popularity_score = min(
            borrow_count / 10,
            1
        )


        # ---------------------------------------------
        # FINAL SCORE
        # ---------------------------------------------

        recommendation_score = (
            category_score
            + rating_score
            + popularity_score
        )


        recommendations.append(
            {
                "book_id": book.id,
                "title": book.title,
                "category_id": book.category_id,
                "available_copies": (
                    book.available_copies
                ),

                "average_rating": round(
                    average_rating,
                    2
                ),

                "rating_count": rating_count,

                "borrow_count": borrow_count,

                "category_score": round(
                    category_score,
                    2
                ),

                "rating_score": round(
                    rating_score,
                    2
                ),

                "popularity_score": round(
                    popularity_score,
                    2
                ),

                "recommendation_score": round(
                    recommendation_score,
                    2
                )
            }
        )


    # -----------------------------------------------------
    # 7. SORT BEST RECOMMENDATIONS FIRST
    # -----------------------------------------------------

    recommendations.sort(
        key=lambda item: (
            item["recommendation_score"],
            item["average_rating"],
            item["borrow_count"]
        ),
        reverse=True
    )


    # -----------------------------------------------------
    # 8. LIMIT RESULTS
    # -----------------------------------------------------

    recommendations = recommendations[:limit]


    return {
        "user_id": current_user.id,

        "preferred_categories":
            preferred_categories,

        "scoring_method": {
            "category_preference": "Maximum 3 points",
            "average_rating": "Maximum 2 points",
            "borrowing_popularity": "Maximum 1 point"
        },

        "total_recommendations":
            len(recommendations),

        "recommendations":
            recommendations
    }

# ---------------------------------------------------------
# GET SINGLE BOOK
# ALL AUTHENTICATED USERS
# ---------------------------------------------------------
@router.get(
    "/{book_id}",
    response_model=BookResponse
)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    book = book_repository.get_book_by_id(
        db,
        book_id
    )

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    return book


# ---------------------------------------------------------
# UPDATE BOOK
# ADMIN / LIBRARIAN
# ---------------------------------------------------------
@router.put(
    "/{book_id}",
    response_model=BookResponse
)
def update_book(
    book_id: int,
    book_data: BookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    try:

        book = book_repository.update_book(
            db,
            book_id,
            book_data
        )

        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

        # -------------------------------------------------
        # AUDIT LOG
        # -------------------------------------------------
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_UPDATED",
            entity_type="BOOK",
            entity_id=book.id,
            details=f"Updated book: {book.title}"
        )

        # Commit book update + audit log together
        db.commit()

        db.refresh(book)

        return book

    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to update book"
        )

    except HTTPException:

        db.rollback()
        raise

    except Exception:

        db.rollback()
        raise


# ---------------------------------------------------------
# DELETE / DEACTIVATE BOOK
# ADMIN ONLY
# ---------------------------------------------------------
@router.delete("/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    try:

        book = book_repository.delete_book(
            db,
            book_id
        )

        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Book not found"
            )

        # -------------------------------------------------
        # AUDIT LOG
        # -------------------------------------------------
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_DEACTIVATED",
            entity_type="BOOK",
            entity_id=book.id,
            details=f"Deactivated book: {book.title}"
        )

        # Commit book deactivation + audit log together
        db.commit()

        db.refresh(book)

        return {
            "message": "Book deactivated successfully"
        }

    except HTTPException:

        db.rollback()
        raise

    except Exception:

        db.rollback()
        raise