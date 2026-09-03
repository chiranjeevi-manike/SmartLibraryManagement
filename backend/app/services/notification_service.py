from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.book import Book
from app.models.notification import Notification


def generate_due_reminders(db: Session):

    now = datetime.utcnow()
    reminder_limit = now + timedelta(days=2)

    upcoming_issues = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date >= now,
            Issue.due_date <= reminder_limit
        )
        .all()
    )

    created_count = 0

    for issue in upcoming_issues:

        book = (
            db.query(Book)
            .filter(Book.id == issue.book_id)
            .first()
        )

        book_title = (
            book.title
            if book
            else f"Book ID {issue.book_id}"
        )

        # Prevent duplicate reminder
        existing_notification = (
            db.query(Notification)
            .filter(
                Notification.user_id == issue.user_id,
                Notification.notification_type == "DUE_REMINDER",
                Notification.message.contains(
                    f"Issue ID {issue.id}"
                )
            )
            .first()
        )

        if existing_notification:
            continue

        notification = Notification(
            user_id=issue.user_id,
            message=(
                f"{book_title} is due on "
                f"{issue.due_date.strftime('%d-%m-%Y')}. "
                f"Please return or renew it before the due date. "
                f"Issue ID {issue.id}"
            ),
            notification_type="DUE_REMINDER",
            is_read=False
        )

        db.add(notification)
        created_count += 1

    db.commit()

    return {
        "created_count": created_count
    }


def generate_overdue_notifications(db: Session):

    now = datetime.utcnow()

    overdue_issues = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .all()
    )

    created_count = 0

    for issue in overdue_issues:

        book = (
            db.query(Book)
            .filter(Book.id == issue.book_id)
            .first()
        )

        book_title = (
            book.title
            if book
            else f"Book ID {issue.book_id}"
        )

        # Prevent duplicate overdue notification
        existing_notification = (
            db.query(Notification)
            .filter(
                Notification.user_id == issue.user_id,
                Notification.notification_type == "OVERDUE",
                Notification.message.contains(
                    f"Issue ID {issue.id}"
                )
            )
            .first()
        )

        if existing_notification:
            continue

        overdue_days = (
            now.date() - issue.due_date.date()
        ).days

        notification = Notification(
            user_id=issue.user_id,
            message=(
                f"{book_title} is overdue by "
                f"{overdue_days} day(s). "
                f"Please return the book as soon as possible. "
                f"Issue ID {issue.id}"
            ),
            notification_type="OVERDUE",
            is_read=False
        )

        db.add(notification)
        created_count += 1

    db.commit()

    return {
        "created_count": created_count
    }