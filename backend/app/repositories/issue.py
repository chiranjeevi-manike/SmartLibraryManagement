
from app.models.reservation import Reservation
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.issue import Issue
from app.models.book import Book
from app.models.user import User

def create_issue(
    db: Session,
    user_id: int,
    book_id: int
):

    # --------------------------------------------------
    # 1. Check user
    # --------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise ValueError("User not found")


    # --------------------------------------------------
    # 2. Get role
    # --------------------------------------------------

    role_name = (
        user.role.name.upper()
        if user.role
        else None
    )


    # --------------------------------------------------
    # 3. Prevent duplicate active issue
    # --------------------------------------------------

    existing_issue = (
        db.query(Issue)
        .filter(
            Issue.user_id == user_id,
            Issue.book_id == book_id,
            Issue.status == "ISSUED"
        )
        .first()
    )

    if existing_issue:
        raise ValueError(
            "This user has already issued this book"
        )


    # --------------------------------------------------
    # 4. Block MEMBER if any active book is overdue
    # --------------------------------------------------

    if role_name == "MEMBER":

        now = datetime.utcnow()

        overdue_issue = (
            db.query(Issue)
            .filter(
                Issue.user_id == user_id,
                Issue.status == "ISSUED",
                Issue.due_date < now
            )
            .first()
        )

        if overdue_issue:
            raise ValueError(
                "Borrowing not allowed. Member has an overdue book"
            )

    # --------------------------------------------------
    # 5. Block MEMBER if unpaid fine exists
    # --------------------------------------------------

    if role_name == "MEMBER":

        unpaid_fine_issue = (
            db.query(Issue)
            .filter(
                Issue.user_id == user_id,
                Issue.fine_amount > 0,
                Issue.fine_status == "UNPAID"
            )
            .first()
        )

        if unpaid_fine_issue:
            raise ValueError(
                "Borrowing not allowed. Member has an unpaid fine"
            )


    # --------------------------------------------------
    # 6. Check MEMBER borrowing limit
    # --------------------------------------------------

    MAX_ACTIVE_ISSUES = 3

    if role_name == "MEMBER":

        active_issue_count = (
            db.query(Issue)
            .filter(
                Issue.user_id == user_id,
                Issue.status == "ISSUED"
            )
            .count()
        )

        if active_issue_count >= MAX_ACTIVE_ISSUES:
            raise ValueError(
                f"Borrowing limit reached. "
                f"Maximum {MAX_ACTIVE_ISSUES} active books allowed"
            )


    # --------------------------------------------------
    # 7. Check book
    # --------------------------------------------------

    book = (
        db.query(Book)
        .filter(
            Book.id == book_id,
            Book.is_active == True
        )
        .first()
    )

    if not book:
        raise ValueError("Book not found")


    # --------------------------------------------------
    # 8. Check availability
    # --------------------------------------------------

    if book.available_copies <= 0:
        raise ValueError(
            "Book is currently unavailable"
        )


    # --------------------------------------------------
    # 9. Check reservation priority
    # --------------------------------------------------

    ready_reservation = (
        db.query(Reservation)
        .filter(
            Reservation.book_id == book_id,
            Reservation.status == "READY"
        )
        .order_by(
            Reservation.reserved_at.asc(),
            Reservation.id.asc()
        )
        .first()
    )

    if (
        ready_reservation
        and ready_reservation.user_id != user_id
    ):
        raise ValueError(
            "This book is reserved for another member"
        )


    # --------------------------------------------------
    # 10. Create issue
    # --------------------------------------------------

    issue_date = datetime.utcnow()

    due_date = issue_date + timedelta(days=14)

    new_issue = Issue(
        user_id=user_id,
        book_id=book_id,
        issue_date=issue_date,
        due_date=due_date,
        status="ISSUED"
    )


    # --------------------------------------------------
    # 11. Reduce available copies
    # --------------------------------------------------

    book.available_copies -= 1


    # --------------------------------------------------
    # 12. Fulfill READY reservation
    # --------------------------------------------------

    if (
        ready_reservation
        and ready_reservation.user_id == user_id
    ):
        ready_reservation.status = "FULFILLED"
        ready_reservation.ready_until = None


    # --------------------------------------------------
    # 13. Add issue to transaction
    # Do not commit here.
    # Router will commit issue + audit log together.
    # --------------------------------------------------

    db.add(new_issue)

    # Generates new_issue.id without committing
    db.flush()

    return new_issue


def get_all_issues(db: Session):
    return db.query(Issue).all()


def get_issue_by_id(
    db: Session,
    issue_id: int
):
    return db.query(Issue).filter(
        Issue.id == issue_id
    ).first()

def return_book(
    db: Session,
    issue_id: int
):

    issue = db.query(Issue).filter(
        Issue.id == issue_id
    ).first()

    if not issue:
        raise ValueError(
            "Issue record not found"
        )

    if issue.status == "RETURNED":
        raise ValueError(
            "This book has already been returned"
        )

    book = db.query(Book).filter(
        Book.id == issue.book_id
    ).first()

    if not book:
        raise ValueError(
            "Book record not found"
        )

    return_date = datetime.utcnow()

    # -----------------------------
    # Calculate overdue days
    # -----------------------------

    if return_date > issue.due_date:

        overdue_days = (
            return_date.date() -
            issue.due_date.date()
        ).days

    else:
        overdue_days = 0

    # -----------------------------
    # Fine calculation
    # -----------------------------

    FINE_PER_DAY = 5

    fine_amount = overdue_days * FINE_PER_DAY

    # -----------------------------
    # Update issue
    # -----------------------------

    issue.return_date = return_date
    issue.overdue_days = overdue_days
    issue.fine_amount = fine_amount
    issue.status = "RETURNED"

    # Return copy to library
    book.available_copies += 1

    # --------------------------------------------------
    # Keep return operation inside current transaction
    # Router will commit return + notifications +
    # reservation changes + audit log together
    # --------------------------------------------------

    db.flush()

    return issue

def get_user_issue_history(
    db: Session,
    user_id: int
):
    return (
        db.query(Issue)
        .filter(Issue.user_id == user_id)
        .order_by(Issue.issue_date.desc())
        .all()
    )

def get_active_issues(db: Session):
    return (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .all()
    )


def get_overdue_issues(db: Session):
    now = datetime.utcnow()

    return (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .all()
    )


def calculate_current_fine(issue: Issue):
    if issue.status != "ISSUED":
        return issue.overdue_days, issue.fine_amount

    now = datetime.utcnow()

    if now > issue.due_date:
        overdue_days = (
            now.date() - issue.due_date.date()
        ).days
    else:
        overdue_days = 0

    FINE_PER_DAY = 5
    fine_amount = overdue_days * FINE_PER_DAY

    return overdue_days, fine_amount


def renew_issue(
    db: Session,
    issue_id: int
):
    issue = (
        db.query(Issue)
        .filter(Issue.id == issue_id)
        .first()
    )

    if not issue:
        raise ValueError("Issue record not found")

    if issue.status != "ISSUED":
        raise ValueError(
            "Only active issued books can be renewed"
        )

    if issue.renewal_count >= 1:
        raise ValueError(
            "This book has already been renewed once"
        )

    # Check whether another member is waiting for this book
    waiting_reservation = (
        db.query(Reservation)
        .filter(
            Reservation.book_id == issue.book_id,
            Reservation.user_id != issue.user_id,
            Reservation.status == "ACTIVE"
        )
        .first()
    )

    if waiting_reservation:
        raise ValueError(
            "Book cannot be renewed because another member has reserved it"
        )

    now = datetime.utcnow()

    if now > issue.due_date:
        raise ValueError(
            "Overdue books cannot be renewed"
        )

    # Extend due date by 14 days
    issue.due_date = issue.due_date + timedelta(days=14)

    # Increase renewal count
    issue.renewal_count += 1

    # Keep renewal inside the current transaction.
    # Router will commit renewal + notification + audit log.

    db.flush()

    return issue