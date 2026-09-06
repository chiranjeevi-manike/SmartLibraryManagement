from datetime import datetime, timedelta

from app.models.issue import Issue
from app.services import notification_service
from app.models.reservation import Reservation


def test_due_reminder_email_sent_once(
    db,
    test_member,
    test_book,
    monkeypatch,
):
    test_member.email = "test@example.com"

    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        issue_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=1),
        status="ISSUED",
        fine_amount=0,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    sent_emails = []

    def fake_send_email(to_email, subject, body):
        sent_emails.append({
            "to_email": to_email,
            "subject": subject,
            "body": body,
        })
        return True

    monkeypatch.setattr(
        notification_service,
        "send_email",
        fake_send_email,
    )

    first_result = (
        notification_service.send_due_reminder_emails(db)
    )

    second_result = (
        notification_service.send_due_reminder_emails(db)
    )

    assert first_result["sent_count"] == 1
    assert first_result["failed_count"] == 0

    assert second_result["sent_count"] == 0
    assert second_result["failed_count"] == 0

    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "test@example.com"



def test_overdue_email_sent_once(
    db,
    test_member,
    test_book,
    monkeypatch,
):
    test_member.email = "test@example.com"

    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        issue_date=datetime.utcnow() - timedelta(days=10),
        due_date=datetime.utcnow() - timedelta(days=3),
        status="ISSUED",
        fine_amount=0,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    sent_emails = []

    def fake_send_email(to_email, subject, body):
        sent_emails.append({
            "to_email": to_email,
            "subject": subject,
            "body": body,
        })
        return True

    monkeypatch.setattr(
        notification_service,
        "send_email",
        fake_send_email,
    )

    first_result = (
        notification_service.send_overdue_emails(db)
    )

    second_result = (
        notification_service.send_overdue_emails(db)
    )

    assert first_result["sent_count"] == 1
    assert first_result["failed_count"] == 0

    assert second_result["sent_count"] == 0
    assert second_result["failed_count"] == 0

    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "test@example.com"



from app.models.reservation import Reservation


def test_reservation_ready_email_sent_once(
    db,
    test_member,
    test_book,
    monkeypatch,
):
    test_member.email = "test@example.com"

    reservation = Reservation(
        user_id=test_member.id,
        book_id=test_book.id,
        status="READY",
        reserved_at=datetime.utcnow(),
        ready_until=datetime.utcnow() + timedelta(days=2),
    )

    db.add(reservation)
    db.flush()

    sent_emails = []

    def fake_send_email(to_email, subject, body):
        sent_emails.append({
            "to_email": to_email,
            "subject": subject,
            "body": body,
        })
        return True

    monkeypatch.setattr(
        notification_service,
        "send_email",
        fake_send_email,
    )

    first_result = (
        notification_service.send_reservation_ready_emails(db)
    )

    second_result = (
        notification_service.send_reservation_ready_emails(db)
    )

    assert first_result["sent_count"] == 1
    assert first_result["failed_count"] == 0

    assert second_result["sent_count"] == 0
    assert second_result["failed_count"] == 0

    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "test@example.com"

    assert (
        sent_emails[0]["subject"]
        == "Your Reserved Book Is Ready for Pickup"
    )

    assert (
        f"Reservation ID: {reservation.id}"
        in sent_emails[0]["body"]
    )