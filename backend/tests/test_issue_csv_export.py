import csv
import io

from datetime import datetime, timedelta

from app.models.issue import Issue


def parse_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def create_test_issue(
    db,
    test_member,
    test_book,
):
    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        issue_date=datetime.utcnow(),
        due_date=(
            datetime.utcnow()
            + timedelta(days=14)
        ),
        status="ISSUED",
        overdue_days=0,
        fine_amount=0,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    return issue


def test_admin_can_export_issues_csv(
    client,
    db,
    admin_headers,
    test_member,
    test_book,
):
    issue = create_test_issue(
        db,
        test_member,
        test_book,
    )

    response = client.get(
        "/issues/export/csv",
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
    assert "library_issues_" in disposition

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
        "book_copy_id",
        "accession_number",
        "issue_date",
        "due_date",
        "return_date",
        "status",
        "overdue_days",
        "fine_amount",
        "fine_status",
        "fine_paid_at",
        "renewal_count",
    }

    assert len(rows) > 0
    assert set(rows[0].keys()) == expected_columns

    exported_issue = next(
        row
        for row in rows
        if int(row["issue_id"]) == issue.id
    )

    assert (
        exported_issue["username"]
        == test_member.username
    )

    assert (
        exported_issue["book_title"]
        == test_book.title
    )

    assert (
        exported_issue["status"]
        == "ISSUED"
    )


def test_librarian_can_export_issues_csv(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
):
    issue = create_test_issue(
        db,
        test_member,
        test_book,
    )

    response = client.get(
        "/issues/export/csv",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    rows = parse_csv_response(response)

    assert any(
        int(row["issue_id"]) == issue.id
        for row in rows
    )


def test_member_cannot_export_issues_csv(
    client,
    member_headers,
):
    response = client.get(
        "/issues/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403