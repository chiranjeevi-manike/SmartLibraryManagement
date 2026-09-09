from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
)
from sqlalchemy.sql import func

from app.database import Base


class NotificationDeliveryHistory(Base):
    __tablename__ = "notification_delivery_history"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    channel = Column(
        String(20),
        nullable=False,
        default="EMAIL",
    )

    recipient = Column(
        String(255),
        nullable=False,
    )

    subject = Column(
        String(255),
        nullable=False,
    )

    reference_type = Column(
        String(30),
        nullable=False,
    )

    reference_id = Column(
        Integer,
        nullable=False,
        index=True,
    )

    delivery_status = Column(
        String(20),
        nullable=False,
    )

    error_message = Column(
        String(500),
        nullable=True,
    )

    attempted_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )