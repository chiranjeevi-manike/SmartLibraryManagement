from app.models.notification_delivery_history import (
    NotificationDeliveryHistory,
)


def create_delivery(db, **overrides):
    data = {
        "user_id": 1,
        "channel": "EMAIL",
        "recipient": "member@example.com",
        "subject": "Test notification",
        "reference_type": "ISSUE_DUE",
        "reference_id": 10,
        "delivery_status": "SENT",
        "error_message": None,
    }

    data.update(overrides)

    delivery = NotificationDeliveryHistory(**data)
    db.add(delivery)
    db.flush()

    return delivery


def test_admin_can_list_notification_deliveries(
    client,
    db,
    admin_headers,
):
    delivery = create_delivery(db)

    response = client.get(
        "/notification-deliveries/",
        headers=admin_headers,
    )

    assert response.status_code == 200

    result = response.json()

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["id"] == delivery.id
    assert result["items"][0]["delivery_status"] == "SENT"


def test_admin_can_filter_failed_deliveries(
    client,
    db,
    admin_headers,
):
    create_delivery(db)

    create_delivery(
        db,
        recipient="failed@example.com",
        reference_type="ISSUE_OVERDUE",
        reference_id=20,
        delivery_status="FAILED",
        error_message="SMTP configuration is incomplete",
    )

    response = client.get(
        "/notification-deliveries/"
        "?delivery_status=FAILED",
        headers=admin_headers,
    )

    assert response.status_code == 200

    result = response.json()

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert (
        result["items"][0]["delivery_status"]
        == "FAILED"
    )
    assert (
        result["items"][0]["error_message"]
        == "SMTP configuration is incomplete"
    )


def test_member_cannot_view_notification_deliveries(
    client,
    member_headers,
):
    response = client.get(
        "/notification-deliveries/",
        headers=member_headers,
    )

    assert response.status_code == 403


def test_invalid_delivery_status_is_rejected(
    client,
    admin_headers,
):
    response = client.get(
        "/notification-deliveries/"
        "?delivery_status=UNKNOWN",
        headers=admin_headers,
    )

    assert response.status_code == 400