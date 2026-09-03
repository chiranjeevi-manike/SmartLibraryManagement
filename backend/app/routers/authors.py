from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.author import (
    AuthorCreate,
    AuthorUpdate,
    AuthorResponse
)
from app.repositories import author as author_repository
from app.models.user import User
from app.utils.dependencies import (
    get_current_user,
    require_role,
    require_roles
)


router = APIRouter(
    prefix="/authors",
    tags=["Authors"]
)


@router.post(
    "/",
    response_model=AuthorResponse,
    status_code=status.HTTP_201_CREATED
)
def create_author(
    author: AuthorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    return author_repository.create_author(db, author)


@router.get(
    "/",
    response_model=list[AuthorResponse]
)
def get_authors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return author_repository.get_all_authors(db)


@router.get(
    "/{author_id}",
    response_model=AuthorResponse
)
def get_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    author = author_repository.get_author_by_id(
        db,
        author_id
    )

    if not author:
        raise HTTPException(
            status_code=404,
            detail="Author not found"
        )

    return author


@router.put(
    "/{author_id}",
    response_model=AuthorResponse
)
def update_author(
    author_id: int,
    author_data: AuthorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    author = author_repository.update_author(
        db,
        author_id,
        author_data
    )

    if not author:
        raise HTTPException(
            status_code=404,
            detail="Author not found"
        )

    return author


@router.delete(
    "/{author_id}"
)
def delete_author(
    author_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    author = author_repository.delete_author(
        db,
        author_id
    )

    if not author:
        raise HTTPException(
            status_code=404,
            detail="Author not found"
        )

    return {
        "message": "Author deleted successfully"
    }