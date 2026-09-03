from sqlalchemy.orm import Session

from app.models.author import Author
from app.schemas.author import AuthorCreate, AuthorUpdate


def create_author(db: Session, author: AuthorCreate):
    new_author = Author(
        name=author.name,
        country=author.country
    )

    db.add(new_author)
    db.commit()
    db.refresh(new_author)

    return new_author


def get_all_authors(db: Session):
    return db.query(Author).all()


def get_author_by_id(db: Session, author_id: int):
    return db.query(Author).filter(
        Author.id == author_id
    ).first()


def update_author(
    db: Session,
    author_id: int,
    author_data: AuthorUpdate
):
    author = get_author_by_id(db, author_id)

    if not author:
        return None

    if author_data.name is not None:
        author.name = author_data.name

    if author_data.country is not None:
        author.country = author_data.country

    db.commit()
    db.refresh(author)

    return author


def delete_author(db: Session, author_id: int):
    author = get_author_by_id(db, author_id)

    if not author:
        return None

    db.delete(author)
    db.commit()

    return author