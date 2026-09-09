from app.models.user import User
from app.utils.security import verify_password


def test_admin_can_import_members_from_csv(
    client,
    db,
    admin_headers,
):
    csv_content = (
        "username,email,full_name,password,role_name\n"
        "csvmember1,csvmember1@example.com,"
        "CSV Member One,Member@123,MEMBER\n"
        "csvmember2,csvmember2@example.com,"
        "CSV Member Two,Member@456,MEMBER\n"
    )

    response = client.post(
        "/users/import/csv",
        headers=admin_headers,
        files={
            "file": (
                "members.csv",
                csv_content,
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["imported_count"] == 2
    assert data["failed_count"] == 0
    assert len(data["imported_users"]) == 2
    assert data["errors"] == []

    imported_user = (
        db.query(User)
        .filter(User.username == "csvmember1")
        .first()
    )

    assert imported_user is not None
    assert imported_user.email == "csvmember1@example.com"
    assert imported_user.full_name == "CSV Member One"
    assert imported_user.is_active is True
    assert verify_password(
        "Member@123",
        imported_user.password,
    )


def test_csv_import_reports_invalid_and_duplicate_rows(
    client,
    admin_headers,
):
    csv_content = (
        "username,email,full_name,password,role_name\n"
        "validmember,validmember@example.com,"
        "Valid Member,Member@123,MEMBER\n"
        "validmember,second@example.com,"
        "Duplicate Username,Member@456,MEMBER\n"
        "bademail,not-an-email,"
        "Bad Email,Member@789,MEMBER\n"
    )

    response = client.post(
        "/users/import/csv",
        headers=admin_headers,
        files={
            "file": (
                "members.csv",
                csv_content,
                "text/csv",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["imported_count"] == 1
    assert data["failed_count"] == 2
    assert len(data["errors"]) == 2

    all_errors = " ".join(
        error_message
        for row in data["errors"]
        for error_message in row["errors"]
    )

    assert "Duplicate username in CSV" in all_errors
    assert "Invalid email address" in all_errors


def test_non_admin_cannot_import_users(
    client,
    librarian_headers,
):
    csv_content = (
        "username,email,full_name,password,role_name\n"
        "blockedmember,blocked@example.com,"
        "Blocked Member,Member@123,MEMBER\n"
    )

    response = client.post(
        "/users/import/csv",
        headers=librarian_headers,
        files={
            "file": (
                "members.csv",
                csv_content,
                "text/csv",
            )
        },
    )

    assert response.status_code == 403


def test_user_import_rejects_non_csv_file(
    client,
    admin_headers,
):
    response = client.post(
        "/users/import/csv",
        headers=admin_headers,
        files={
            "file": (
                "members.txt",
                "not a csv file",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Only CSV files are allowed"
    )


def test_user_import_requires_expected_columns(
    client,
    admin_headers,
):
    csv_content = (
        "username,email\n"
        "incomplete,incomplete@example.com\n"
    )

    response = client.post(
        "/users/import/csv",
        headers=admin_headers,
        files={
            "file": (
                "members.csv",
                csv_content,
                "text/csv",
            )
        },
    )

    assert response.status_code == 400
    assert "Missing required columns" in (
        response.json()["detail"]
    )
