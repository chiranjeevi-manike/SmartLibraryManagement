from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def create_category(db: Session, category: CategoryCreate):
    new_category = Category(
        name=category.name,
        description=category.description
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


def get_all_categories(db: Session):
    return db.query(Category).all()


def get_category_by_id(db: Session, category_id: int):
    return db.query(Category).filter(
        Category.id == category_id
    ).first()


def update_category(
    db: Session,
    category_id: int,
    category_data: CategoryUpdate
):
    category = get_category_by_id(db, category_id)

    if not category:
        return None

    if category_data.name is not None:
        category.name = category_data.name

    if category_data.description is not None:
        category.description = category_data.description

    db.commit()
    db.refresh(category)

    return category


def delete_category(db: Session, category_id: int):
    category = get_category_by_id(db, category_id)

    if not category:
        return None

    db.delete(category)
    db.commit()

    return category