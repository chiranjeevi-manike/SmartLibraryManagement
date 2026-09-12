from app.models.role import Role
from app.models.user import User

from app.models.audit_log import AuditLog

from datetime import datetime, timedelta

from app.utils.security import hash_password

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


def test_user_search_runs_before_pagination(
    client,
    db,
    admin_headers,
):
    member_role = get_role(
        db,
        "MEMBER",
    )

    users = []

    for number in range(12):
        users.append(
            User(
                username=(
                    f"pagination_user_{number}"
                ),
                email=(
                    f"pagination_user_{number}"
                    "@example.com"
                ),
                full_name=(
                    f"Pagination User {number}"
                ),
                password=hash_password(
                    "Pagination123!"
                ),
                role_id=member_role.id,
                is_active=True,
            )
        )

    db.add_all(users)
    db.flush()

    response = client.get(
        "/users/",
        params={
            "skip": 0,
            "limit": 5,
            "search": "pagination_user_11",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 1
    assert len(data["users"]) == 1
    assert (
        data["users"][0]["username"]
        == "pagination_user_11"
    )


def test_users_can_be_filtered_by_role_and_status(
    client,
    db,
    admin_headers,
):
    librarian_role = get_role(
        db,
        "LIBRARIAN",
    )

    inactive_librarian = User(
        username="inactive_librarian_test",
        email=(
            "inactive_librarian_test"
            "@example.com"
        ),
        full_name="Inactive Librarian Test",
        password=hash_password(
            "Inactive123!"
        ),
        role_id=librarian_role.id,
        is_active=False,
    )

    db.add(inactive_librarian)
    db.flush()

    response = client.get(
        "/users/",
        params={
            "role": "LIBRARIAN",
            "is_active": False,
            "limit": 100,
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    users = response.json()["users"]

    assert any(
        user["username"]
        == "inactive_librarian_test"
        for user in users
    )

    assert all(
        user["role"] == "LIBRARIAN"
        and user["is_active"] is False
        for user in users
    )


def test_users_can_be_filtered_by_lock_status(
    client,
    db,
    admin_headers,
):
    member_role = get_role(
        db,
        "MEMBER",
    )

    locked_user = User(
        username="locked_filter_test",
        email="locked_filter_test@example.com",
        full_name="Locked Filter Test",
        password=hash_password(
            "LockedUser123!"
        ),
        role_id=member_role.id,
        is_active=True,
        failed_login_attempts=5,
        locked_until=(
            datetime.utcnow()
            + timedelta(minutes=30)
        ),
    )

    db.add(locked_user)
    db.flush()

    response = client.get(
        "/users/",
        params={
            "security": "LOCKED",
            "limit": 100,
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    usernames = {
        user["username"]
        for user in response.json()["users"]
    }

    assert "locked_filter_test" in usernames



def test_updating_user_creates_audit_log(
    client,
    db,
    admin_headers,
    test_member,
):
    response = client.put(
        f"/users/{test_member.id}",
        json={
            "full_name": "Updated Member Name",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200
    assert (
        response.json()["user"]["full_name"]
        == "Updated Member Name"
    )

    audit_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.action == "USER_UPDATED",
            AuditLog.entity_type == "USER",
            AuditLog.entity_id == test_member.id,
        )
        .order_by(AuditLog.id.desc())
        .first()
    )

    assert audit_log is not None
    assert "full_name:" in audit_log.details
    assert "Updated Member Name" in audit_log.details


def test_changing_user_role_creates_audit_log(
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
    assert response.json()["role"] == "LIBRARIAN"

    db.refresh(test_member)

    assert test_member.role_id == librarian_role.id

    audit_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.action
            == "USER_ROLE_CHANGED",
            AuditLog.entity_type == "USER",
            AuditLog.entity_id == test_member.id,
        )
        .order_by(AuditLog.id.desc())
        .first()
    )

    assert audit_log is not None
    assert "MEMBER -> LIBRARIAN" in audit_log.details
