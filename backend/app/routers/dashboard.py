from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.book import Book
from app.models.user import User
from app.models.issue import Issue
from app.models.reservation import Reservation
from app.models.user import User
from app.utils.dependencies import require_roles


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    now = datetime.utcnow()

    total_books = db.query(Book).filter(
        Book.is_active == True
    ).count()

    total_users = db.query(User).count()

    active_issues = db.query(Issue).filter(
        Issue.status == "ISSUED"
    ).count()

    overdue_issues = db.query(Issue).filter(
        Issue.status == "ISSUED",
        Issue.due_date < now
    ).count()

    active_reservations = db.query(Reservation).filter(
        Reservation.status == "ACTIVE"
    ).count()

    returned_books = db.query(Issue).filter(
        Issue.status == "RETURNED"
    ).count()

    cancelled_reservations = db.query(Reservation).filter(
        Reservation.status == "CANCELLED"
    ).count()

    fulfilled_reservations = db.query(Reservation).filter(
        Reservation.status == "FULFILLED"
    ).count()

    total_available_copies = (
        db.query(Book)
        .filter(Book.is_active == True)
        .with_entities(Book.available_copies)
        .all()
    )

    total_available_copies = sum(
        row[0] for row in total_available_copies
    )

    return {
        "total_books": total_books,
        "total_users": total_users,
        "active_issues": active_issues,
        "overdue_issues": overdue_issues,
        "returned_books": returned_books,
        "active_reservations": active_reservations,
        "cancelled_reservations": cancelled_reservations,
        "fulfilled_reservations": fulfilled_reservations,
        "total_available_copies": total_available_copies
    }