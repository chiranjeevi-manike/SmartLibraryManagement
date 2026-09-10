import csv
import io


def parse_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def test_admin_can_export_users_csv(
    client,
    admin_headers,
):
    response = client.get(
        "/users/export/csv",
        headers=admin_headers,
    )

    assert response.status_code == 200

    assert response.headers[
        "content-type"
    ].startswith("text/csv")

    assert "attachment" in response.headers[
        "content-disposition"
    ]

    assert "library_users_" in response.headers[
        "content-disposition"
    ]

    rows = parse_csv_response(response)

    assert len(rows) > 0

    expected_columns = {
        "id",
        "username",
        "email",
        "full_name",
        "role",
        "is_active",
        "last_login",
        "failed_login_attempts",
        "locked_until",
    }

    assert set(rows[0].keys()) == expected_columns


def test_user_export_does_not_include_password(
    client,
    admin_headers,
):
    response = client.get(
        "/users/export/csv",
        headers=admin_headers,
    )

    assert response.status_code == 200

    header = response.text.splitlines()[0]

    assert "password" not in header.lower()


def test_member_cannot_export_users_csv(
    client,
    member_headers,
):
    response = client.get(
        "/users/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403