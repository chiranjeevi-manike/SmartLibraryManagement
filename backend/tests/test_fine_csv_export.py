import csv
import io

from datetime import datetime, timedelta

from app.models.fine_payment import FinePayment
from app.models.issue import Issue
from app.models.role import Role
from app.models.user import User


def parse_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def create_paid_fine(
    db,
    test_member,
    test_book,
):
    admin = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == "ADMIN")
        .first()
    )

    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        issue_date=(
            datetime.utcnow()
            - timedelta(days=30)
        ),
        due_date=(
            datetime.utcnow()
            - timedelta(days=16)
        ),
        return_date=datetime.utcnow(),
        status="RETURNED",
        overdue_days=16,
        fine_amount=80,
        fine_status="PAID",
        fine_paid_at=datetime.utcnow(),
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    payment = FinePayment(
        issue_id=issue.id,
        user_id=test_member.id,
        book_id=test_book.id,
        amount=80,
        payment_method="MANUAL",
        received_by=admin.id,
        paid_at=issue.fine_paid_at,
    )

    db.add(payment)
    db.flush()

    return issue, payment, admin


def test_admin_can_export_fines_csv(
    client,
    db,
    admin_headers,
    test_member,
    test_book,
):
    issue, payment, admin = create_paid_fine(
        db,
        test_member,
        test_book,
    )

    response = client.get(
        "/issues/fines/export/csv",
        headers=admin_headers,
    )

    assert response.status_code == 200

    assert response.headers[
        "content-type"
    ].startswith("text/csv")

    disposition = response.headers[
        "content-disposition"
    ]

    assert "attachment" in disposition
    assert "library_fines_" in disposition

    rows = parse_csv_response(response)

    expected_columns = {
        "issue_id",
        "member_id",
        "username",
        "member_name",
        "member_email",
        "book_id",
        "isbn",
        "book_title",
        "overdue_days",
        "fine_amount",
        "fine_status",
        "return_date",
        "payment_id",
        "payment_method",
        "paid_at",
        "received_by",
        "received_by_username",
    }

    assert len(rows) > 0
    assert set(rows[0].keys()) == expected_columns

    exported_fine = next(
        row
        for row in rows
        if int(row["issue_id"]) == issue.id
    )

    assert exported_fine["fine_status"] == "PAID"
    assert float(exported_fine["fine_amount"]) == 80
    assert (
        int(exported_fine["payment_id"])
        == payment.id
    )
    assert (
        exported_fine["payment_method"]
        == "MANUAL"
    )
    assert (
        exported_fine["received_by_username"]
        == admin.username
    )


def test_librarian_can_export_fines_csv(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
):
    issue, _, _ = create_paid_fine(
        db,
        test_member,
        test_book,
    )

    response = client.get(
        "/issues/fines/export/csv",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    rows = parse_csv_response(response)

    assert any(
        int(row["issue_id"]) == issue.id
        for row in rows
    )


def test_member_cannot_export_fines_csv(
    client,
    member_headers,
):
    response = client.get(
        "/issues/fines/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403