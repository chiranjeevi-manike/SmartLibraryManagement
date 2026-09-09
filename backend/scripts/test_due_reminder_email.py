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

from app.services.notification_service import send_overdue_emails


db = SessionLocal()

try:
    issue = db.query(Issue).filter(Issue.id == 20).first()

    if not issue:
        raise RuntimeError("Issue 20 not found")

    user = db.query(User).filter(User.id == issue.user_id).first()

    if not user:
        raise RuntimeError("Issue user not found")

    user.email = "chiru.research@gmail.com"
    issue.due_date = datetime.utcnow() - timedelta(days=3)

    db.flush()

    first_result = send_overdue_emails(db)
    print("First run:", first_result)

    second_result = send_overdue_emails(db)
    print("Second run:", second_result)

finally:
    db.rollback()
    db.close()

print("Temporary database changes rolled back")