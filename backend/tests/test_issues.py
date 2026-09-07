from app.models.book import Book
from app.models.book_copy import BookCopy
from app.models.issue import Issue

from datetime import datetime, timedelta


from app.models.reservation import Reservation
from app.models.user import User
from app.models.role import Role
from app.utils.security import hash_password


def test_librarian_can_issue_physical_book_copy(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Before issuing
    assert test_book.available_copies == 3

    available_before = (
        db.query(BookCopy)
        .filter(
            BookCopy.book_id == test_book.id,
            BookCopy.status == "AVAILABLE",
        )
        .count()
    )

    assert available_before == 3

    # Issue the book
    response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": test_member.id,
            "book_id": test_book.id,
        },
    )

    assert response.status_code == 201

    db.expire_all()

    # Reload book
    updated_book = (
        db.query(Book)
        .filter(Book.id == test_book.id)
        .first()
    )

    assert updated_book.available_copies == 2

    # Exactly one physical copy should be ISSUED
    issued_copies = (
        db.query(BookCopy)
        .filter(
            BookCopy.book_id == test_book.id,
            BookCopy.status == "ISSUED",
        )
        .all()
    )

    assert len(issued_copies) == 1

    # Verify issue record
    issue = (
        db.query(Issue)
        .filter(
            Issue.user_id == test_member.id,
            Issue.book_id == test_book.id,
        )
        .first()
    )

    assert issue is not None
    assert issue.book_copy_id is not None
    assert issue.book_copy_id == issued_copies[0].id


def test_return_restores_exact_physical_copy(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Issue one copy first
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

    db.expire_all()

    issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    assert issue is not None
    assert issue.book_copy_id is not None

    issued_copy_id = issue.book_copy_id

    issued_copy = (
        db.query(BookCopy)
        .filter(BookCopy.id == issued_copy_id)
        .first()
    )

    assert issued_copy is not None
    assert issued_copy.status == "ISSUED"

    # Return the book
    return_response = client.post(
        f"/issues/{issue_id}/return",
        headers=librarian_headers,
    )

    assert return_response.status_code == 200

    db.expire_all()

    # Aggregate inventory should return from 2 to 3
    updated_book = (
        db.query(Book)
        .filter(Book.id == test_book.id)
        .first()
    )

    assert updated_book.available_copies == 3

    # The SAME physical copy must become AVAILABLE
    returned_copy = (
        db.query(BookCopy)
        .filter(BookCopy.id == issued_copy_id)
        .first()
    )

    assert returned_copy is not None
    assert returned_copy.status == "AVAILABLE"

    # Historical physical-copy link must remain
    returned_issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    assert returned_issue.book_copy_id == issued_copy_id
    assert returned_issue.status == "RETURNED"



def test_member_cannot_issue_book(
    client,
    member_headers,
    test_member,
    test_book,
    test_book_copies,
):
    response = client.post(
        "/issues/",
        headers=member_headers,
        json={
            "user_id": test_member.id,
            "book_id": test_book.id,
        },
    )

    assert response.status_code == 403



def test_admin_can_issue_book(
    client,
    db,
    admin_headers,
    test_member,
    test_book,
    test_book_copies,
):
    response = client.post(
        "/issues/",
        headers=admin_headers,
        json={
            "user_id": test_member.id,
            "book_id": test_book.id,
        },
    )

    assert response.status_code == 201

    db.expire_all()

    issue = (
        db.query(Issue)
        .filter(
            Issue.user_id == test_member.id,
            Issue.book_id == test_book.id,
        )
        .first()
    )

    assert issue is not None
    assert issue.book_copy_id is not None



def test_duplicate_active_issue_is_blocked(
    client,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    member_id = test_member.id
    book_id = test_book.id

    payload = {
        "user_id": member_id,
        "book_id": book_id,
    }

    # First issue succeeds
    first_response = client.post(
        "/issues/",
        headers=librarian_headers,
        json=payload,
    )

    assert first_response.status_code == 201

    # Duplicate active issue is rejected
    second_response = client.post(
        "/issues/",
        headers=librarian_headers,
        json=payload,
    )

    assert second_response.status_code == 400


def test_member_cannot_exceed_three_active_issues(
    client,
    db,
    librarian_headers,
    test_member,
    four_test_books,
):
    member_id = test_member.id

    # First 3 different books should be issued successfully
    for book in four_test_books[:3]:
        response = client.post(
            "/issues/",
            headers=librarian_headers,
            json={
                "user_id": member_id,
                "book_id": book.id,
            },
        )

        assert response.status_code == 201

    # 4th different book should be blocked
    fourth_book = four_test_books[3]

    response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": member_id,
            "book_id": fourth_book.id,
        },
    )

    assert response.status_code == 400


def test_double_return_is_blocked(
    client,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Issue the book
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

    # First return should succeed
    first_return = client.post(
        f"/issues/{issue_id}/return",
        headers=librarian_headers,
    )

    assert first_return.status_code == 200

    # Second return should be blocked
    second_return = client.post(
        f"/issues/{issue_id}/return",
        headers=librarian_headers,
    )

    assert second_return.status_code == 400


def test_member_with_overdue_book_cannot_borrow_another_book(
    client,
    db,
    librarian_headers,
    test_member,
    four_test_books,
):
    member_id = test_member.id

    overdue_book = four_test_books[0]
    new_book = four_test_books[1]

    # Create an existing overdue active issue
    overdue_issue = Issue(
        user_id=member_id,
        book_id=overdue_book.id,
        book_copy_id=overdue_book.copies[0].id,
        issue_date=datetime.utcnow() - timedelta(days=20),
        due_date=datetime.utcnow() - timedelta(days=6),
        status="ISSUED",
        overdue_days=6,
        fine_amount=30,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(overdue_issue)

    # Make its physical copy issued
    overdue_book.copies[0].status = "ISSUED"
    overdue_book.available_copies = 0

    db.flush()

    # Try to borrow another book
    response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": member_id,
            "book_id": new_book.id,
        },
    )

    # Member with overdue book must be blocked
    assert response.status_code == 400



def test_member_with_unpaid_fine_cannot_borrow_another_book(
    client,
    db,
    librarian_headers,
    test_member,
    four_test_books,
):
    member_id = test_member.id

    old_book = four_test_books[0]
    new_book = four_test_books[1]

    # Create a previously returned issue with an unpaid fine.
    # Because it is RETURNED, this test isolates the unpaid-fine rule
    # from the overdue-active-book rule.
    old_issue = Issue(
        user_id=member_id,
        book_id=old_book.id,
        book_copy_id=old_book.copies[0].id,
        issue_date=datetime.utcnow() - timedelta(days=30),
        due_date=datetime.utcnow() - timedelta(days=16),
        return_date=datetime.utcnow() - timedelta(days=10),
        status="RETURNED",
        overdue_days=6,
        fine_amount=30,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(old_issue)
    db.flush()

    # Member tries to borrow a different available book
    response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": member_id,
            "book_id": new_book.id,
        },
    )

    assert response.status_code == 400


def test_member_with_paid_fine_can_borrow_another_book(
    client,
    db,
    librarian_headers,
    test_member,
    four_test_books,
):
    member_id = test_member.id

    old_book = four_test_books[0]
    new_book = four_test_books[1]

    # Previous returned issue with a PAID fine
    old_issue = Issue(
        user_id=member_id,
        book_id=old_book.id,
        book_copy_id=old_book.copies[0].id,
        issue_date=datetime.utcnow() - timedelta(days=30),
        due_date=datetime.utcnow() - timedelta(days=16),
        return_date=datetime.utcnow() - timedelta(days=10),
        status="RETURNED",
        overdue_days=6,
        fine_amount=30,
        fine_status="PAID",
        fine_paid_at=datetime.utcnow() - timedelta(days=5),
        renewal_count=0,
    )

    db.add(old_issue)
    db.flush()

    # Member should now be allowed to borrow another book
    response = client.post(
        "/issues/",
        headers=librarian_headers,
        json={
            "user_id": member_id,
            "book_id": new_book.id,
        },
    )

    assert response.status_code == 201


def test_first_renewal_succeeds(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Issue the book first
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

    db.expire_all()

    issue_before = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    assert issue_before is not None
    assert issue_before.renewal_count == 0

    old_due_date = issue_before.due_date

    # Renew the book
    renew_response = client.put(
        f"/issues/{issue_id}/renew",
        headers=librarian_headers,
    )

    assert renew_response.status_code == 200

    db.expire_all()

    renewed_issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    assert renewed_issue.renewal_count == 1
    assert renewed_issue.due_date == old_due_date + timedelta(days=14)


def test_second_renewal_is_blocked(
    client,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Issue the book
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

    # First renewal should succeed
    first_renewal = client.put(
        f"/issues/{issue_id}/renew",
        headers=librarian_headers,
    )

    assert first_renewal.status_code == 200
    assert first_renewal.json()["renewal_count"] == 1

    # Second renewal must be blocked
    second_renewal = client.put(
        f"/issues/{issue_id}/renew",
        headers=librarian_headers,
    )

    assert second_renewal.status_code == 400



def test_overdue_book_cannot_be_renewed(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Create an active issue whose due date is already past
    overdue_issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        book_copy_id=test_book_copies[0].id,
        issue_date=datetime.utcnow() - timedelta(days=20),
        due_date=datetime.utcnow() - timedelta(days=6),
        status="ISSUED",
        overdue_days=6,
        fine_amount=30,
        fine_status="UNPAID",
        renewal_count=0,
    )

    db.add(overdue_issue)

    test_book_copies[0].status = "ISSUED"
    test_book.available_copies = 2

    db.flush()

    response = client.put(
        f"/issues/{overdue_issue.id}/renew",
        headers=librarian_headers,
    )

    assert response.status_code == 400


def test_renewal_blocked_when_another_member_has_active_reservation(
    client,
    db,
    librarian_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Issue the book to member1
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

    # Find MEMBER role
    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    assert member_role is not None

    # Create another member
    second_member = User(
        username="member2",
        email="member2@test.local",
        password=hash_password("Temp123!"),
        full_name="Second Test Member",
        role_id=member_role.id,
    )

    db.add(second_member)
    db.flush()

    # Another member reserves the same book
    reservation = Reservation(
        user_id=second_member.id,
        book_id=test_book.id,
        status="ACTIVE",
    )

    db.add(reservation)
    db.flush()

    # Renewal should now be blocked
    response = client.put(
        f"/issues/{issue_id}/renew",
        headers=librarian_headers,
    )

    assert response.status_code == 400


def test_issue_history_includes_book_copy_and_accession_number(
    client,
    db,
    member_headers,
    test_member,
    test_book,
    test_book_copies,
):
    issue = Issue(
        user_id=test_member.id,
        book_id=test_book.id,
        book_copy_id=test_book_copies[0].id,
        issue_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=14),
        status="ISSUED",
        overdue_days=0,
        fine_amount=0,
        renewal_count=0,
    )

    db.add(issue)
    db.flush()

    response = client.get(
        "/issues/me/issues",
        headers=member_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) >= 1

    history_item = next(
        item
        for item in data
        if item["id"] == issue.id
    )

    assert history_item["book_copy_id"] == test_book_copies[0].id
    assert (
        history_item["accession_number"]
        == test_book_copies[0].accession_number
    )