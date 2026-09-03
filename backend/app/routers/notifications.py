from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from datetime import datetime, timedelta
from app.models.book import Book
from app.models.issue import Issue
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.utils.dependencies import get_current_user, require_roles

from app.services.notification_service import (
    generate_due_reminders,
    generate_overdue_notifications
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get(
    "/me",
    response_model=list[NotificationResponse]
)
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.get("/me/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .count()
    )

    return {
        "user_id": current_user.id,
        "unread_count": unread_count
    }

@router.post("/generate/due-reminders")
def generate_due_reminder_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    result = generate_due_reminders(db)

    return {
        "message": "Due-date reminders generated",
        "created_count": result["created_count"]
    }



@router.post("/generate/overdue")
def generate_overdue_notification_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    result = generate_overdue_notifications(db)

    return {
        "message": "Overdue notifications generated",
        "created_count": result["created_count"]
    }


# --------------------------------------------------
# MEMBER - MARK ALL NOTIFICATIONS AS READ
# --------------------------------------------------

@router.put("/me/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unread_notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .all()
    )

    updated_count = len(unread_notifications)

    for notification in unread_notifications:
        notification.is_read = True

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "message": "All notifications marked as read",
        "updated_count": updated_count
    }


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "message": "Notification marked as read",
        "notification_id": notification.id,
        "is_read": notification.is_read
    }