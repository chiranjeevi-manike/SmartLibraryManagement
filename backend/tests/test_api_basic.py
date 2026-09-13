from unittest.mock import MagicMock

from app import main


def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_readiness_endpoint(client):
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_readiness_returns_503_when_database_fails(
    client,
    monkeypatch,
):
    db = MagicMock()

    db.execute.side_effect = RuntimeError(
        "Database connection failed"
    )

    monkeypatch.setattr(
        main,
        "SessionLocal",
        lambda: db,
    )

    response = client.get("/ready")

    assert response.status_code == 503
    assert (
        response.json()["detail"]
        == "Database is unavailable"
    )

    db.close.assert_called_once()


def test_security_headers(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert (
        response.headers["referrer-policy"]
        == "strict-origin-when-cross-origin"
    )
    assert response.headers["permissions-policy"] == (
        "camera=(), microphone=(), geolocation=()"
    )


def test_untrusted_host_is_rejected(client):
    response = client.get(
        "/health",
        headers={"Host": "malicious.example"},
    )

    assert response.status_code == 400