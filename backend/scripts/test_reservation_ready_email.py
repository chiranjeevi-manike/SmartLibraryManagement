from datetime import datetime, timedelta

from app.database import SessionLocal

from app.models.role import Role
from app.models.user import User
from app.models.author import Author
from app.models.category import Category
from app.models.book import Book
from app.models.book_copy import BookCopy
from app.models.issue import Issue
from app.models.reservation import Reservation
from app.models.notification import Notification

from app.services.notification_service import (
    send_reservation_ready_emails
)


db = SessionLocal()

try:
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == 19)
        .first()
    )

    if not reservation:
        raise RuntimeError("Reservation 19 not found")

    user = (
        db.query(User)
        .filter(User.id == reservation.user_id)
        .first()
    )

    if not user:
        raise RuntimeError("Reservation user not found")

    # Temporary test values only
    user.email = "chiru.research@gmail.com"
    reservation.status = "READY"
    reservation.ready_until = (
        datetime.utcnow() + timedelta(days=2)
    )

    db.flush()

    first_result = send_reservation_ready_emails(db)
    print("First run:", first_result)

    second_result = send_reservation_ready_emails(db)
    print("Second run:", second_result)

finally:
    db.rollback()
    db.close()

print("Temporary database changes rolled back")