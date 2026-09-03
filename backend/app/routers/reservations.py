from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.reservation import Reservation
from app.models.book import Book
from app.models.user import User
from app.schemas.reservation import ReservationCreate, ReservationResponse
from app.repositories import issue as issue_repository
#from app.utils.dependencies import get_current_user

# from datetime import datetime, timedelta
# from app.models.notification import Notification
from app.services.audit_service import create_audit_log

from app.services.reservation_service import (
    process_expired_ready_reservations
)

from app.utils.dependencies import (
    get_current_user,
    require_roles
)

router = APIRouter(
    prefix="/reservations",
    tags=["Reservations"]
)


# --------------------------------------------------
# CREATE RESERVATION
# --------------------------------------------------

@router.post(
    "/",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_reservation(
    reservation_data: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # --------------------------------------------------
    # 1. Check whether book exists
    # --------------------------------------------------

    book = (
        db.query(Book)
        .filter(
            Book.id == reservation_data.book_id
        )
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # --------------------------------------------------
    # 2. If book is available, reservation unnecessary
    # --------------------------------------------------

    if book.available_copies > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Book is currently available. "
                "Please borrow it instead of reserving it."
            )
        )

    # --------------------------------------------------
    # 3. Check existing ACTIVE reservation
    # --------------------------------------------------

    existing_reservation = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == current_user.id,
            Reservation.book_id == reservation_data.book_id,
            Reservation.status == "ACTIVE"
        )
        .first()
    )

    if existing_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You already have an active "
                "reservation for this book"
            )
        )

    try:

        # --------------------------------------------------
        # 4. Create reservation
        # --------------------------------------------------

        new_reservation = Reservation(
            user_id=current_user.id,
            book_id=reservation_data.book_id,
            status="ACTIVE"
        )

        db.add(new_reservation)

        # Generate reservation ID without committing
        db.flush()

        # --------------------------------------------------
        # 5. Audit log
        # --------------------------------------------------

        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="RESERVATION_CREATED",
            entity_type="RESERVATION",
            entity_id=new_reservation.id,
            details=(
                f"Reservation created for "
                f"Book ID {new_reservation.book_id} "
                f"by User ID {new_reservation.user_id}"
            )
        )

        # --------------------------------------------------
        # 6. Commit reservation + audit together
        # --------------------------------------------------

        db.commit()

        db.refresh(new_reservation)

        return new_reservation

    except Exception:

        db.rollback()
        raise


@router.get("/", response_model=list[ReservationResponse])
def get_all_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name.upper()

    if role_name not in ["ADMIN", "LIBRARIAN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Librarian can view all reservations"
        )

    return db.query(Reservation).all()


@router.get("/my", response_model=list[ReservationResponse])
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservations = (
        db.query(Reservation)
        .filter(Reservation.user_id == current_user.id)
        .all()
    )

    return reservations


@router.put("/expire-ready")
def expire_ready_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    result = process_expired_ready_reservations(db)

    return {
        "message": "Expired reservations processed",
        "expired_count": result["expired_count"],
        "promoted_count": result["promoted_count"]
    }


@router.get("/my/queue")
def get_my_reservation_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # Get current member's ACTIVE and READY reservations
    my_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == current_user.id,
            Reservation.status.in_(["ACTIVE", "READY"])
        )
        .order_by(Reservation.reserved_at.asc())
        .all()
    )

    result = []

    for reservation in my_reservations:

        # READY means the member's turn has already arrived
        if reservation.status == "READY":
            queue_position = 1
            people_ahead = 0

        else:
            # Count ACTIVE/READY reservations for the same book
            # that were created before this reservation.
            people_ahead = (
                db.query(Reservation)
                .filter(
                    Reservation.book_id == reservation.book_id,
                    Reservation.status.in_(["ACTIVE", "READY"]),
                    Reservation.reserved_at < reservation.reserved_at
                )
                .count()
            )

            queue_position = people_ahead + 1

        result.append(
            {
                "reservation_id": reservation.id,
                "book_id": reservation.book_id,
                "status": reservation.status,
                "reserved_at": reservation.reserved_at,
                "ready_until": reservation.ready_until,
                "queue_position": queue_position,
                "people_ahead": people_ahead
            }
        )

    return {
        "user_id": current_user.id,
        "total_active_reservations": len(result),
        "reservations": result
    }

@router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id)
        .first()
    )

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )

    role_name = current_user.role.name.upper()

    # Member can cancel only their own reservation.
    # Admin/Librarian can cancel any reservation.
    if (
        reservation.user_id != current_user.id
        and role_name not in ["ADMIN", "LIBRARIAN"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to cancel this reservation"
        )

    if reservation.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation is not active"
        )

    try:

        reservation.status = "CANCELLED"

        # Create audit log
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="RESERVATION_CANCELLED",
            entity_type="RESERVATION",
            entity_id=reservation.id,
            details=(
                f"Reservation ID {reservation.id} cancelled "
                f"for Book ID {reservation.book_id}, "
                f"User ID {reservation.user_id}"
            )
        )

        # Commit cancellation + audit log together
        db.commit()

        db.refresh(reservation)

        return reservation

    except Exception:

        db.rollback()
        raise



@router.get("/book/{book_id}/queue")
def get_reservation_queue(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    book = (
        db.query(Book)
        .filter(Book.id == book_id)
        .first()
    )

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    reservations = (
        db.query(Reservation)
        .filter(
            Reservation.book_id == book_id,
            Reservation.status.in_(["ACTIVE", "READY"])
        )
        .order_by(
            Reservation.reserved_at.asc(),
            Reservation.id.asc()
        )
        .all()
    )

    queue = []

    for position, reservation in enumerate(
        reservations,
        start=1
    ):
        queue.append({
            "position": position,
            "reservation_id": reservation.id,
            "user_id": reservation.user_id,
            "book_id": reservation.book_id,
            "reserved_at": reservation.reserved_at,
            "status": reservation.status
        })

    return queue




@router.put(
    "/{reservation_id}/fulfill",
    response_model=ReservationResponse
)
def fulfill_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    # Find reservation
    reservation = (
        db.query(Reservation)
        .filter(Reservation.id == reservation_id)
        .first()
    )

    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )

    # Reservation must be ACTIVE
    if reservation.status not in ("ACTIVE", "READY"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation cannot be fulfilled"
        )

    try:
        # ------------------------------------------
        # Check reservation queue
        # ------------------------------------------

        first_in_queue = (
            db.query(Reservation)
            .filter(
                Reservation.book_id == reservation.book_id,
                Reservation.status.in_(["ACTIVE", "READY"])
            )
            .order_by(
                Reservation.reserved_at.asc(),
                Reservation.id.asc()
            )
            .first()
        )

        # Only first person in queue can get the book
        if (
            first_in_queue
            and first_in_queue.id != reservation.id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Reservation cannot be fulfilled yet. "
                    f"Reservation {first_in_queue.id} "
                    "is first in the queue."
                )
            )

        # ------------------------------------------
        # Actually issue the book
        # ------------------------------------------

        # ------------------------------------------
        # Actually issue the book
        # ------------------------------------------

        issue = issue_repository.create_issue(
        db,
        reservation.user_id,
        reservation.book_id
        )

        # Mark reservation completed
        reservation.status = "FULFILLED"
        reservation.ready_until = None

        # ------------------------------------------
        # AUDIT LOG
        # ------------------------------------------

        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="RESERVATION_FULFILLED",
            entity_type="RESERVATION",
            entity_id=reservation.id,
            details=(
                f"Reservation ID {reservation.id} fulfilled "
                f"for Book ID {reservation.book_id}, "
                f"User ID {reservation.user_id}, "
                f"Issue ID {issue.id}"
            )
        )

        # Commit issue + reservation + audit together
        db.commit()

        db.refresh(reservation)
        db.refresh(issue)

        return reservation

    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )


@router.get("/status/{status_name}", response_model=list[ReservationResponse])
def get_reservations_by_status(
    status_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    status_name = status_name.upper()

    valid_statuses = [
        "ACTIVE",
        "READY",
        "CANCELLED",
        "FULFILLED",
        "EXPIRED"
    ]

    if status_name not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reservation status"
        )

    return (
        db.query(Reservation)
        .filter(Reservation.status == status_name)
        .all()
    )


@router.get("/book/{book_id}/next")
def get_next_reservation(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    next_reservation = (
        db.query(Reservation)
        .filter(
            Reservation.book_id == book_id,
            Reservation.status.in_(["ACTIVE", "READY"])
        )
        .order_by(
            Reservation.reserved_at.asc(),
            Reservation.id.asc()
        )
        .first()
    )

    if not next_reservation:
        return {
            "message": "No active reservations for this book"
        }

    return {
        "reservation_id": next_reservation.id,
        "user_id": next_reservation.user_id,
        "book_id": next_reservation.book_id,
        "reserved_at": next_reservation.reserved_at,
        "status": next_reservation.status
    }

