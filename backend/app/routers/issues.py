from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status
)

from sqlalchemy.orm import Session

from datetime import datetime, timedelta

from app.database import get_db

from app.models.issue import Issue
from app.models.user import User
from app.models.role import Role
from app.models.reservation import Reservation
from app.models.notification import Notification

from app.schemas.issue import (
    IssueCreate,
    IssueResponse,
    ReturnResponse
)

from app.repositories import issue as issue_repository

from app.services.audit_service import create_audit_log

from app.utils.dependencies import (
    get_current_user,
    require_roles
)


router = APIRouter(
    prefix="/issues",
    tags=["Book Issues"]
)


# --------------------------------------------------
# ISSUE A BOOK
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.post(
    "/",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED
)
def issue_book(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    try:

        issue = issue_repository.create_issue(
            db,
            issue_data.user_id,
            issue_data.book_id
        )

        # ---------------------------------------------
        # AUDIT LOG
        # ---------------------------------------------
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_ISSUED",
            entity_type="ISSUE",
            entity_id=issue.id,
            details=(
                f"Issued Book ID {issue.book_id} "
                f"to User ID {issue.user_id}"
            )
        )

        # Commit issue + inventory changes +
        # reservation changes + audit log together
        db.commit()

        db.refresh(issue)

        return issue

    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception:

        db.rollback()
        raise


# --------------------------------------------------
# GET ALL ISSUE RECORDS
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.get(
    "/",
    response_model=list[IssueResponse]
)
def get_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    return issue_repository.get_all_issues(db)


# --------------------------------------------------
# GET ACTIVE ISSUES
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.get(
    "/active",
    response_model=list[IssueResponse]
)
def get_active_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    return issue_repository.get_active_issues(db)


# --------------------------------------------------
# GET OVERDUE ISSUES
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.get(
    "/overdue",
    response_model=list[IssueResponse]
)
def get_overdue_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    return issue_repository.get_overdue_issues(db)


# --------------------------------------------------
# GET USER ISSUE HISTORY
#
# MEMBER:
#   can see only own history
#
# ADMIN/LIBRARIAN:
#   can see any user's history
# --------------------------------------------------

@router.get(
    "/user/{user_id}",
    response_model=list[IssueResponse]
)
def get_user_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role = (
        db.query(Role)
        .filter(Role.id == current_user.role_id)
        .first()
    )

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role not found"
        )

    # MEMBER can see only own history
    if role.name == "MEMBER":

        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can view only your own issue history"
            )

    # ADMIN and LIBRARIAN can see anyone's history
    elif role.name not in ("ADMIN", "LIBRARIAN"):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource"
        )

    return issue_repository.get_user_issue_history(
        db,
        user_id
    )


# --------------------------------------------------
# RETURN A BOOK
# ADMIN and LIBRARIAN only
#
# On return:
# 1. Return book
# 2. Check reservation queue
# 3. First ACTIVE reservation becomes READY
# 4. Set 2-day pickup deadline
# 5. Create READY notification
# --------------------------------------------------

# --------------------------------------------------
# RETURN A BOOK
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.post(
    "/{issue_id}/return",
    response_model=ReturnResponse
)
def return_book(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    try:

        # ---------------------------------------------
        # 1. Return book
        # ---------------------------------------------
        issue = issue_repository.return_book(
            db,
            issue_id
        )

        # ---------------------------------------------
        # 2. Fine notification
        # ---------------------------------------------
        if (
            issue.fine_amount
            and float(issue.fine_amount) > 0
        ):

            fine_notification = Notification(
                user_id=issue.user_id,
                message=(
                    f"A fine of ₹{float(issue.fine_amount):.2f} "
                    f"has been generated for Book ID {issue.book_id}. "
                    f"Overdue days: {issue.overdue_days}. "
                    f"Issue ID {issue.id}"
                ),
                notification_type="FINE_GENERATED",
                is_read=False
            )

            db.add(fine_notification)

        # ---------------------------------------------
        # 3. Find first waiting reservation
        # ---------------------------------------------
        next_reservation = (
            db.query(Reservation)
            .filter(
                Reservation.book_id == issue.book_id,
                Reservation.status == "ACTIVE"
            )
            .order_by(
                Reservation.reserved_at.asc(),
                Reservation.id.asc()
            )
            .first()
        )

        # ---------------------------------------------
        # 4. Promote reservation to READY
        # ---------------------------------------------
        if next_reservation:

            next_reservation.status = "READY"

            next_reservation.ready_until = (
                datetime.utcnow()
                + timedelta(days=2)
            )

            ready_notification = Notification(
                user_id=next_reservation.user_id,
                message=(
                    f"Your reserved book "
                    f"(Book ID {next_reservation.book_id}) "
                    f"is ready for pickup. "
                    f"Please collect it within 2 days."
                ),
                notification_type="RESERVATION_READY",
                is_read=False
            )

            db.add(ready_notification)

        # ---------------------------------------------
        # 5. Audit log
        # ---------------------------------------------
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_RETURNED",
            entity_type="ISSUE",
            entity_id=issue.id,
            details=(
                f"Returned Book ID {issue.book_id} "
                f"from User ID {issue.user_id}"
            )
        )

        # ---------------------------------------------
        # 6. Commit everything together
        # ---------------------------------------------
        db.commit()

        db.refresh(issue)

        if next_reservation:
            db.refresh(next_reservation)

        # ---------------------------------------------
        # 7. Response
        # ---------------------------------------------
        return {
            "message": "Book returned successfully",
            "issue_id": issue.id,
            "book_id": issue.book_id,
            "return_date": issue.return_date,
            "overdue_days": issue.overdue_days,
            "fine_amount": float(
                issue.fine_amount or 0
            ),
            "status": issue.status,

            "waiting_reservation": (
                {
                    "reservation_id":
                        next_reservation.id,

                    "user_id":
                        next_reservation.user_id,

                    "message":
                        "Book is ready and held for this member"
                }
                if next_reservation
                else None
            )
        }

    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception:

        db.rollback()
        raise

# --------------------------------------------------
# MEMBER - MY ISSUE HISTORY
# --------------------------------------------------

@router.get(
    "/me/issues",
    response_model=list[IssueResponse]
)
def get_my_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return issue_repository.get_user_issue_history(
        db,
        current_user.id
    )


# --------------------------------------------------
# MEMBER - MY ACTIVE ISSUES
# --------------------------------------------------

@router.get(
    "/me/active",
    response_model=list[IssueResponse]
)
def get_my_active_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.status == "ISSUED"
        )
        .all()
    )


# --------------------------------------------------
# MEMBER - MY FINE HISTORY
# --------------------------------------------------

@router.get(
    "/me/fines",
    response_model=list[IssueResponse]
)
def get_my_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.fine_amount > 0
        )
        .order_by(Issue.issue_date.desc())
        .all()
    )


# --------------------------------------------------
# MEMBER - CURRENT POSSIBLE FINES
# Calculates fine without returning the book
# --------------------------------------------------

@router.get("/me/current-fines")
def get_my_current_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_issues = (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.status == "ISSUED"
        )
        .all()
    )

    results = []

    for issue in active_issues:

        overdue_days, fine_amount = (
            issue_repository.calculate_current_fine(issue)
        )

        results.append({
            "issue_id": issue.id,
            "book_id": issue.book_id,
            "due_date": issue.due_date,
            "overdue_days": overdue_days,
            "fine_amount": float(fine_amount)
        })

    return results


# --------------------------------------------------
# RENEW A BOOK
# ADMIN and LIBRARIAN only
# --------------------------------------------------

# --------------------------------------------------
# RENEW A BOOK
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.put(
    "/{issue_id}/renew",
    response_model=IssueResponse
)
def renew_book(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    try:

        # ---------------------------------------------
        # 1. Renew issue
        # ---------------------------------------------
        issue = issue_repository.renew_issue(
            db,
            issue_id
        )

        # ---------------------------------------------
        # 2. Create renewal notification
        # ---------------------------------------------
        renewal_notification = Notification(
            user_id=issue.user_id,
            message=(
                f"Your book (Book ID {issue.book_id}) "
                f"has been renewed successfully. "
                f"Your new due date is "
                f"{issue.due_date.strftime('%d-%m-%Y')}. "
                f"Issue ID {issue.id}"
            ),
            notification_type="RENEWAL_SUCCESS",
            is_read=False
        )

        db.add(renewal_notification)

        # ---------------------------------------------
        # 3. Create audit log
        # ---------------------------------------------
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="BOOK_RENEWED",
            entity_type="ISSUE",
            entity_id=issue.id,
            details=(
                f"Renewed Book ID {issue.book_id} "
                f"for User ID {issue.user_id}. "
                f"New due date: "
                f"{issue.due_date.strftime('%d-%m-%Y')}"
            )
        )

        # ---------------------------------------------
        # 4. Commit everything together
        # ---------------------------------------------
        db.commit()

        db.refresh(issue)
        db.refresh(renewal_notification)

        return issue

    except ValueError as error:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error)
        )

    except Exception:

        db.rollback()
        raise


# --------------------------------------------------
# GET UNPAID FINES
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.get("/fines/unpaid")
def get_unpaid_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    unpaid_issues = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "UNPAID"
        )
        .order_by(Issue.issue_date.desc())
        .all()
    )

    return [
        {
            "issue_id": issue.id,
            "user_id": issue.user_id,
            "book_id": issue.book_id,
            "fine_amount": float(issue.fine_amount),
            "fine_status": issue.fine_status,
            "overdue_days": issue.overdue_days,
            "return_date": issue.return_date
        }
        for issue in unpaid_issues
    ]


# --------------------------------------------------
# GET PAID FINES
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.get("/fines/paid")
def get_paid_fines(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    paid_issues = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .order_by(Issue.fine_paid_at.desc())
        .all()
    )

    return [
        {
            "issue_id": issue.id,
            "user_id": issue.user_id,
            "book_id": issue.book_id,
            "fine_amount": float(issue.fine_amount),
            "fine_status": issue.fine_status,
            "fine_paid_at": issue.fine_paid_at,
            "overdue_days": issue.overdue_days
        }
        for issue in paid_issues
    ]


# --------------------------------------------------
# PAY / RECORD FINE PAYMENT
# ADMIN and LIBRARIAN only
# --------------------------------------------------

@router.put("/{issue_id}/fine/pay")
def pay_fine(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue record not found"
        )

    # No fine exists
    if (
        not issue.fine_amount
        or float(issue.fine_amount) <= 0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fine exists for this issue"
        )

    # Fine already paid
    if issue.fine_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fine has already been paid"
        )

    # Update fine payment
    issue.fine_status = "PAID"
    issue.fine_paid_at = datetime.utcnow()

    # Create payment notification
    payment_notification = Notification(
        user_id=issue.user_id,
        message=(
            f"Your fine of ₹{float(issue.fine_amount):.2f} "
            f"for Book ID {issue.book_id} "
            f"has been successfully paid. "
            f"Issue ID {issue.id}"
        ),
        notification_type="FINE_PAID",
        is_read=False
    )

    db.add(payment_notification)

    # --------------------------------------------------
    # AUDIT LOG
    # --------------------------------------------------

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="FINE_PAID",
        entity_type="ISSUE",
        entity_id=issue.id,
        details=(
            f"Fine of ₹{float(issue.fine_amount):.2f} "
            f"paid for Issue ID {issue.id}, "
            f"Book ID {issue.book_id}, "
            f"User ID {issue.user_id}"
        )
    )


    try:
        # Commit both fine payment and notification
        db.commit()

        db.refresh(issue)
        db.refresh(payment_notification)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Fine payment recorded successfully",
        "issue_id": issue.id,
        "user_id": issue.user_id,
        "book_id": issue.book_id,
        "fine_amount": float(issue.fine_amount),
        "fine_status": issue.fine_status,
        "fine_paid_at": issue.fine_paid_at
    }



@router.get("/me/summary")
def get_my_borrowing_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id

    # Total borrowing records
    total_books_borrowed = (
        db.query(Issue)
        .filter(Issue.user_id == user_id)
        .count()
    )

    # Currently issued books
    currently_issued = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.status == "ISSUED"
        )
        .count()
    )

    # Returned books
    returned_books = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.status == "RETURNED"
        )
        .count()
    )

    # Currently overdue books
    now = datetime.utcnow()

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )

    # Unpaid fine cases
    unpaid_fines = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.fine_amount > 0,
            Issue.fine_status == "UNPAID"
        )
        .count()
    )

    # Total fines generated
    fine_records = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.fine_amount > 0
        )
        .all()
    )

    total_fine_amount = sum(
        float(issue.fine_amount or 0)
        for issue in fine_records
    )

    # Total fines paid
    paid_fine_records = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .all()
    )

    total_paid_fines = sum(
        float(issue.fine_amount or 0)
        for issue in paid_fine_records
    )

    outstanding_fine_amount = (
        total_fine_amount - total_paid_fines
    )

    return {
        "user_id": user_id,
        "total_books_borrowed": total_books_borrowed,
        "currently_issued": currently_issued,
        "returned_books": returned_books,
        "overdue_books": overdue_books,
        "unpaid_fine_cases": unpaid_fines,
        "total_fine_amount": total_fine_amount,
        "total_paid_fines": total_paid_fines,
        "outstanding_fine_amount": outstanding_fine_amount
    }




# --------------------------------------------------
# GET ONE ISSUE BY ID
# ADMIN and LIBRARIAN only
#
# IMPORTANT:
# Keep this dynamic route LAST
# --------------------------------------------------

@router.get(
    "/{issue_id}",
    response_model=IssueResponse
)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    issue = issue_repository.get_issue_by_id(
        db,
        issue_id
    )

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue record not found"
        )

    return issue