def test_users_me_without_token_returns_401(client):
    response = client.get("/users/me")

    assert response.status_code == 401


def test_admin_login_and_users_me(client, admin_headers):
    response = client.get(
        "/users/me",
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert response.json()["username"] == "admin"


def test_admin_can_access_admin_only(client, admin_headers):
    response = client.get(
        "/users/admin-only",
        headers=admin_headers,
    )

    assert response.status_code == 200


    def test_librarian_cannot_access_admin_only(
        client,
        librarian_headers,
    ):
        response = client.get(
            "/users/admin-only",
            headers=librarian_headers,
        )

        assert response.status_code == 403  

def test_librarian_cannot_access_admin_only(
    client,
    librarian_headers,
):
    response = client.get(
        "/users/admin-only",
        headers=librarian_headers,
    )

    assert response.status_code == 403


def test_member_cannot_access_admin_only(
    client,
    member_headers,
):
    response = client.get(
        "/users/admin-only",
        headers=member_headers,
    )

    assert response.status_code == 403