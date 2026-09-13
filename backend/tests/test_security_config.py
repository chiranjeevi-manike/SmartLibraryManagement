from app.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    CORS_ORIGINS,
    SECRET_KEY,
)


def test_security_configuration_is_safe():
    assert len(SECRET_KEY) >= 32
    assert ALGORITHM == "HS256"
    assert ACCESS_TOKEN_EXPIRE_MINUTES > 0
    assert CORS_ORIGINS
    assert "*" not in CORS_ORIGINS