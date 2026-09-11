from app.models.role import Role
from app.models.user import User


def get_role(db, role_name: str):
    role = (
        db.query(Role)
        .filter(Role.name == role_name)
        .first()
    )

    assert role is not None
    return role


def test_admin_can_change_member_to_librarian(
    client,
    db,
    admin_headers,
    test_member,
):
    librarian_role = get_role(
        db,
        "LIBRARIAN",
    )

    response = client.put(
        f"/users/{test_member.id}/role",
        json={
            "role_id": librarian_role.id,
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["user_id"] == test_member.id
    assert data["role_id"] == librarian_role.id
    assert data["role"] == "LIBRARIAN"

    db.refresh(test_member)

    assert (
        test_member.role_id
        == librarian_role.id
    )


def test_member_cannot_change_user_role(
    client,
    db,
    member_headers,
    test_member,
):
    librarian_role = get_role(
        db,
        "LIBRARIAN",
    )

    response = client.put(
        f"/users/{test_member.id}/role",
        json={
            "role_id": librarian_role.id,
        },
        headers=member_headers,
    )

    assert response.status_code == 403


def test_admin_can_deactivate_and_activate_member(
    client,
    db,
    admin_headers,
    test_member,
):
    deactivate_response = client.put(
        f"/users/{test_member.id}/status",
        json={
            "is_active": False,
        },
        headers=admin_headers,
    )

    assert deactivate_response.status_code == 200
    assert (
        deactivate_response.json()["is_active"]
        is False
    )

    db.refresh(test_member)
    assert test_member.is_active is False

    activate_response = client.put(
        f"/users/{test_member.id}/status",
        json={
            "is_active": True,
        },
        headers=admin_headers,
    )

    assert activate_response.status_code == 200
    assert (
        activate_response.json()["is_active"]
        is True
    )

    db.refresh(test_member)
    assert test_member.is_active is True


def test_admin_cannot_deactivate_own_account(
    client,
    db,
    admin_headers,
):
    admin = (
        db.query(User)
        .filter(User.username == "admin")
        .first()
    )

    assert admin is not None

    response = client.put(
        f"/users/{admin.id}/status",
        json={
            "is_active": False,
        },
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "You cannot deactivate your own account"
    )

    db.refresh(admin)
    assert admin.is_active is True


def test_admin_cannot_remove_own_admin_role(
    client,
    db,
    admin_headers,
):
    admin = (
        db.query(User)
        .filter(User.username == "admin")
        .first()
    )

    assert admin is not None

    member_role = get_role(
        db,
        "MEMBER",
    )

    response = client.put(
        f"/users/{admin.id}/role",
        json={
            "role_id": member_role.id,
        },
        headers=admin_headers,
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "You cannot remove your own ADMIN role"
    )

    db.refresh(admin)

    admin_role = get_role(
        db,
        "ADMIN",
    )

    assert admin.role_id == admin_role.id


def test_admin_can_create_user_with_json_body(
    client,
    db,
    admin_headers,
):
    response = client.post(
        "/users/",
        json={
            "username": "jsonmember",
            "email": "jsonmember@example.com",
            "full_name": "JSON Member",
            "password": "JsonMember123!",
            "role_name": "MEMBER",
        },
        headers=admin_headers,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["username"] == "jsonmember"
    assert data["email"] == "jsonmember@example.com"
    assert data["role"] == "MEMBER"
    assert data["is_active"] is True

    created_user = (
        db.query(User)
        .filter(
            User.username == "jsonmember"
        )
        .first()
    )

    assert created_user is not None
    assert (
        created_user.password
        != "JsonMember123!"
    )