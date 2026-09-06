from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.book import Book
from app.models.notification import Notification
from app.models.user import User
from app.services.email_service import send_email
from app.models.reservation import Reservation

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



def send_due_reminder_emails(db: Session):

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

    sent_count = 0
    failed_count = 0

    for issue in upcoming_issues:

        user = (
            db.query(User)
            .filter(User.id == issue.user_id)
            .first()
        )

        if not user or not user.email:
            continue

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

        subject = "Library Book Due Reminder"

        body = (
            f"Dear {user.full_name or user.username},\n\n"
            f"This is a reminder that the book "
            f"'{book_title}' is due on "
            f"{issue.due_date.strftime('%d-%m-%Y')}.\n\n"
            f"Please return or renew the book before the due date.\n\n"
            f"Issue ID: {issue.id}\n\n"
            f"Smart Library Management System"
        )

        existing_email_notification = (
            db.query(Notification)
            .filter(
                Notification.user_id == issue.user_id,
                Notification.notification_type == "DUE_EMAIL_SENT",
                Notification.message.contains(
                    f"Issue ID {issue.id}"
                )
            )
            .first()
        )

        if existing_email_notification:
            continue

        
        try:
            send_email(
                to_email=user.email,
                subject=subject,
                body=body
            )

            email_log = Notification(
                user_id=issue.user_id,
                message=(
                    f"Due reminder email sent for "
                    f"{book_title}. "
                    f"Issue ID {issue.id}"
                ),
                notification_type="DUE_EMAIL_SENT",
                is_read=True
            )

            db.add(email_log)
            db.flush()



            sent_count += 1

        except Exception as error:
            failed_count += 1
            print(
                f"Due reminder email failed for "
                f"user {issue.user_id}: {error}"
            )

    return {
        "sent_count": sent_count,
        "failed_count": failed_count
    }


def send_overdue_emails(db: Session):

    now = datetime.utcnow()

    overdue_issues = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .all()
    )

    sent_count = 0
    failed_count = 0

    for issue in overdue_issues:

        user = (
            db.query(User)
            .filter(User.id == issue.user_id)
            .first()
        )

        if not user or not user.email:
            continue

        existing_email = (
            db.query(Notification)
            .filter(
                Notification.user_id == issue.user_id,
                Notification.notification_type == "OVERDUE_EMAIL_SENT",
                Notification.message.contains(
                    f"Issue ID {issue.id}"
                )
            )
            .first()
        )

        if existing_email:
            continue

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

        overdue_days = (
            now.date() - issue.due_date.date()
        ).days

        subject = "Library Book Overdue Reminder"

        body = (
            f"Dear {user.full_name or user.username},\n\n"
            f"The book '{book_title}' is overdue by "
            f"{overdue_days} day(s).\n\n"
            f"Please return the book as soon as possible "
            f"to avoid additional fines.\n\n"
            f"Issue ID: {issue.id}\n\n"
            f"Smart Library Management System"
        )

        try:
            send_email(
                to_email=user.email,
                subject=subject,
                body=body
            )

            email_log = Notification(
                user_id=issue.user_id,
                message=(
                    f"Overdue email sent for "
                    f"{book_title}. "
                    f"Issue ID {issue.id}"
                ),
                notification_type="OVERDUE_EMAIL_SENT",
                is_read=True
            )

            db.add(email_log)
            db.flush()

            sent_count += 1

        except Exception as error:
            failed_count += 1
            print(
                f"Overdue email failed for "
                f"user {issue.user_id}: {error}"
            )

    return {
        "sent_count": sent_count,
        "failed_count": failed_count
    }


def send_reservation_ready_emails(db: Session):

    ready_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY"
        )
        .all()
    )

    sent_count = 0
    failed_count = 0

    for reservation in ready_reservations:

        # Prevent duplicate READY emails
        existing_email = (
            db.query(Notification)
            .filter(
                Notification.user_id == reservation.user_id,
                Notification.notification_type
                == "RESERVATION_READY_EMAIL_SENT",
                Notification.message.contains(
                    f"Reservation ID {reservation.id}"
                )
            )
            .first()
        )

        if existing_email:
            continue

        user = (
            db.query(User)
            .filter(User.id == reservation.user_id)
            .first()
        )

        if not user or not user.email:
            continue

        book = (
            db.query(Book)
            .filter(Book.id == reservation.book_id)
            .first()
        )

        book_title = (
            book.title
            if book
            else f"Book ID {reservation.book_id}"
        )

        ready_until_text = (
            reservation.ready_until.strftime("%d-%m-%Y %H:%M")
            if reservation.ready_until
            else "the pickup deadline"
        )

        subject = "Your Reserved Book Is Ready for Pickup"

        body = (
            f"Dear {user.full_name or user.username},\n\n"
            f"Good news! Your reserved book "
            f"'{book_title}' is now ready for pickup.\n\n"
            f"Please collect it before "
            f"{ready_until_text}.\n\n"
            f"Reservation ID: {reservation.id}\n\n"
            f"Smart Library Management System"
        )

        try:
            send_email(
                to_email=user.email,
                subject=subject,
                body=body
            )

            email_log = Notification(
                user_id=reservation.user_id,
                message=(
                    f"Reservation ready email sent for "
                    f"{book_title}. "
                    f"Reservation ID {reservation.id}"
                ),
                notification_type="RESERVATION_READY_EMAIL_SENT",
                is_read=True
            )

            db.add(email_log)
            db.flush()

            sent_count += 1

        except Exception as error:
            failed_count += 1

            print(
                f"Reservation ready email failed for "
                f"user {reservation.user_id}: {error}"
            )

    return {
        "sent_count": sent_count,
        "failed_count": failed_count
    }