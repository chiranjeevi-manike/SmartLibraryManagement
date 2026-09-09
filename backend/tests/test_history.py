from datetime import datetime, timedelta

from app.models.issue import Issue
from app.models.renewal_history import RenewalHistory
from app.models.fine_payment import FinePayment


def test_successful_renewal_creates_history(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    issue_response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": test_member.id,
            "book_id": test_book.id,
        },
    )

    assert issue_response.status_code == 201

    issue_id = issue_response.json()["id"]

    issue_before = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    previous_due_date = issue_before.due_date

    response = client.put(
        f"/issues/{issue_id}/renew",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    db.expire_all()

    history = (
        db.query(RenewalHistory)
        .filter(
            RenewalHistory.issue_id == issue_id
        )
        .one()
    )

    assert history.user_id == test_member.id
    assert history.book_id == test_book.id
    assert history.previous_due_date == previous_due_date
    assert history.new_due_date == (
        previous_due_date + timedelta(days=14)
    )
    assert history.renewal_number == 1


def test_fine_payment_creates_history(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        book_copy_id=test_book_copies[0].id,
        issue_date=datetime.utcnow()
        - timedelta(days=30),
        due_date=datetime.utcnow()
        - timedelta(days=16),
        return_date=datetime.utcnow()
        - timedelta(days=10),
        status="RETURNED",
        overdue_days=6,
        fine_amount=30,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    response = client.put(
        f"/issues/{issue.id}/fine/pay",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    db.expire_all()

    payment = (
        db.query(FinePayment)
        .filter(
            FinePayment.issue_id == issue.id
        )
        .one()
    )

    assert payment.user_id == test_member.id
    assert payment.book_id == test_book.id
    assert float(payment.amount) == 30.0
    assert payment.payment_method == "MANUAL"
    assert payment.paid_at is not None