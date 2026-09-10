import csv
import io

from datetime import datetime, timedelta, timezone

from app.models.reservation import Reservation


def parse_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def create_test_reservation(
    db,
    test_member,
    test_book,
    reservation_status="READY",
):
    reservation = Reservation(
        user_id=test_member.id,
        book_id=test_book.id,
        reserved_at=datetime.now(timezone.utc),
        status=reservation_status,
        ready_until=(
            datetime.now(timezone.utc)
            + timedelta(days=2)
        ),
    )

    db.add(reservation)
    db.flush()

    return reservation


def test_admin_can_export_reservations_csv(
    client,
    db,
    admin_headers,
    test_member,
    test_book,
):
    reservation = create_test_reservation(
        db,
        test_member,
        test_book,
    )

    response = client.get(
        "/reservations/export/csv",
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
    assert "library_reservations_" in disposition

    rows = parse_csv_response(response)

    expected_columns = {
        "reservation_id",
        "member_id",
        "username",
        "member_name",
        "member_email",
        "book_id",
        "isbn",
        "book_title",
        "reserved_at",
        "status",
        "ready_until",
    }

    assert len(rows) > 0
    assert set(rows[0].keys()) == expected_columns

    exported_reservation = next(
        row
        for row in rows
        if int(row["reservation_id"])
        == reservation.id
    )

    assert (
        exported_reservation["username"]
        == test_member.username
    )

    assert (
        exported_reservation["book_title"]
        == test_book.title
    )

    assert (
        exported_reservation["status"]
        == "READY"
    )


def test_librarian_can_export_reservations_csv(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
):
    reservation = create_test_reservation(
        db,
        test_member,
        test_book,
        reservation_status="ACTIVE",
    )

    response = client.get(
        "/reservations/export/csv",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    rows = parse_csv_response(response)

    assert any(
        int(row["reservation_id"])
        == reservation.id
        for row in rows
    )


def test_member_cannot_export_reservations_csv(
    client,
    member_headers,
):
    response = client.get(
        "/reservations/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403