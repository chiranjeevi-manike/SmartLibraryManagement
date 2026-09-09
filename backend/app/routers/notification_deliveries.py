from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification_delivery_history import (
    NotificationDeliveryHistory,
)
from app.models.user import User
from app.utils.dependencies import require_roles


router = APIRouter(
    prefix="/notification-deliveries",
    tags=["Notification Deliveries"],
)


@router.get("/")
def get_notification_deliveries(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    delivery_status: str | None = None,
    channel: str | None = None,
    reference_type: str | None = None,
    user_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN")
    ),
):
    query = db.query(NotificationDeliveryHistory)

    if delivery_status:
        normalized_status = delivery_status.strip().upper()

        if normalized_status not in {"SENT", "FAILED"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "delivery_status must be SENT or FAILED"
                ),
            )

        query = query.filter(
            NotificationDeliveryHistory.delivery_status
            == normalized_status
        )

    if channel:
        normalized_channel = channel.strip().upper()

        query = query.filter(
            NotificationDeliveryHistory.channel
            == normalized_channel
        )

    if reference_type:
        normalized_reference_type = (
            reference_type.strip().upper()
        )

        query = query.filter(
            NotificationDeliveryHistory.reference_type
            == normalized_reference_type
        )

    if user_id is not None:
        query = query.filter(
            NotificationDeliveryHistory.user_id
            == user_id
        )

    total = query.count()

    deliveries = (
        query.order_by(
            NotificationDeliveryHistory.attempted_at.desc(),
            NotificationDeliveryHistory.id.desc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": [
            {
                "id": delivery.id,
                "user_id": delivery.user_id,
                "channel": delivery.channel,
                "recipient": delivery.recipient,
                "subject": delivery.subject,
                "reference_type":
                    delivery.reference_type,
                "reference_id":
                    delivery.reference_id,
                "delivery_status":
                    delivery.delivery_status,
                "error_message":
                    delivery.error_message,
                "attempted_at":
                    delivery.attempted_at,
            }
            for delivery in deliveries
        ],
    }