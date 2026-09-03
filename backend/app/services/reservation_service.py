from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.reservation import Reservation
from app.models.notification import Notification


def process_expired_ready_reservations(db: Session):

    now = datetime.utcnow()

    expired_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY",
            Reservation.ready_until < now
        )
        .order_by(Reservation.ready_until.asc())
        .all()
    )

    expired_count = 0
    promoted_count = 0
    processed_books = set()

    for reservation in expired_reservations:

        # ------------------------------------------
        # 1. Expire current READY reservation
        # ------------------------------------------

        reservation.status = "EXPIRED"
        expired_count += 1

        expired_notification = Notification(
            user_id=reservation.user_id,
            message=(
                f"Your reservation for Book ID "
                f"{reservation.book_id} has expired "
                f"because the pickup period ended. "
                f"Reservation ID {reservation.id}"
            ),
            notification_type="RESERVATION_EXPIRED",
            is_read=False
        )

        db.add(expired_notification)

        book_id = reservation.book_id

        # Process each book only once
        if book_id in processed_books:
            continue

        processed_books.add(book_id)

        # ------------------------------------------
        # 2. Find next ACTIVE reservation
        # ------------------------------------------

        next_reservation = (
            db.query(Reservation)
            .filter(
                Reservation.book_id == book_id,
                Reservation.status == "ACTIVE"
            )
            .order_by(
                Reservation.reserved_at.asc(),
                Reservation.id.asc()
            )
            .first()
        )

        # ------------------------------------------
        # 3. Promote next reservation to READY
        # ------------------------------------------

        if next_reservation:

            next_reservation.status = "READY"
            next_reservation.ready_until = (
                now + timedelta(days=2)
            )

            promoted_count += 1

            ready_notification = Notification(
                user_id=next_reservation.user_id,
                message=(
                    f"Your reserved book "
                    f"(Book ID {next_reservation.book_id}) "
                    f"is now ready for pickup. "
                    f"Please collect it within 2 days. "
                    f"Reservation ID {next_reservation.id}"
                ),
                notification_type="RESERVATION_READY",
                is_read=False
            )

            db.add(ready_notification)

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "expired_count": expired_count,
        "promoted_count": promoted_count
    }