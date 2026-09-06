def test_member_can_view_books(client, member_headers):
    response = client.get(
        "/books/",
        headers=member_headers,
    )

    assert response.status_code == 200


def test_librarian_can_view_books(client, librarian_headers):
    response = client.get(
        "/books/",
        headers=librarian_headers,
    )

    assert response.status_code == 200


def test_admin_can_view_books(client, admin_headers):
    response = client.get(
        "/books/",
        headers=admin_headers,
    )

    assert response.status_code == 200


def test_books_without_login_returns_401(client):
    response = client.get("/books/")

    assert response.status_code == 401