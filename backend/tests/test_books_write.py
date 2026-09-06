def test_test_book_fixture_is_created(test_book):
    assert test_book.id is not None
    assert test_book.title == "Pytest Test Book"
    assert test_book.total_copies == 3
    assert test_book.available_copies == 3


def test_member_cannot_update_book(
    client,
    member_headers,
    test_book,
):
    response = client.put(
        f"/books/{test_book.id}",
        headers=member_headers,
        json={
            "title": "Member Modified Book"
        },
    )

    assert response.status_code == 403

def test_librarian_can_update_book(
    client,
    librarian_headers,
    test_book,
):
    response = client.put(
        f"/books/{test_book.id}",
        headers=librarian_headers,
        json={
            "title": "Librarian Updated Book"
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Librarian Updated Book"


def test_admin_can_update_book(
    client,
    admin_headers,
    test_book,
):
    response = client.put(
        f"/books/{test_book.id}",
        headers=admin_headers,
        json={
            "title": "Admin Updated Book"
        },
    )

    assert response.status_code == 200
    assert response.json()["title"] == "Admin Updated Book"



def test_member_cannot_delete_book(
    client,
    member_headers,
    test_book,
):
    response = client.delete(
        f"/books/{test_book.id}",
        headers=member_headers,
    )

    assert response.status_code == 403


def test_librarian_cannot_delete_book(
    client,
    librarian_headers,
    test_book,
):
    response = client.delete(
        f"/books/{test_book.id}",
        headers=librarian_headers,
    )

    assert response.status_code == 403


def test_admin_can_delete_book(
    client,
    admin_headers,
    test_book,
):
    response = client.delete(
        f"/books/{test_book.id}",
        headers=admin_headers,
    )

    assert response.status_code == 200