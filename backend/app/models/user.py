from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    ForeignKey,
    DateTime
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String(50),
        unique=True,
        nullable=False
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False
    )

    password = Column(
        String(255),
        nullable=False
    )

    full_name = Column(
        String(100),
        nullable=False
    )

    role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False
    )

    # Allows Admin to disable an account
    # without deleting the user's history.
    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    # Stores the most recent successful login time.
    last_login = Column(
        DateTime,
        nullable=True
    )

    # Counts consecutive failed login attempts.
    # Reset to 0 after a successful login.
    failed_login_attempts = Column(
        Integer,
        nullable=False,
        default=0
    )

    # If not NULL and current time is earlier than this value,
    # the account is temporarily locked.
    locked_until = Column(
        DateTime,
        nullable=True
    )

    role = relationship("Role")