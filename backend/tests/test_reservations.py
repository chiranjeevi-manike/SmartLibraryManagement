from app.models.reservation import Reservation
from app.models.user import User
from app.models.role import Role
from app.utils.security import hash_password
from datetime import datetime, timedelta
from app.models.issue import Issue
from app.models.book import Book
from app.models.book_copy import BookCopy

def test_cannot_reserve_available_book(
    client,
    member_headers,
    test_book,
    test_book_copies,
):
    # test_book has available physical copies
    assert test_book.available_copies > 0

    response = client.post(
        "/reservations/",
        headers=member_headers,
        json={
            "book_id": test_book.id,
        },
    )

    assert response.status_code == 400

    assert (
        response.json()["detail"]
        == "Book is currently available. Please borrow it instead of reserving it."
    )



def test_member_can_reserve_unavailable_book(
    client,
    db,
    member_headers,
    test_book,
    test_book_copies,
):
    # Make the book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    # Create reservation
    response = client.post(
        "/reservations/",
        headers=member_headers,
        json={
            "book_id": test_book.id,
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["book_id"] == test_book.id
    assert data["status"] == "ACTIVE"


def test_duplicate_active_reservation_is_blocked(
    client,
    db,
    member_headers,
    test_book,
    test_book_copies,
):
    # Make the book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    payload = {
        "book_id": test_book.id,
    }

    # First reservation should succeed
    first_response = client.post(
        "/reservations/",
        headers=member_headers,
        json=payload,
    )

    assert first_response.status_code == 201

    # Second ACTIVE reservation for same book must be blocked
    second_response = client.post(
        "/reservations/",
        headers=member_headers,
        json=payload,
    )

    assert second_response.status_code == 400
    assert (
        second_response.json()["detail"]
        == "You already have an active reservation for this book"
    )



def test_member_can_view_own_reservations(
    client,
    db,
    member_headers,
    test_member,
    test_book,
    test_book_copies,
):
    # Make book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    # Create reservation
    create_response = client.post(
        "/reservations/",
        headers=member_headers,
        json={
            "book_id": test_book.id,
        },
    )

    assert create_response.status_code == 201

    reservation_id = create_response.json()["id"]

    # Get current member's reservations
    response = client.get(
        "/reservations/my",
        headers=member_headers,
    )

    assert response.status_code == 200

    reservations = response.json()

    assert len(reservations) == 1
    assert reservations[0]["id"] == reservation_id
    assert reservations[0]["user_id"] == test_member.id
    assert reservations[0]["book_id"] == test_book.id
    assert reservations[0]["status"] == "ACTIVE"


def test_admin_can_view_all_reservations(
    client,
    admin_headers,
):
    response = client.get(
        "/reservations/",
        headers=admin_headers,
    )

    assert response.status_code == 200


def test_librarian_can_view_all_reservations(
    client,
    librarian_headers,
):
    response = client.get(
        "/reservations/",
        headers=librarian_headers,
    )

    assert response.status_code == 200


def test_member_cannot_view_all_reservations(
    client,
    member_headers,
):
    response = client.get(
        "/reservations/",
        headers=member_headers,
    )

    assert response.status_code == 403



def test_member_can_cancel_own_active_reservation(
    client,
    db,
    member_headers,
    test_book,
    test_book_copies,
):
    # Make the book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    # Create reservation
    create_response = client.post(
        "/reservations/",
        headers=member_headers,
        json={
            "book_id": test_book.id,
        },
    )

    assert create_response.status_code == 201

    reservation_id = create_response.json()["id"]

    # Cancel own reservation
    cancel_response = client.put(
        f"/reservations/{reservation_id}/cancel",
        headers=member_headers,
    )

    assert cancel_response.status_code == 200
    assert cancel_response.json()["status"] == "CANCELLED"


def test_member_cannot_cancel_another_members_reservation(
    client,
    db,
    member_headers,
    test_book,
    test_book_copies,
):
    # Make book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    # Get MEMBER role
    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    assert member_role is not None

    # Create second member
    second_member = User(
        username="reservation_member2",
        email="reservation_member2@test.local",
        password=hash_password("Temp123!"),
        full_name="Second Reservation Member",
        role_id=member_role.id,
    )

    db.add(second_member)
    db.flush()

    # Create reservation belonging to second member
    reservation = Reservation(
        user_id=second_member.id,
        book_id=test_book.id,
        status="ACTIVE",
    )

    db.add(reservation)
    db.flush()

    reservation_id = reservation.id

    # member1 tries to cancel member2's reservation
    response = client.put(
        f"/reservations/{reservation_id}/cancel",
        headers=member_headers,
    )

    assert response.status_code == 403


def test_double_cancellation_is_blocked(
    client,
    db,
    member_headers,
    test_book,
    test_book_copies,
):
    # Make book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    # Create reservation
    create_response = client.post(
        "/reservations/",
        headers=member_headers,
        json={
            "book_id": test_book.id,
        },
    )

    assert create_response.status_code == 201

    reservation_id = create_response.json()["id"]

    # First cancellation succeeds
    first_cancel = client.put(
        f"/reservations/{reservation_id}/cancel",
        headers=member_headers,
    )

    assert first_cancel.status_code == 200
    assert first_cancel.json()["status"] == "CANCELLED"

    # Second cancellation must be blocked
    second_cancel = client.put(
        f"/reservations/{reservation_id}/cancel",
        headers=member_headers,
    )

    assert second_cancel.status_code == 400



from datetime import datetime, timedelta

def test_reservation_queue_is_fifo(
    client,
    db,
    librarian_headers,
    test_book,
    test_book_copies,
):
    # Make the book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    member1 = User(
        username="queue_member1",
        email="queue_member1@test.local",
        password=hash_password("Temp123!"),
        full_name="Queue Member One",
        role_id=member_role.id,
    )

    member2 = User(
        username="queue_member2",
        email="queue_member2@test.local",
        password=hash_password("Temp123!"),
        full_name="Queue Member Two",
        role_id=member_role.id,
    )

    db.add_all([member1, member2])
    db.flush()

    first_reservation = Reservation(
        user_id=member1.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow() - timedelta(minutes=10),
    )

    second_reservation = Reservation(
        user_id=member2.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow(),
    )

    db.add_all([
        first_reservation,
        second_reservation,
    ])

    db.flush()

    response = client.get(
        f"/reservations/book/{test_book.id}/queue",
        headers=librarian_headers,
    )

    assert response.status_code == 200

    queue = response.json()

    assert len(queue) == 2

    assert queue[0]["position"] == 1
    assert queue[0]["reservation_id"] == first_reservation.id
    assert queue[0]["user_id"] == member1.id

    assert queue[1]["position"] == 2
    assert queue[1]["reservation_id"] == second_reservation.id
    assert queue[1]["user_id"] == member2.id



def test_second_reservation_cannot_be_fulfilled_before_first(
    client,
    db,
    librarian_headers,
    test_book,
    test_book_copies,
):
    # Make book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    member1 = User(
        username="fulfill_member1",
        email="fulfill_member1@test.local",
        password=hash_password("Temp123!"),
        full_name="Fulfill Member One",
        role_id=member_role.id,
    )

    member2 = User(
        username="fulfill_member2",
        email="fulfill_member2@test.local",
        password=hash_password("Temp123!"),
        full_name="Fulfill Member Two",
        role_id=member_role.id,
    )

    db.add_all([member1, member2])
    db.flush()

    first_reservation = Reservation(
        user_id=member1.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow() - timedelta(minutes=10),
    )

    second_reservation = Reservation(
        user_id=member2.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow(),
    )

    db.add_all([
        first_reservation,
        second_reservation,
    ])

    db.flush()

    # Try to fulfill the second reservation first
    response = client.put(
        f"/reservations/{second_reservation.id}/fulfill",
        headers=librarian_headers,
    )

    assert response.status_code == 400



def test_first_reservation_can_be_fulfilled_when_copy_available(
    client,
    db,
    librarian_headers,
    test_book,
    test_book_copies,
):
    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    member1 = User(
        username="first_queue_member",
        email="first_queue_member@test.local",
        password=hash_password("Temp123!"),
        full_name="First Queue Member",
        role_id=member_role.id,
    )

    member2 = User(
        username="second_queue_member",
        email="second_queue_member@test.local",
        password=hash_password("Temp123!"),
        full_name="Second Queue Member",
        role_id=member_role.id,
    )

    db.add_all([member1, member2])
    db.flush()

    # Initially all copies unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    first_reservation = Reservation(
        user_id=member1.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow() - timedelta(minutes=10),
    )

    second_reservation = Reservation(
        user_id=member2.id,
        book_id=test_book.id,
        status="ACTIVE",
        reserved_at=datetime.utcnow(),
    )

    db.add_all([
        first_reservation,
        second_reservation,
    ])

    db.flush()

    first_reservation_id = first_reservation.id

    # One physical copy becomes available
    test_book_copies[0].status = "AVAILABLE"
    test_book.available_copies = 1

    db.flush()

    response = client.put(
        f"/reservations/{first_reservation_id}/fulfill",
        headers=librarian_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "FULFILLED"

    db.expire_all()

    fulfilled_reservation = (
        db.query(Reservation)
        .filter(Reservation.id == first_reservation_id)
        .first()
    )

    assert fulfilled_reservation.status == "FULFILLED"

    # The newly available physical copy should now be issued
    assert test_book_copies[0].status == "ISSUED"


def test_fulfillment_creates_issue_with_physical_copy(
    client,
    db,
    librarian_headers,
    test_book,
    test_book_copies,
):
    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    member = User(
        username="issue_link_member",
        email="issue_link_member@test.local",
        password=hash_password("Temp123!"),
        full_name="Issue Link Member",
        role_id=member_role.id,
    )

    db.add(member)
    db.flush()

    # Start with book unavailable
    test_book.available_copies = 0

    for copy in test_book_copies:
        copy.status = "ISSUED"

    db.flush()

    reservation = Reservation(
        user_id=member.id,
        book_id=test_book.id,
        status="ACTIVE",
    )

    db.add(reservation)
    db.flush()

    reservation_id = reservation.id
    member_id = member.id
    book_id = test_book.id

    # One physical copy becomes available
    available_copy = test_book_copies[0]
    available_copy.status = "AVAILABLE"
    test_book.available_copies = 1

    db.flush()

    response = client.put(
        f"/reservations/{reservation_id}/fulfill",
        headers=librarian_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "FULFILLED"

    db.expire_all()

    issue = (
        db.query(Issue)
        .filter(
            Issue.user_id == member_id,
            Issue.book_id == book_id,
            Issue.status == "ISSUED",
        )
        .first()
    )

    assert issue is not None
    assert issue.book_copy_id is not None

    linked_copy = (
        db.query(BookCopy)
        .filter(BookCopy.id == issue.book_copy_id)
        .first()
    )

    assert linked_copy is not None
    assert linked_copy.status == "ISSUED"

    updated_book = (
        db.query(Book)
        .filter(Book.id == book_id)
        .first()
    )

    assert updated_book.available_copies == 0


def test_member_can_view_own_reservation_history(
    client,
    db,
    member_headers,
    test_member,
    test_book,
):
    reservation = Reservation(
        user_id=test_member.id,
        book_id=test_book.id,
        status="FULFILLED",
    )

    db.add(reservation)
    db.flush()

    response = client.get(
        f"/reservations/user/{test_member.id}",
        headers=member_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == reservation.id
    assert data[0]["user_id"] == test_member.id
    assert data[0]["book_id"] == test_book.id
    assert data[0]["status"] == "FULFILLED"


def test_member_cannot_view_another_users_reservation_history(
    client,
    db,
    member_headers,
    test_member,
):
    other_member = User(
        username="history_member2",
        email="history_member2@example.com",
        password=hash_password("Password123"),
        full_name="History Member Two",
        role_id=test_member.role_id,
    )

    db.add(other_member)
    db.flush()

    response = client.get(
        f"/reservations/user/{other_member.id}",
        headers=member_headers,
    )

    assert response.status_code == 403

    assert (
        response.json()["detail"]
        == "You can view only your own reservation history"
    )



def test_admin_can_view_any_users_reservation_history(
    client,
    db,
    admin_headers,
    test_member,
    test_book,
):
    reservation = Reservation(
        user_id=test_member.id,
        book_id=test_book.id,
        status="CANCELLED",
    )

    db.add(reservation)
    db.flush()

    response = client.get(
        f"/reservations/user/{test_member.id}",
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["id"] == reservation.id
    assert data[0]["user_id"] == test_member.id
    assert data[0]["status"] == "CANCELLED"



def test_reservation_history_returns_404_for_unknown_user(
    client,
    admin_headers,
):
    response = client.get(
        "/reservations/user/99999",
        headers=admin_headers,
    )

    assert response.status_code == 404

    assert (
        response.json()["detail"]
        == "User not found"
    )
