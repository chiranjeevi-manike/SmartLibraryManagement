from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.book import Book
from app.models.book_rating import BookRating
from app.models.user import User
from app.schemas.book_rating import (
    BookRatingCreate,
    BookRatingUpdate,
    BookRatingResponse
)
from app.utils.dependencies import get_current_user
from sqlalchemy import func

router = APIRouter(
    prefix="/ratings",
    tags=["Book Ratings"]
)


@router.post(
    "/",
    response_model=BookRatingResponse,
    status_code=status.HTTP_201_CREATED
)
def create_rating(
    rating_data: BookRatingCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(get_current_user)
):

    # -----------------------------------------------------
    # CHECK BOOK EXISTS
    # -----------------------------------------------------

    book = (
        db.query(Book)
        .filter(
            Book.id == rating_data.book_id,
            Book.is_active == True
        )
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # -----------------------------------------------------
    # PREVENT DUPLICATE RATING
    # -----------------------------------------------------

    existing_rating = (
        db.query(BookRating)
        .filter(
            BookRating.user_id == current_user.id,
            BookRating.book_id == rating_data.book_id
        )
        .first()
    )

    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already rated this book"
        )

    # -----------------------------------------------------
    # CREATE RATING
    # -----------------------------------------------------

    new_rating = BookRating(
        user_id=current_user.id,
        book_id=rating_data.book_id,
        rating=rating_data.rating,
        review=rating_data.review
    )

    try:

        db.add(new_rating)
        db.commit()
        db.refresh(new_rating)

        return new_rating

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create rating"
        )


@router.get("/me")
def get_my_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    ratings = (
        db.query(BookRating)
        .filter(
            BookRating.user_id == current_user.id
        )
        .order_by(
            BookRating.created_at.desc()
        )
        .all()
    )

    return {
        "total": len(ratings),
        "ratings": [
            {
                "id": rating.id,
                "user_id": rating.user_id,
                "book_id": rating.book_id,
                "rating": rating.rating,
                "review": rating.review,
                "created_at": rating.created_at,
                "updated_at": rating.updated_at
            }
            for rating in ratings
        ]
    }

@router.get("/book/{book_id}")
def get_book_ratings(
    book_id: int,
    db: Session = Depends(get_db)
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

    ratings = (
        db.query(BookRating)
        .filter(
            BookRating.book_id == book_id
        )
        .order_by(
            BookRating.created_at.desc()
        )
        .all()
    )

    average_rating = (
        db.query(
            func.avg(BookRating.rating)
        )
        .filter(
            BookRating.book_id == book_id
        )
        .scalar()
    )

    return {
        "book_id": book.id,
        "title": book.title,
        "total_ratings": len(ratings),
        "average_rating": (
            round(float(average_rating), 2)
            if average_rating is not None
            else 0
        ),
        "ratings": [
            {
                "id": rating.id,
                "user_id": rating.user_id,
                "rating": rating.rating,
                "review": rating.review,
                "created_at": rating.created_at,
                "updated_at": rating.updated_at
            }
            for rating in ratings
        ]
    }


@router.put(
    "/{rating_id}",
    response_model=BookRatingResponse
)
def update_rating(
    rating_id: int,
    rating_data: BookRatingUpdate,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    rating = (
        db.query(BookRating)
        .filter(
            BookRating.id == rating_id
        )
        .first()
    )

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )

    if rating.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can update only your own rating"
        )

    if rating_data.rating is not None:
        rating.rating = rating_data.rating

    if rating_data.review is not None:
        rating.review = rating_data.review

    try:
        db.commit()
        db.refresh(rating)
        return rating

    except Exception:
        db.rollback()
        raise


@router.delete("/{rating_id}")
def delete_rating(
    rating_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    rating = (
        db.query(BookRating)
        .filter(
            BookRating.id == rating_id
        )
        .first()
    )

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )

    if rating.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own rating"
        )

    try:
        db.delete(rating)
        db.commit()

        return {
            "message": "Rating deleted successfully",
            "rating_id": rating_id
        }

    except Exception:
        db.rollback()
        raise