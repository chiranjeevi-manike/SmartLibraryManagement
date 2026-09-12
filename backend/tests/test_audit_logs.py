import csv
import io

from app.models.audit_log import AuditLog


def create_test_audit_log(
    db,
    *,
    user_id,
    action,
    entity_type="USER",
    entity_id=None,
    details=None,
):
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
    )

    db.add(audit_log)
    db.flush()

    return audit_log


def read_csv_response(response):
    return list(
        csv.DictReader(
            io.StringIO(response.text)
        )
    )


def test_admin_can_export_audit_logs_csv(
    client,
    db,
    admin_headers,
    test_member,
):
    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_UPDATED",
        entity_id=test_member.id,
        details="Updated member information",
    )

    response = client.get(
        "/audit-logs/export/csv",
        headers=admin_headers,
    )

    assert response.status_code == 200

    assert response.headers[
        "content-type"
    ].startswith("text/csv")

    assert (
        "attachment"
        in response.headers[
            "content-disposition"
        ]
    )

    rows = read_csv_response(response)

    assert any(
        row["action"] == "USER_UPDATED"
        for row in rows
    )


def test_audit_csv_export_applies_filters(
    client,
    db,
    admin_headers,
    test_member,
):
    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_UPDATED",
        entity_id=test_member.id,
        details="Updated user",
    )

    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_ROLE_CHANGED",
        entity_id=test_member.id,
        details="MEMBER -> LIBRARIAN",
    )

    response = client.get(
        "/audit-logs/export/csv",
        params={
            "action": "USER_ROLE_CHANGED",
            "entity_type": "USER",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    rows = read_csv_response(response)

    assert len(rows) >= 1

    assert all(
        row["action"]
        == "USER_ROLE_CHANGED"
        for row in rows
    )

    assert all(
        row["entity_type"] == "USER"
        for row in rows
    )


def test_member_cannot_export_audit_logs_csv(
    client,
    member_headers,
):
    response = client.get(
        "/audit-logs/export/csv",
        headers=member_headers,
    )

    assert response.status_code == 403


def test_audit_csv_protects_against_formulas(
    client,
    db,
    admin_headers,
    test_member,
):
    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="FORMULA_TEST",
        entity_id=test_member.id,
        details=(
            '=HYPERLINK("https://example.com")'
        ),
    )

    response = client.get(
        "/audit-logs/export/csv",
        params={
            "action": "FORMULA_TEST",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    rows = read_csv_response(response)

    assert len(rows) == 1

    assert rows[0]["details"].startswith(
        "'="
    )


def test_audit_log_global_search(
    client,
    db,
    admin_headers,
    test_member,
):
    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_UPDATED",
        entity_id=test_member.id,
        details=(
            "Unique audit search phrase "
            "ALPHA-7391"
        ),
    )

    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_ROLE_CHANGED",
        entity_id=test_member.id,
        details="Unrelated audit record",
    )

    response = client.get(
        "/audit-logs/",
        params={
            "search": "ALPHA-7391",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 1
    assert len(data["audit_logs"]) == 1
    assert (
        "ALPHA-7391"
        in data["audit_logs"][0]["details"]
    )


def test_audit_csv_export_applies_global_search(
    client,
    db,
    admin_headers,
    test_member,
):
    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_UPDATED",
        entity_id=test_member.id,
        details="CSV-SEARCH-9284",
    )

    create_test_audit_log(
        db,
        user_id=test_member.id,
        action="USER_UPDATED",
        entity_id=test_member.id,
        details="Different CSV audit record",
    )

    response = client.get(
        "/audit-logs/export/csv",
        params={
            "search": "CSV-SEARCH-9284",
        },
        headers=admin_headers,
    )

    assert response.status_code == 200

    rows = read_csv_response(response)

    assert len(rows) == 1
    assert (
        rows[0]["details"]
        == "CSV-SEARCH-9284"
    )