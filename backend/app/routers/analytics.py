from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import User
from app.models.role import Role
from app.models.book import Book
from app.models.issue import Issue
from app.models.reservation import Reservation
from app.models.book_rating import BookRating
from app.models.audit_log import AuditLog
from app.models.notification import Notification

from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get("/dashboard")
def get_analytics_dashboard(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    # --------------------------------------------------
    # MEMBERS
    # --------------------------------------------------

    total_members = (
        db.query(User)
        .join(Role)
        .filter(
            Role.name == "MEMBER"
        )
        .count()
    )


    # --------------------------------------------------
    # BOOK STATISTICS
    # --------------------------------------------------

    total_book_titles = (
        db.query(Book)
        .filter(
            Book.is_active == True
        )
        .count()
    )

    total_copies = (
        db.query(
            func.coalesce(
                func.sum(Book.total_copies),
                0
            )
        )
        .filter(
            Book.is_active == True
        )
        .scalar()
    )

    available_copies = (
        db.query(
            func.coalesce(
                func.sum(Book.available_copies),
                0
            )
        )
        .filter(
            Book.is_active == True
        )
        .scalar()
    )

    issued_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED"
        )
        .count()
    )


    # --------------------------------------------------
    # OVERDUE BOOKS
    # --------------------------------------------------

    now = datetime.utcnow()

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )


    # --------------------------------------------------
    # RESERVATIONS
    # --------------------------------------------------

    active_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "ACTIVE"
        )
        .count()
    )

    ready_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY"
        )
        .count()
    )


    # --------------------------------------------------
    # FINES
    # --------------------------------------------------

    total_fines = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0
        )
        .scalar()
    )

    paid_fines = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .scalar()
    )

    outstanding_fines = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .scalar()
    )


    # --------------------------------------------------
    # RATINGS
    # --------------------------------------------------

    average_book_rating = (
        db.query(
            func.avg(BookRating.rating)
        )
        .scalar()
    )

    total_ratings = (
        db.query(BookRating)
        .count()
    )


    # --------------------------------------------------
    # CURRENT MONTH
    # --------------------------------------------------

    month_start = datetime(
        now.year,
        now.month,
        1
    )

    issues_this_month = (
        db.query(Issue)
        .filter(
            Issue.issue_date >= month_start
        )
        .count()
    )

    returns_this_month = (
        db.query(Issue)
        .filter(
            Issue.return_date != None,
            Issue.return_date >= month_start
        )
        .count()
    )


    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {

        "members": {
            "total_members": total_members
        },

        "books": {
            "total_book_titles": total_book_titles,
            "total_copies": int(total_copies),
            "available_copies": int(available_copies),
            "issued_books": issued_books,
            "overdue_books": overdue_books
        },

        "reservations": {
            "active": active_reservations,
            "ready_for_pickup": ready_reservations
        },

        "fines": {
            "total_generated": float(total_fines),
            "paid": float(paid_fines),
            "outstanding": float(outstanding_fines)
        },

        "ratings": {
            "total_ratings": total_ratings,
            "average_rating": (
                round(
                    float(average_book_rating),
                    2
                )
                if average_book_rating is not None
                else 0
            )
        },

        "monthly_activity": {
            "issues_this_month": issues_this_month,
            "returns_this_month": returns_this_month
        }
    }



# --------------------------------------------------
# TOP 5 MOST BORROWED BOOKS
# ADMIN ONLY
# --------------------------------------------------

@router.get("/top-borrowed-books")
def get_top_borrowed_books(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    results = (
        db.query(
            Book.id.label("book_id"),
            Book.title.label("title"),
            func.count(Issue.id).label("borrow_count")
        )
        .join(
            Issue,
            Issue.book_id == Book.id
        )
        .group_by(
            Book.id,
            Book.title
        )
        .order_by(
            func.count(Issue.id).desc()
        )
        .limit(limit)
        .all()
    )

    return {
        "total_results": len(results),
        "books": [
            {
                "book_id": row.book_id,
                "title": row.title,
                "borrow_count": row.borrow_count
            }
            for row in results
        ]
    }


# --------------------------------------------------
# TOP 5 HIGHEST RATED BOOKS
# ADMIN ONLY
# --------------------------------------------------

@router.get("/top-rated-books")
def get_top_rated_books(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    results = (
        db.query(
            Book.id.label("book_id"),
            Book.title.label("title"),
            func.avg(
                BookRating.rating
            ).label("average_rating"),
            func.count(
                BookRating.id
            ).label("rating_count")
        )
        .join(
            BookRating,
            BookRating.book_id == Book.id
        )
        .group_by(
            Book.id,
            Book.title
        )
        .order_by(
            func.avg(BookRating.rating).desc(),
            func.count(BookRating.id).desc()
        )
        .limit(limit)
        .all()
    )

    return {
        "total_results": len(results),
        "books": [
            {
                "book_id": row.book_id,
                "title": row.title,
                "average_rating": round(
                    float(row.average_rating),
                    2
                ),
                "rating_count": row.rating_count
            }
            for row in results
        ]
    }


# --------------------------------------------------
# TOP 5 MOST ACTIVE MEMBERS
# ADMIN ONLY
#
# Activity here means number of borrowing transactions.
# --------------------------------------------------

@router.get("/most-active-members")
def get_most_active_members(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    results = (
        db.query(
            User.id.label("user_id"),
            User.username.label("username"),
            User.full_name.label("full_name"),
            func.count(
                Issue.id
            ).label("borrow_count")
        )
        .join(
            Issue,
            Issue.user_id == User.id
        )
        .join(
            Role,
            Role.id == User.role_id
        )
        .filter(
            Role.name == "MEMBER"
        )
        .group_by(
            User.id,
            User.username,
            User.full_name
        )
        .order_by(
            func.count(Issue.id).desc()
        )
        .limit(limit)
        .all()
    )

    return {
        "total_results": len(results),
        "members": [
            {
                "user_id": row.user_id,
                "username": row.username,
                "full_name": row.full_name,
                "borrow_count": row.borrow_count
            }
            for row in results
        ]
    }


@router.get("/monthly-trends")
def get_monthly_trends(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    # Keep request reasonable
    if months < 1:
        months = 1

    if months > 24:
        months = 24

    now = datetime.utcnow()

    # --------------------------------------------------
    # GENERATE MONTH LIST
    # --------------------------------------------------

    month_list = []

    year = now.year
    month = now.month

    for _ in range(months):

        month_list.append(
            (year, month)
        )

        month -= 1

        if month == 0:
            month = 12
            year -= 1

    month_list.reverse()

    trends = []

    # --------------------------------------------------
    # CALCULATE ISSUES AND RETURNS FOR EACH MONTH
    # --------------------------------------------------

    for year, month in month_list:

        month_start = datetime(
            year,
            month,
            1
        )

        # Calculate next month
        if month == 12:
            next_month = datetime(
                year + 1,
                1,
                1
            )
        else:
            next_month = datetime(
                year,
                month + 1,
                1
            )

        issues_count = (
            db.query(Issue)
            .filter(
                Issue.issue_date >= month_start,
                Issue.issue_date < next_month
            )
            .count()
        )

        returns_count = (
            db.query(Issue)
            .filter(
                Issue.return_date != None,
                Issue.return_date >= month_start,
                Issue.return_date < next_month
            )
            .count()
        )

        trends.append(
            {
                "month": f"{year}-{month:02d}",
                "issues": issues_count,
                "returns": returns_count
            }
        )

    return {
        "months_requested": months,
        "total_months": len(trends),
        "trends": trends
    }

# --------------------------------------------------
# SECURITY DASHBOARD
# ADMIN ONLY
#
# Provides:
# - successful login count
# - failed login count
# - account lock count
# - account unlock count
# - currently locked users
# - recent security audit events
# --------------------------------------------------

@router.get("/security-dashboard")
def get_security_dashboard(
    recent_limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    # Keep request reasonable
    if recent_limit < 1:
        recent_limit = 1

    if recent_limit > 50:
        recent_limit = 50

    now = datetime.utcnow()

    security_actions = [
        "LOGIN_SUCCESS",
        "LOGIN_FAILED",
        "ACCOUNT_LOCKED",
        "ACCOUNT_UNLOCKED",
    ]

    # --------------------------------------------------
    # AUDIT COUNTS
    # --------------------------------------------------

    def count_action(action_name):
        return (
            db.query(AuditLog)
            .filter(
                AuditLog.action == action_name
            )
            .count()
        )

    login_success = count_action(
        "LOGIN_SUCCESS"
    )

    login_failed = count_action(
        "LOGIN_FAILED"
    )

    account_locked = count_action(
        "ACCOUNT_LOCKED"
    )

    account_unlocked = count_action(
        "ACCOUNT_UNLOCKED"
    )

    # --------------------------------------------------
    # CURRENTLY LOCKED USERS
    # --------------------------------------------------

    locked_users = (
        db.query(User)
        .join(
            Role,
            Role.id == User.role_id
        )
        .filter(
            User.locked_until.isnot(None),
            User.locked_until > now
        )
        .order_by(
            User.locked_until.desc(),
            User.id.asc()
        )
        .all()
    )

    # --------------------------------------------------
    # RECENT SECURITY EVENTS
    # --------------------------------------------------

    recent_events = (
        db.query(AuditLog)
        .filter(
            AuditLog.action.in_(
                security_actions
            )
        )
        .order_by(
            AuditLog.created_at.desc(),
            AuditLog.id.desc()
        )
        .limit(recent_limit)
        .all()
    )

    return {
        "summary": {
            "login_success": login_success,
            "login_failed": login_failed,
            "account_locked": account_locked,
            "account_unlocked": account_unlocked,
            "currently_locked": len(
                locked_users
            ),
        },

        "locked_users": [
            {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "role": (
                    user.role.name
                    if user.role
                    else None
                ),
                "failed_login_attempts":
                    user.failed_login_attempts,
                "locked_until":
                    user.locked_until,
            }
            for user in locked_users
        ],

        "recent_security_events": [
            {
                "id": event.id,
                "user_id": event.user_id,
                "action": event.action,
                "entity_type":
                    event.entity_type,
                "entity_id":
                    event.entity_id,
                "details": event.details,
                "created_at":
                    event.created_at,
            }
            for event in recent_events
        ],
    }

# --------------------------------------------------
# LIBRARY ACTIVITY MONITORING
# ADMIN ONLY
#
# Provides:
# - today's issue / return / reservation activity
# - fines paid today
# - current circulation status
# - recent issue and return transactions
# --------------------------------------------------

@router.get("/library-activity")
def get_library_activity(
    recent_limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    # Keep request reasonable
    if recent_limit < 1:
        recent_limit = 1

    if recent_limit > 50:
        recent_limit = 50

    now = datetime.utcnow()

    today_start = datetime(
        now.year,
        now.month,
        now.day
    )

    # --------------------------------------------------
    # TODAY'S ACTIVITY
    # --------------------------------------------------

    issued_today = (
        db.query(Issue)
        .filter(
            Issue.issue_date >= today_start
        )
        .count()
    )

    returned_today = (
        db.query(Issue)
        .filter(
            Issue.return_date.isnot(None),
            Issue.return_date >= today_start
        )
        .count()
    )

    reservations_today = (
        db.query(Reservation)
        .filter(
            Reservation.reserved_at >= today_start
        )
        .count()
    )

    fines_collected_today = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID",
            Issue.fine_paid_at.isnot(None),
            Issue.fine_paid_at >= today_start
        )
        .scalar()
    )

    # --------------------------------------------------
    # CURRENT CIRCULATION
    # --------------------------------------------------

    currently_issued = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED"
        )
        .count()
    )

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )

    active_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "ACTIVE"
        )
        .count()
    )

    ready_for_pickup = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY"
        )
        .count()
    )

    outstanding_fines = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .scalar()
    )

    # --------------------------------------------------
    # RECENT CIRCULATION ACTIVITY
    # --------------------------------------------------

    recent_issues = (
        db.query(
            Issue,
            User.username,
            User.full_name,
            Book.title
        )
        .join(
            User,
            User.id == Issue.user_id
        )
        .join(
            Book,
            Book.id == Issue.book_id
        )
        .order_by(
            Issue.issue_date.desc(),
            Issue.id.desc()
        )
        .limit(recent_limit)
        .all()
    )

    recent_activity = []

    for issue, username, full_name, title in recent_issues:

        recent_activity.append(
            {
                "issue_id": issue.id,
                "user_id": issue.user_id,
                "username": username,
                "full_name": full_name,
                "book_id": issue.book_id,
                "book_title": title,
                "issue_date": issue.issue_date,
                "due_date": issue.due_date,
                "return_date": issue.return_date,
                "status": issue.status,
                "overdue_days": issue.overdue_days,
                "fine_amount": float(
                    issue.fine_amount or 0
                ),
                "fine_status": issue.fine_status,
            }
        )

    return {
        "today": {
            "issued": issued_today,
            "returned": returned_today,
            "reservations": reservations_today,
            "fines_collected": float(
                fines_collected_today or 0
            ),
        },

        "current_circulation": {
            "currently_issued": currently_issued,
            "overdue_books": overdue_books,
            "active_reservations":
                active_reservations,
            "ready_for_pickup":
                ready_for_pickup,
            "outstanding_fines": float(
                outstanding_fines or 0
            ),
        },

        "recent_activity": recent_activity,
    }

# --------------------------------------------------
# DUE-DATE & OVERDUE MONITORING
# ADMIN ONLY
#
# Provides:
# - books due today
# - books due within the next 3 days
# - overdue books
# - member and book details
# - estimated overdue fine at Rs. 5 per day
# --------------------------------------------------

@router.get("/due-monitoring")
def get_due_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    now = datetime.utcnow()

    today_start = datetime(
        now.year,
        now.month,
        now.day
    )

    tomorrow_start = (
        today_start + timedelta(days=1)
    )

    next_three_days_end = (
        today_start + timedelta(days=4)
    )

    # --------------------------------------------------
    # BASE QUERY
    # --------------------------------------------------

    base_query = (
        db.query(
            Issue,
            User.username,
            User.full_name,
            User.email,
            Book.title
        )
        .join(
            User,
            User.id == Issue.user_id
        )
        .join(
            Book,
            Book.id == Issue.book_id
        )
        .filter(
            Issue.status == "ISSUED"
        )
    )

    due_today_rows = (
        base_query
        .filter(
            Issue.due_date >= today_start,
            Issue.due_date < tomorrow_start
        )
        .order_by(
            Issue.due_date.asc(),
            Issue.id.asc()
        )
        .all()
    )

    due_soon_rows = (
        base_query
        .filter(
            Issue.due_date >= tomorrow_start,
            Issue.due_date < next_three_days_end
        )
        .order_by(
            Issue.due_date.asc(),
            Issue.id.asc()
        )
        .all()
    )

    overdue_rows = (
        base_query
        .filter(
            Issue.due_date < now
        )
        .order_by(
            Issue.due_date.asc(),
            Issue.id.asc()
        )
        .all()
    )

    # --------------------------------------------------
    # SERIALIZER
    # --------------------------------------------------

    def serialize_row(
        row,
        category
    ):
        issue, username, full_name, email, title = row

        overdue_days = 0
        estimated_fine = 0.0

        if issue.due_date and issue.due_date < now:
            overdue_seconds = (
                now - issue.due_date
            ).total_seconds()

            # Any started overdue day is counted.
            overdue_days = max(
                1,
                int(
                    (
                        overdue_seconds
                        + 86399
                    ) // 86400
                )
            )

            estimated_fine = float(
                overdue_days * 5
            )

        return {
            "issue_id": issue.id,
            "user_id": issue.user_id,
            "username": username,
            "full_name": full_name,
            "email": email,
            "book_id": issue.book_id,
            "book_title": title,
            "issue_date": issue.issue_date,
            "due_date": issue.due_date,
            "category": category,
            "overdue_days": overdue_days,
            "estimated_fine": estimated_fine,
            "recorded_fine": float(
                issue.fine_amount or 0
            ),
            "fine_status": issue.fine_status,
        }

    due_today = [
        serialize_row(
            row,
            "DUE_TODAY"
        )
        for row in due_today_rows
    ]

    due_soon = [
        serialize_row(
            row,
            "DUE_SOON"
        )
        for row in due_soon_rows
    ]

    overdue = [
        serialize_row(
            row,
            "OVERDUE"
        )
        for row in overdue_rows
    ]

    total_estimated_overdue_fines = sum(
        item["estimated_fine"]
        for item in overdue
    )

    return {
        "summary": {
            "due_today": len(due_today),
            "due_next_3_days": len(due_soon),
            "overdue": len(overdue),
            "total_monitored": (
                len(due_today)
                + len(due_soon)
                + len(overdue)
            ),
            "estimated_overdue_fines":
                total_estimated_overdue_fines,
        },

        "due_today": due_today,
        "due_next_3_days": due_soon,
        "overdue": overdue,
    }

# --------------------------------------------------
# AUTOMATED REMINDER MONITORING
# ADMIN ONLY
#
# Provides:
# - notification/reminder counts by type
# - read/unread delivery status
# - recent reminder records with member details
# --------------------------------------------------

@router.get("/reminder-monitoring")
def get_reminder_monitoring(
    recent_limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):

    if recent_limit < 1:
        recent_limit = 1

    if recent_limit > 100:
        recent_limit = 100

    monitored_types = [
        "DUE_REMINDER",
        "OVERDUE",
        "RESERVATION_READY",
        "RESERVATION_EXPIRED",
        "FINE_GENERATED",
        "FINE_PAID",
        "RENEWAL_SUCCESS",
    ]

    # --------------------------------------------------
    # SUMMARY COUNTS
    # --------------------------------------------------

    total_notifications = (
        db.query(Notification)
        .filter(
            Notification.notification_type.in_(
                monitored_types
            )
        )
        .count()
    )

    unread_notifications = (
        db.query(Notification)
        .filter(
            Notification.notification_type.in_(
                monitored_types
            ),
            Notification.is_read == False
        )
        .count()
    )

    read_notifications = (
        db.query(Notification)
        .filter(
            Notification.notification_type.in_(
                monitored_types
            ),
            Notification.is_read == True
        )
        .count()
    )

    def count_type(type_name):
        return (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == type_name
            )
            .count()
        )

    type_counts = {
        notification_type: count_type(
            notification_type
        )
        for notification_type in monitored_types
    }

    # --------------------------------------------------
    # RECENT REMINDERS
    # --------------------------------------------------

    recent_rows = (
        db.query(
            Notification,
            User.username,
            User.full_name,
            User.email
        )
        .join(
            User,
            User.id == Notification.user_id
        )
        .filter(
            Notification.notification_type.in_(
                monitored_types
            )
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc()
        )
        .limit(recent_limit)
        .all()
    )

    recent_reminders = []

    for (
        notification,
        username,
        full_name,
        email
    ) in recent_rows:

        recent_reminders.append(
            {
                "id": notification.id,
                "user_id": notification.user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "notification_type":
                    notification.notification_type,
                "message": notification.message,
                "is_read": notification.is_read,
                "created_at":
                    notification.created_at,
            }
        )

    return {
        "summary": {
            "total_notifications":
                total_notifications,
            "read": read_notifications,
            "unread": unread_notifications,
            "due_reminders":
                type_counts["DUE_REMINDER"],
            "overdue_alerts":
                type_counts["OVERDUE"],
            "reservation_ready":
                type_counts["RESERVATION_READY"],
            "reservation_expired":
                type_counts["RESERVATION_EXPIRED"],
            "fine_generated":
                type_counts["FINE_GENERATED"],
            "fine_paid":
                type_counts["FINE_PAID"],
            "renewal_success":
                type_counts["RENEWAL_SUCCESS"],
        },

        "type_counts": type_counts,

        "recent_reminders": recent_reminders,
    }

# --------------------------------------------------
# INVENTORY & BOOK STOCK MONITORING
# ADMIN ONLY
#
# Provides:
# - total titles and copies
# - available / issued copies
# - low-stock / out-of-stock / inactive titles
# - stock utilization percentage
# - active reservation demand per book
# --------------------------------------------------

@router.get("/inventory-monitoring")
def get_inventory_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    books = (
        db.query(Book)
        .order_by(
            Book.title.asc(),
            Book.id.asc()
        )
        .all()
    )

    active_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.status == "ISSUED"
        )
        .group_by(Issue.book_id)
        .all()
    )

    reservation_counts = dict(
        db.query(
            Reservation.book_id,
            func.count(Reservation.id)
        )
        .filter(
            Reservation.status.in_(
                ["ACTIVE", "READY"]
            )
        )
        .group_by(Reservation.book_id)
        .all()
    )

    total_titles = len(books)
    active_titles = 0
    inactive_titles = 0
    total_copies = 0
    available_copies = 0
    issued_copies = 0
    low_stock_titles = 0
    out_of_stock_titles = 0
    titles_with_reservation_demand = 0

    inventory = []

    for book in books:
        total = int(book.total_copies or 0)
        available = int(book.available_copies or 0)
        issued = int(
            active_issue_counts.get(book.id, 0)
        )
        reservation_demand = int(
            reservation_counts.get(book.id, 0)
        )

        if book.is_active:
            active_titles += 1
            total_copies += total
            available_copies += available
            issued_copies += issued

            if available <= 0:
                stock_status = "OUT_OF_STOCK"
                out_of_stock_titles += 1
            elif available <= 2:
                stock_status = "LOW_STOCK"
                low_stock_titles += 1
            else:
                stock_status = "IN_STOCK"

            if reservation_demand > 0:
                titles_with_reservation_demand += 1
        else:
            inactive_titles += 1
            stock_status = "INACTIVE"

        utilization_percentage = (
            round(
                (issued / total) * 100,
                2
            )
            if total > 0
            else 0.0
        )

        inventory.append(
            {
                "book_id": book.id,
                "title": book.title,
                "total_copies": total,
                "available_copies": available,
                "issued_copies": issued,
                "stock_status": stock_status,
                "active_reservations":
                    reservation_demand,
                "utilization_percentage":
                    utilization_percentage,
                "is_active": bool(
                    book.is_active
                ),
            }
        )

    overall_utilization_percentage = (
        round(
            (issued_copies / total_copies) * 100,
            2
        )
        if total_copies > 0
        else 0.0
    )

    return {
        "summary": {
            "total_titles": total_titles,
            "active_titles": active_titles,
            "inactive_titles": inactive_titles,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "issued_copies": issued_copies,
            "low_stock_titles": low_stock_titles,
            "out_of_stock_titles":
                out_of_stock_titles,
            "titles_with_reservation_demand":
                titles_with_reservation_demand,
            "utilization_percentage":
                overall_utilization_percentage,
        },
        "inventory": inventory,
    }

# --------------------------------------------------
# MEMBER BORROWING RISK & ELIGIBILITY MONITORING
# ADMIN ONLY
#
# Borrowing policy reflected here:
# - maximum 3 active borrowed books
# - blocked by an overdue active issue
# - blocked by an unpaid fine
# - blocked when borrowing limit is reached
# - blocked when member account is inactive
# --------------------------------------------------

@router.get("/member-risk-monitoring")
def get_member_risk_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    now = datetime.utcnow()
    borrowing_limit = 3

    members = (
        db.query(User)
        .join(
            Role,
            Role.id == User.role_id
        )
        .filter(
            Role.name == "MEMBER"
        )
        .order_by(
            User.full_name.asc(),
            User.id.asc()
        )
        .all()
    )

    active_issue_counts = dict(
        db.query(
            Issue.user_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.status == "ISSUED"
        )
        .group_by(Issue.user_id)
        .all()
    )

    overdue_issue_counts = dict(
        db.query(
            Issue.user_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .group_by(Issue.user_id)
        .all()
    )

    unpaid_fine_totals = dict(
        db.query(
            Issue.user_id,
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .group_by(Issue.user_id)
        .all()
    )

    reservation_counts = dict(
        db.query(
            Reservation.user_id,
            func.count(Reservation.id)
        )
        .filter(
            Reservation.status.in_(
                ["ACTIVE", "READY"]
            )
        )
        .group_by(Reservation.user_id)
        .all()
    )

    total_members = len(members)
    eligible_members = 0
    blocked_members = 0
    members_with_overdue_books = 0
    members_with_unpaid_fines = 0
    members_at_borrowing_limit = 0
    inactive_members = 0
    high_risk_members = 0

    member_risks = []

    for member in members:
        active_books = int(
            active_issue_counts.get(member.id, 0)
        )
        overdue_books = int(
            overdue_issue_counts.get(member.id, 0)
        )
        unpaid_fines = float(
            unpaid_fine_totals.get(member.id, 0) or 0
        )
        active_reservations = int(
            reservation_counts.get(member.id, 0)
        )

        remaining_capacity = max(
            0,
            borrowing_limit - active_books
        )

        blocking_reasons = []

        if not member.is_active:
            blocking_reasons.append(
                "INACTIVE_ACCOUNT"
            )
            inactive_members += 1

        if overdue_books > 0:
            blocking_reasons.append(
                "OVERDUE_BOOK"
            )
            members_with_overdue_books += 1

        if unpaid_fines > 0:
            blocking_reasons.append(
                "UNPAID_FINE"
            )
            members_with_unpaid_fines += 1

        if active_books >= borrowing_limit:
            blocking_reasons.append(
                "BORROWING_LIMIT_REACHED"
            )
            members_at_borrowing_limit += 1

        borrowing_eligibility = (
            "BLOCKED"
            if blocking_reasons
            else "ELIGIBLE"
        )

        if borrowing_eligibility == "ELIGIBLE":
            eligible_members += 1
        else:
            blocked_members += 1

        # Risk level is an administrative monitoring signal.
        # HIGH: inactive, overdue, or multiple blocking conditions.
        # MEDIUM: unpaid fine only, at borrowing limit only,
        #         or member is close to the limit.
        # LOW: no current borrowing concern.
        if (
            not member.is_active
            or overdue_books > 0
            or len(blocking_reasons) >= 2
        ):
            risk_level = "HIGH"
        elif (
            unpaid_fines > 0
            or active_books >= borrowing_limit
            or active_books == borrowing_limit - 1
        ):
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        if risk_level == "HIGH":
            high_risk_members += 1

        member_risks.append(
            {
                "user_id": member.id,
                "username": member.username,
                "full_name": member.full_name,
                "email": member.email,
                "is_active": bool(
                    member.is_active
                ),
                "active_books": active_books,
                "borrowing_limit":
                    borrowing_limit,
                "remaining_capacity":
                    remaining_capacity,
                "overdue_books":
                    overdue_books,
                "unpaid_fines": round(
                    unpaid_fines,
                    2
                ),
                "active_reservations":
                    active_reservations,
                "borrowing_eligibility":
                    borrowing_eligibility,
                "blocking_reasons":
                    blocking_reasons,
                "risk_level": risk_level,
            }
        )

    risk_order = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
    }

    member_risks.sort(
        key=lambda item: (
            risk_order.get(
                item["risk_level"],
                3
            ),
            0
            if item["borrowing_eligibility"] == "BLOCKED"
            else 1,
            (item["full_name"] or "").lower(),
            item["user_id"],
        )
    )

    return {
        "policy": {
            "borrowing_limit": borrowing_limit,
            "blocks_on_overdue": True,
            "blocks_on_unpaid_fine": True,
            "blocks_on_inactive_account": True,
        },
        "summary": {
            "total_members": total_members,
            "eligible_members": eligible_members,
            "blocked_members": blocked_members,
            "members_with_overdue_books":
                members_with_overdue_books,
            "members_with_unpaid_fines":
                members_with_unpaid_fines,
            "members_at_borrowing_limit":
                members_at_borrowing_limit,
            "inactive_members": inactive_members,
            "high_risk_members":
                high_risk_members,
        },
        "members": member_risks,
    }

# --------------------------------------------------
# SYSTEM HEALTH & OPERATIONAL MONITORING
# ADMIN ONLY
#
# Consolidates:
# - user/account health
# - circulation and overdue workload
# - fine and reservation backlog
# - unread notification backlog
# - security lock status
# - inventory shortages
# - data consistency warnings
# --------------------------------------------------

@router.get("/system-health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    now = datetime.utcnow()

    # --------------------------------------------------
    # USER / ACCOUNT HEALTH
    # --------------------------------------------------

    total_users = db.query(User).count()

    active_users = (
        db.query(User)
        .filter(User.is_active == True)
        .count()
    )

    inactive_users = total_users - active_users

    currently_locked = (
        db.query(User)
        .filter(
            User.locked_until.isnot(None),
            User.locked_until > now
        )
        .count()
    )

    # --------------------------------------------------
    # CIRCULATION HEALTH
    # --------------------------------------------------

    currently_issued = (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .count()
    )

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )

    outstanding_fines = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .scalar()
    )

    unpaid_fine_cases = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .count()
    )

    # --------------------------------------------------
    # RESERVATION BACKLOG
    # --------------------------------------------------

    active_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.status == "ACTIVE"
        )
        .count()
    )

    ready_for_pickup = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY"
        )
        .count()
    )

    expired_ready_waiting = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY",
            Reservation.ready_until.isnot(None),
            Reservation.ready_until < now
        )
        .count()
    )

    # --------------------------------------------------
    # NOTIFICATION BACKLOG
    # --------------------------------------------------

    unread_notifications = (
        db.query(Notification)
        .filter(
            Notification.is_read == False
        )
        .count()
    )

    # --------------------------------------------------
    # INVENTORY HEALTH
    # --------------------------------------------------

    active_books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .all()
    )

    total_active_titles = len(active_books)
    low_stock_titles = 0
    out_of_stock_titles = 0
    negative_stock_titles = 0
    copy_count_mismatches = 0

    active_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.status == "ISSUED"
        )
        .group_by(Issue.book_id)
        .all()
    )

    inventory_warnings = []

    for book in active_books:
        total = int(book.total_copies or 0)
        available = int(book.available_copies or 0)
        issued = int(
            active_issue_counts.get(book.id, 0)
        )

        warning_types = []

        if available < 0:
            negative_stock_titles += 1
            warning_types.append(
                "NEGATIVE_AVAILABLE_COPIES"
            )

        if available <= 0:
            out_of_stock_titles += 1
            warning_types.append(
                "OUT_OF_STOCK"
            )
        elif available <= 2:
            low_stock_titles += 1
            warning_types.append(
                "LOW_STOCK"
            )

        if available > total:
            copy_count_mismatches += 1
            warning_types.append(
                "AVAILABLE_EXCEEDS_TOTAL"
            )

        if available + issued != total:
            copy_count_mismatches += 1
            warning_types.append(
                "COPY_COUNT_MISMATCH"
            )

        if warning_types:
            inventory_warnings.append(
                {
                    "book_id": book.id,
                    "title": book.title,
                    "total_copies": total,
                    "available_copies": available,
                    "issued_copies": issued,
                    "warnings": warning_types,
                }
            )

    # --------------------------------------------------
    # DATA CONSISTENCY CHECKS
    # --------------------------------------------------

    issued_without_due_date = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date.is_(None)
        )
        .count()
    )

    returned_without_return_date = (
        db.query(Issue)
        .filter(
            Issue.status == "RETURNED",
            Issue.return_date.is_(None)
        )
        .count()
    )

    active_reservations_for_inactive_books = (
        db.query(Reservation)
        .join(
            Book,
            Book.id == Reservation.book_id
        )
        .filter(
            Reservation.status.in_(
                ["ACTIVE", "READY"]
            ),
            Book.is_active == False
        )
        .count()
    )

    data_consistency_issues = (
        issued_without_due_date
        + returned_without_return_date
        + active_reservations_for_inactive_books
        + negative_stock_titles
        + copy_count_mismatches
    )

    # --------------------------------------------------
    # HEALTH RULES
    # --------------------------------------------------

    warning_conditions = []
    critical_conditions = []

    if overdue_books > 0:
        warning_conditions.append(
            {
                "code": "OVERDUE_BOOKS",
                "message":
                    f"{overdue_books} issued book(s) are overdue.",
                "value": overdue_books,
            }
        )

    if unpaid_fine_cases > 0:
        warning_conditions.append(
            {
                "code": "OUTSTANDING_FINES",
                "message":
                    f"{unpaid_fine_cases} fine case(s) remain unpaid.",
                "value": float(
                    outstanding_fines or 0
                ),
            }
        )

    if active_reservations > 0:
        warning_conditions.append(
            {
                "code": "ACTIVE_RESERVATION_BACKLOG",
                "message":
                    f"{active_reservations} active reservation(s) are waiting.",
                "value": active_reservations,
            }
        )

    if unread_notifications > 10:
        warning_conditions.append(
            {
                "code": "NOTIFICATION_BACKLOG",
                "message":
                    f"{unread_notifications} notifications are unread.",
                "value": unread_notifications,
            }
        )

    if low_stock_titles > 0:
        warning_conditions.append(
            {
                "code": "LOW_STOCK",
                "message":
                    f"{low_stock_titles} active title(s) have low stock.",
                "value": low_stock_titles,
            }
        )

    if inactive_users > 0:
        warning_conditions.append(
            {
                "code": "INACTIVE_USERS",
                "message":
                    f"{inactive_users} user account(s) are inactive.",
                "value": inactive_users,
            }
        )

    if currently_locked > 0:
        critical_conditions.append(
            {
                "code": "LOCKED_ACCOUNTS",
                "message":
                    f"{currently_locked} account(s) are currently locked.",
                "value": currently_locked,
            }
        )

    if out_of_stock_titles > 0:
        critical_conditions.append(
            {
                "code": "OUT_OF_STOCK",
                "message":
                    f"{out_of_stock_titles} active title(s) are out of stock.",
                "value": out_of_stock_titles,
            }
        )

    if expired_ready_waiting > 0:
        critical_conditions.append(
            {
                "code": "EXPIRED_READY_RESERVATIONS",
                "message":
                    f"{expired_ready_waiting} READY reservation(s) have passed their pickup deadline.",
                "value": expired_ready_waiting,
            }
        )

    if data_consistency_issues > 0:
        critical_conditions.append(
            {
                "code": "DATA_CONSISTENCY",
                "message":
                    f"{data_consistency_issues} data consistency issue(s) require attention.",
                "value": data_consistency_issues,
            }
        )

    if critical_conditions:
        overall_status = "CRITICAL"
    elif warning_conditions:
        overall_status = "WARNING"
    else:
        overall_status = "HEALTHY"

    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {
        "overall_status": overall_status,
        "checked_at": now,
        "summary": {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "currently_locked_accounts":
                currently_locked,
            "currently_issued_books":
                currently_issued,
            "overdue_books": overdue_books,
            "unpaid_fine_cases":
                unpaid_fine_cases,
            "outstanding_fines": float(
                outstanding_fines or 0
            ),
            "active_reservations":
                active_reservations,
            "ready_for_pickup":
                ready_for_pickup,
            "expired_ready_waiting":
                expired_ready_waiting,
            "unread_notifications":
                unread_notifications,
            "active_book_titles":
                total_active_titles,
            "low_stock_titles":
                low_stock_titles,
            "out_of_stock_titles":
                out_of_stock_titles,
            "data_consistency_issues":
                data_consistency_issues,
        },
        "data_checks": {
            "issued_without_due_date":
                issued_without_due_date,
            "returned_without_return_date":
                returned_without_return_date,
            "active_reservations_for_inactive_books":
                active_reservations_for_inactive_books,
            "negative_stock_titles":
                negative_stock_titles,
            "copy_count_mismatches":
                copy_count_mismatches,
        },
        "warning_conditions":
            warning_conditions,
        "critical_conditions":
            critical_conditions,
        "inventory_warnings":
            inventory_warnings,
    }

# --------------------------------------------------
# RESERVATION QUEUE & DEMAND MONITORING
# ADMIN ONLY
#
# Provides:
# - reservation counts by status
# - books with current reservation demand
# - longest active queue
# - oldest waiting reservation
# - READY reservations approaching pickup expiry
# - per-book queue and demand details
# --------------------------------------------------

@router.get("/reservation-demand-monitoring")
def get_reservation_demand_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    now = datetime.utcnow()
    expiring_soon_until = now + timedelta(hours=24)

    # --------------------------------------------------
    # STATUS COUNTS
    # --------------------------------------------------

    def reservation_status_count(status_name):
        return (
            db.query(Reservation)
            .filter(
                Reservation.status == status_name
            )
            .count()
        )

    active_count = reservation_status_count("ACTIVE")
    ready_count = reservation_status_count("READY")
    fulfilled_count = reservation_status_count("FULFILLED")
    expired_count = reservation_status_count("EXPIRED")
    cancelled_count = reservation_status_count("CANCELLED")

    total_reservations = (
        db.query(Reservation)
        .count()
    )

    # READY records that are still in READY state but whose
    # pickup deadline has already passed.
    overdue_ready_count = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY",
            Reservation.ready_until.isnot(None),
            Reservation.ready_until < now
        )
        .count()
    )

    ready_expiring_soon_rows = (
        db.query(
            Reservation,
            User.username,
            User.full_name,
            User.email,
            Book.title
        )
        .join(
            User,
            User.id == Reservation.user_id
        )
        .join(
            Book,
            Book.id == Reservation.book_id
        )
        .filter(
            Reservation.status == "READY",
            Reservation.ready_until.isnot(None),
            Reservation.ready_until >= now,
            Reservation.ready_until <= expiring_soon_until
        )
        .order_by(
            Reservation.ready_until.asc(),
            Reservation.id.asc()
        )
        .all()
    )

    # --------------------------------------------------
    # CURRENT DEMAND BY BOOK
    # --------------------------------------------------

    demand_rows = (
        db.query(
            Book,
            func.sum(
                case(
                    (
                        Reservation.status == "ACTIVE",
                        1
                    ),
                    else_=0
                )
            ).label("active_queue"),
            func.sum(
                case(
                    (
                        Reservation.status == "READY",
                        1
                    ),
                    else_=0
                )
            ).label("ready_count")
        )
        .join(
            Reservation,
            Reservation.book_id == Book.id
        )
        .filter(
            Reservation.status.in_(
                ["ACTIVE", "READY"]
            )
        )
        .group_by(Book.id)
        .all()
    )

    # --------------------------------------------------
    # FIFO QUEUE DETAILS
    # --------------------------------------------------

    book_demands = []
    longest_queue = 0
    longest_queue_book = None
    oldest_waiting_reservation = None

    for book, active_queue_raw, ready_raw in demand_rows:
        active_queue = int(active_queue_raw or 0)
        book_ready_count = int(ready_raw or 0)
        total_current_demand = (
            active_queue + book_ready_count
        )

        active_queue_rows = (
            db.query(
                Reservation,
                User.username,
                User.full_name,
                User.email
            )
            .join(
                User,
                User.id == Reservation.user_id
            )
            .filter(
                Reservation.book_id == book.id,
                Reservation.status == "ACTIVE"
            )
            .order_by(
                Reservation.reserved_at.asc(),
                Reservation.id.asc()
            )
            .all()
        )

        queue = []

        for position, row in enumerate(
            active_queue_rows,
            start=1
        ):
            reservation, username, full_name, email = row

            reserved_at = reservation.reserved_at

            if (
                reserved_at is not None
                and reserved_at.tzinfo is not None
            ):
                comparison_now = datetime.now(
                    reserved_at.tzinfo
                )
            else:
                comparison_now = now

            waiting_seconds = max(
                0,
                (
                    comparison_now - reserved_at
                ).total_seconds()
            )

            waiting_days = round(
                waiting_seconds / 86400,
                2
            )

            queue_item = {
                "queue_position": position,
                "reservation_id": reservation.id,
                "user_id": reservation.user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "reserved_at": reservation.reserved_at,
                "waiting_days": waiting_days,
            }

            queue.append(queue_item)

            if oldest_waiting_reservation is None:
                is_older = True
            else:
                previous_reserved_at = (
                    oldest_waiting_reservation["reserved_at"]
                )

                current_sort_time = reserved_at
                previous_sort_time = previous_reserved_at

                if (
                    current_sort_time.tzinfo is not None
                    and previous_sort_time.tzinfo is None
                ):
                    previous_sort_time = (
                        previous_sort_time.replace(
                            tzinfo=current_sort_time.tzinfo
                        )
                    )
                elif (
                    current_sort_time.tzinfo is None
                    and previous_sort_time.tzinfo is not None
                ):
                    current_sort_time = (
                        current_sort_time.replace(
                            tzinfo=previous_sort_time.tzinfo
                        )
                    )

                is_older = (
                    current_sort_time < previous_sort_time
                    or (
                        current_sort_time == previous_sort_time
                        and reservation.id
                        < oldest_waiting_reservation["reservation_id"]
                    )
                )

            if is_older:
                oldest_waiting_reservation = {
                    **queue_item,
                    "book_id": book.id,
                    "book_title": book.title,
                }

        ready_rows = (
            db.query(
                Reservation,
                User.username,
                User.full_name,
                User.email
            )
            .join(
                User,
                User.id == Reservation.user_id
            )
            .filter(
                Reservation.book_id == book.id,
                Reservation.status == "READY"
            )
            .order_by(
                Reservation.ready_until.asc(),
                Reservation.id.asc()
            )
            .all()
        )

        ready_pickups = []

        for reservation, username, full_name, email in ready_rows:
            pickup_status = "READY"

            if (
                reservation.ready_until
                and reservation.ready_until < now
            ):
                pickup_status = "PICKUP_DEADLINE_PASSED"
            elif (
                reservation.ready_until
                and reservation.ready_until <= expiring_soon_until
            ):
                pickup_status = "EXPIRING_SOON"

            ready_pickups.append(
                {
                    "reservation_id": reservation.id,
                    "user_id": reservation.user_id,
                    "username": username,
                    "full_name": full_name,
                    "email": email,
                    "reserved_at": reservation.reserved_at,
                    "ready_until": reservation.ready_until,
                    "pickup_status": pickup_status,
                }
            )

        if active_queue > longest_queue:
            longest_queue = active_queue
            longest_queue_book = {
                "book_id": book.id,
                "title": book.title,
                "active_queue": active_queue,
            }

        if active_queue >= 3:
            demand_level = "HIGH"
        elif active_queue >= 1 or book_ready_count >= 1:
            demand_level = "MEDIUM"
        else:
            demand_level = "LOW"

        book_demands.append(
            {
                "book_id": book.id,
                "title": book.title,
                "is_active": bool(book.is_active),
                "total_copies": int(
                    book.total_copies or 0
                ),
                "available_copies": int(
                    book.available_copies or 0
                ),
                "active_queue": active_queue,
                "ready_for_pickup": book_ready_count,
                "total_current_demand":
                    total_current_demand,
                "demand_level": demand_level,
                "next_waiting_member":
                    queue[0] if queue else None,
                "queue": queue,
                "ready_pickups": ready_pickups,
            }
        )

    demand_order = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
    }

    book_demands.sort(
        key=lambda item: (
            demand_order.get(
                item["demand_level"],
                3
            ),
            -item["active_queue"],
            -item["ready_for_pickup"],
            item["title"].lower(),
            item["book_id"],
        )
    )

    books_with_demand = len(book_demands)
    high_demand_books = sum(
        1
        for item in book_demands
        if item["demand_level"] == "HIGH"
    )

    # --------------------------------------------------
    # READY PICKUPS EXPIRING WITHIN 24 HOURS
    # --------------------------------------------------

    ready_expiring_soon = []

    for (
        reservation,
        username,
        full_name,
        email,
        title
    ) in ready_expiring_soon_rows:

        ready_until = reservation.ready_until

        if (
            ready_until is not None
            and ready_until.tzinfo is not None
        ):
            comparison_now = datetime.now(
                ready_until.tzinfo
            )
        else:
            comparison_now = now

        seconds_remaining = max(
            0,
            (
                ready_until - comparison_now
            ).total_seconds()
        )

        ready_expiring_soon.append(
            {
                "reservation_id": reservation.id,
                "user_id": reservation.user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "book_id": reservation.book_id,
                "book_title": title,
                "ready_until": reservation.ready_until,
                "hours_remaining": round(
                    seconds_remaining / 3600,
                    2
                ),
            }
        )

    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {
        "policy": {
            "queue_order": "FIFO_BY_RESERVED_AT_THEN_ID",
            "ready_expiring_soon_window_hours": 24,
            "high_demand_active_queue_threshold": 3,
        },
        "summary": {
            "total_reservations": total_reservations,
            "active_reservations": active_count,
            "ready_for_pickup": ready_count,
            "fulfilled_reservations": fulfilled_count,
            "expired_reservations": expired_count,
            "cancelled_reservations": cancelled_count,
            "books_with_current_demand": books_with_demand,
            "high_demand_books": high_demand_books,
            "longest_active_queue": longest_queue,
            "ready_expiring_within_24_hours":
                len(ready_expiring_soon),
            "ready_past_pickup_deadline":
                overdue_ready_count,
        },
        "longest_queue_book":
            longest_queue_book,
        "oldest_waiting_reservation":
            oldest_waiting_reservation,
        "ready_expiring_soon":
            ready_expiring_soon,
        "books": book_demands,
    }

# --------------------------------------------------
# FINE COLLECTION & REVENUE MONITORING
# ADMIN ONLY
#
# Provides:
# - total fines generated / collected / outstanding
# - paid and unpaid fine cases
# - collection and outstanding percentages
# - members with highest unpaid fine exposure
# - recent fine payments
# - current overdue fine exposure
# - monthly fine collection trends
# --------------------------------------------------

@router.get("/fine-monitoring")
def get_fine_monitoring(
    months: int = 6,
    recent_limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    if months < 1:
        months = 1
    if months > 24:
        months = 24

    if recent_limit < 1:
        recent_limit = 1
    if recent_limit > 50:
        recent_limit = 50

    now = datetime.utcnow()

    # --------------------------------------------------
    # OVERALL FINE SUMMARY
    # --------------------------------------------------

    total_generated = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(Issue.fine_amount > 0)
        .scalar()
    )

    total_collected = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .scalar()
    )

    total_outstanding = (
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .scalar()
    )

    total_fine_cases = (
        db.query(Issue)
        .filter(Issue.fine_amount > 0)
        .count()
    )

    paid_cases = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .count()
    )

    unpaid_cases = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .count()
    )

    total_generated = float(total_generated or 0)
    total_collected = float(total_collected or 0)
    total_outstanding = float(total_outstanding or 0)

    collection_percentage = (
        round(
            (total_collected / total_generated) * 100,
            2
        )
        if total_generated > 0
        else 0.0
    )

    outstanding_percentage = (
        round(
            (total_outstanding / total_generated) * 100,
            2
        )
        if total_generated > 0
        else 0.0
    )

    # --------------------------------------------------
    # CURRENT OVERDUE EXPOSURE
    # --------------------------------------------------

    overdue_rows = (
        db.query(
            Issue,
            User.username,
            User.full_name,
            User.email,
            Book.title
        )
        .join(
            User,
            User.id == Issue.user_id
        )
        .join(
            Book,
            Book.id == Issue.book_id
        )
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date.isnot(None),
            Issue.due_date < now
        )
        .order_by(
            Issue.due_date.asc(),
            Issue.id.asc()
        )
        .all()
    )

    current_overdue_exposure = []
    estimated_future_fines = 0.0

    for issue, username, full_name, email, title in overdue_rows:
        overdue_seconds = max(
            0,
            (now - issue.due_date).total_seconds()
        )

        overdue_days = max(
            1,
            int(
                (overdue_seconds + 86399) // 86400
            )
        )

        estimated_fine = float(overdue_days * 5)
        estimated_future_fines += estimated_fine

        current_overdue_exposure.append(
            {
                "issue_id": issue.id,
                "user_id": issue.user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "book_id": issue.book_id,
                "book_title": title,
                "due_date": issue.due_date,
                "overdue_days": overdue_days,
                "estimated_fine": estimated_fine,
                "recorded_fine": float(
                    issue.fine_amount or 0
                ),
                "fine_status": issue.fine_status,
            }
        )

    # --------------------------------------------------
    # MEMBERS WITH HIGHEST UNPAID FINES
    # --------------------------------------------------

    unpaid_member_rows = (
        db.query(
            User.id.label("user_id"),
            User.username.label("username"),
            User.full_name.label("full_name"),
            User.email.label("email"),
            func.count(Issue.id).label("unpaid_cases"),
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            ).label("outstanding_amount")
        )
        .join(
            Issue,
            Issue.user_id == User.id
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .group_by(
            User.id,
            User.username,
            User.full_name,
            User.email
        )
        .order_by(
            func.sum(Issue.fine_amount).desc(),
            User.id.asc()
        )
        .limit(10)
        .all()
    )

    highest_unpaid_members = [
        {
            "user_id": row.user_id,
            "username": row.username,
            "full_name": row.full_name,
            "email": row.email,
            "unpaid_cases": int(
                row.unpaid_cases or 0
            ),
            "outstanding_amount": float(
                row.outstanding_amount or 0
            ),
        }
        for row in unpaid_member_rows
    ]

    # --------------------------------------------------
    # RECENT FINE PAYMENTS
    # --------------------------------------------------

    recent_payment_rows = (
        db.query(
            Issue,
            User.username,
            User.full_name,
            User.email,
            Book.title
        )
        .join(
            User,
            User.id == Issue.user_id
        )
        .join(
            Book,
            Book.id == Issue.book_id
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID",
            Issue.fine_paid_at.isnot(None)
        )
        .order_by(
            Issue.fine_paid_at.desc(),
            Issue.id.desc()
        )
        .limit(recent_limit)
        .all()
    )

    recent_payments = [
        {
            "issue_id": issue.id,
            "user_id": issue.user_id,
            "username": username,
            "full_name": full_name,
            "email": email,
            "book_id": issue.book_id,
            "book_title": title,
            "amount": float(
                issue.fine_amount or 0
            ),
            "paid_at": issue.fine_paid_at,
        }
        for (
            issue,
            username,
            full_name,
            email,
            title
        ) in recent_payment_rows
    ]

    # --------------------------------------------------
    # MONTHLY COLLECTION TRENDS
    # --------------------------------------------------

    month_list = []
    year = now.year
    month = now.month

    for _ in range(months):
        month_list.append((year, month))
        month -= 1

        if month == 0:
            month = 12
            year -= 1

    month_list.reverse()
    monthly_trends = []

    for year, month in month_list:
        month_start = datetime(
            year,
            month,
            1
        )

        if month == 12:
            next_month = datetime(
                year + 1,
                1,
                1
            )
        else:
            next_month = datetime(
                year,
                month + 1,
                1
            )

        collected_amount = (
            db.query(
                func.coalesce(
                    func.sum(Issue.fine_amount),
                    0
                )
            )
            .filter(
                Issue.fine_amount > 0,
                Issue.fine_status == "PAID",
                Issue.fine_paid_at.isnot(None),
                Issue.fine_paid_at >= month_start,
                Issue.fine_paid_at < next_month
            )
            .scalar()
        )

        payment_cases = (
            db.query(Issue)
            .filter(
                Issue.fine_amount > 0,
                Issue.fine_status == "PAID",
                Issue.fine_paid_at.isnot(None),
                Issue.fine_paid_at >= month_start,
                Issue.fine_paid_at < next_month
            )
            .count()
        )

        generated_amount = (
            db.query(
                func.coalesce(
                    func.sum(Issue.fine_amount),
                    0
                )
            )
            .filter(
                Issue.fine_amount > 0,
                Issue.return_date.isnot(None),
                Issue.return_date >= month_start,
                Issue.return_date < next_month
            )
            .scalar()
        )

        generated_cases = (
            db.query(Issue)
            .filter(
                Issue.fine_amount > 0,
                Issue.return_date.isnot(None),
                Issue.return_date >= month_start,
                Issue.return_date < next_month
            )
            .count()
        )

        monthly_trends.append(
            {
                "month": f"{year}-{month:02d}",
                "generated_amount": float(
                    generated_amount or 0
                ),
                "generated_cases": generated_cases,
                "collected_amount": float(
                    collected_amount or 0
                ),
                "payment_cases": payment_cases,
            }
        )

    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return {
        "policy": {
            "fine_per_overdue_day": 5,
            "trend_months": months,
        },
        "summary": {
            "total_fines_generated": round(
                total_generated,
                2
            ),
            "total_collected": round(
                total_collected,
                2
            ),
            "total_outstanding": round(
                total_outstanding,
                2
            ),
            "total_fine_cases":
                total_fine_cases,
            "paid_cases": paid_cases,
            "unpaid_cases": unpaid_cases,
            "collection_percentage":
                collection_percentage,
            "outstanding_percentage":
                outstanding_percentage,
            "currently_overdue_issues":
                len(current_overdue_exposure),
            "estimated_current_overdue_exposure":
                round(
                    estimated_future_fines,
                    2
                ),
        },
        "highest_unpaid_members":
            highest_unpaid_members,
        "recent_payments":
            recent_payments,
        "current_overdue_exposure":
            current_overdue_exposure,
        "monthly_trends":
            monthly_trends,
    }

# --------------------------------------------------
# BORROWING & CIRCULATION PERFORMANCE MONITORING
# ADMIN ONLY
#
# Provides:
# - total issues / returns / currently issued
# - return, overdue, and renewal performance
# - average completed borrowing duration
# - most-circulated books
# - most-active borrowing members
# - monthly issue / return / renewal trends
# --------------------------------------------------

@router.get("/circulation-monitoring")
def get_circulation_monitoring(
    months: int = 6,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    if months < 1:
        months = 1
    if months > 24:
        months = 24

    if limit < 1:
        limit = 1
    if limit > 50:
        limit = 50

    now = datetime.utcnow()

    total_issues = db.query(Issue).count()

    returned_issues = (
        db.query(Issue)
        .filter(
            Issue.status == "RETURNED",
            Issue.return_date.isnot(None)
        )
        .count()
    )

    currently_issued = (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .count()
    )

    currently_overdue = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date.isnot(None),
            Issue.due_date < now
        )
        .count()
    )

    renewed_issues = (
        db.query(Issue)
        .filter(Issue.renewal_count > 0)
        .count()
    )

    total_renewals = (
        db.query(
            func.coalesce(
                func.sum(Issue.renewal_count),
                0
            )
        )
        .scalar()
    )

    total_renewals = int(total_renewals or 0)

    return_rate = (
        round(
            (returned_issues / total_issues) * 100,
            2
        )
        if total_issues > 0
        else 0.0
    )

    overdue_rate = (
        round(
            (currently_overdue / currently_issued) * 100,
            2
        )
        if currently_issued > 0
        else 0.0
    )

    renewal_usage_rate = (
        round(
            (renewed_issues / total_issues) * 100,
            2
        )
        if total_issues > 0
        else 0.0
    )

    completed_rows = (
        db.query(Issue.issue_date, Issue.return_date)
        .filter(
            Issue.return_date.isnot(None),
            Issue.issue_date.isnot(None)
        )
        .all()
    )

    borrowing_durations = []

    for issue_date, return_date in completed_rows:
        if not issue_date or not return_date:
            continue

        # PostgreSQL timestamps may be timezone-aware while some
        # historical values may be naive. Normalize only for subtraction.
        if (
            getattr(issue_date, "tzinfo", None) is not None
            and getattr(return_date, "tzinfo", None) is None
        ):
            return_date = return_date.replace(
                tzinfo=issue_date.tzinfo
            )
        elif (
            getattr(issue_date, "tzinfo", None) is None
            and getattr(return_date, "tzinfo", None) is not None
        ):
            issue_date = issue_date.replace(
                tzinfo=return_date.tzinfo
            )

        duration_seconds = (
            return_date - issue_date
        ).total_seconds()

        if duration_seconds >= 0:
            borrowing_durations.append(
                duration_seconds / 86400
            )

    average_borrowing_days = (
        round(
            sum(borrowing_durations)
            / len(borrowing_durations),
            2
        )
        if borrowing_durations
        else 0.0
    )

    # --------------------------------------------------
    # MOST-CIRCULATED BOOKS
    # --------------------------------------------------

    top_book_rows = (
        db.query(
            Book.id.label("book_id"),
            Book.title.label("title"),
            func.count(Issue.id).label("issue_count"),
            func.sum(
                case(
                    (
                        Issue.status == "RETURNED",
                        1
                    ),
                    else_=0
                )
            ).label("return_count"),
            func.sum(
                case(
                    (
                        Issue.status == "ISSUED",
                        1
                    ),
                    else_=0
                )
            ).label("currently_issued"),
            func.coalesce(
                func.sum(Issue.renewal_count),
                0
            ).label("renewal_count")
        )
        .join(
            Issue,
            Issue.book_id == Book.id
        )
        .group_by(
            Book.id,
            Book.title
        )
        .order_by(
            func.count(Issue.id).desc(),
            Book.title.asc()
        )
        .limit(limit)
        .all()
    )

    top_books = [
        {
            "book_id": row.book_id,
            "title": row.title,
            "issue_count": int(
                row.issue_count or 0
            ),
            "return_count": int(
                row.return_count or 0
            ),
            "currently_issued": int(
                row.currently_issued or 0
            ),
            "renewal_count": int(
                row.renewal_count or 0
            ),
        }
        for row in top_book_rows
    ]

    # --------------------------------------------------
    # MOST-ACTIVE MEMBERS
    # --------------------------------------------------

    top_member_rows = (
        db.query(
            User.id.label("user_id"),
            User.username.label("username"),
            User.full_name.label("full_name"),
            User.email.label("email"),
            func.count(Issue.id).label("issue_count"),
            func.sum(
                case(
                    (
                        Issue.status == "RETURNED",
                        1
                    ),
                    else_=0
                )
            ).label("return_count"),
            func.sum(
                case(
                    (
                        Issue.status == "ISSUED",
                        1
                    ),
                    else_=0
                )
            ).label("currently_issued"),
            func.coalesce(
                func.sum(Issue.renewal_count),
                0
            ).label("renewal_count")
        )
        .join(
            Issue,
            Issue.user_id == User.id
        )
        .join(
            Role,
            Role.id == User.role_id
        )
        .filter(Role.name == "MEMBER")
        .group_by(
            User.id,
            User.username,
            User.full_name,
            User.email
        )
        .order_by(
            func.count(Issue.id).desc(),
            User.id.asc()
        )
        .limit(limit)
        .all()
    )

    top_members = [
        {
            "user_id": row.user_id,
            "username": row.username,
            "full_name": row.full_name,
            "email": row.email,
            "issue_count": int(
                row.issue_count or 0
            ),
            "return_count": int(
                row.return_count or 0
            ),
            "currently_issued": int(
                row.currently_issued or 0
            ),
            "renewal_count": int(
                row.renewal_count or 0
            ),
        }
        for row in top_member_rows
    ]

    # --------------------------------------------------
    # MONTHLY CIRCULATION TRENDS
    # --------------------------------------------------

    month_list = []
    year = now.year
    month = now.month

    for _ in range(months):
        month_list.append((year, month))
        month -= 1

        if month == 0:
            month = 12
            year -= 1

    month_list.reverse()
    monthly_trends = []

    for year, month in month_list:
        month_start = datetime(
            year,
            month,
            1
        )

        if month == 12:
            next_month = datetime(
                year + 1,
                1,
                1
            )
        else:
            next_month = datetime(
                year,
                month + 1,
                1
            )

        issues_count = (
            db.query(Issue)
            .filter(
                Issue.issue_date >= month_start,
                Issue.issue_date < next_month
            )
            .count()
        )

        returns_count = (
            db.query(Issue)
            .filter(
                Issue.return_date.isnot(None),
                Issue.return_date >= month_start,
                Issue.return_date < next_month
            )
            .count()
        )

        renewal_transactions = (
            db.query(
                func.coalesce(
                    func.sum(Issue.renewal_count),
                    0
                )
            )
            .filter(
                Issue.issue_date >= month_start,
                Issue.issue_date < next_month
            )
            .scalar()
        )

        monthly_trends.append(
            {
                "month": f"{year}-{month:02d}",
                "issues": issues_count,
                "returns": returns_count,
                "renewals": int(
                    renewal_transactions or 0
                ),
            }
        )

    return {
        "policy": {
            "trend_months": months,
            "ranking_limit": limit,
        },
        "summary": {
            "total_issues": total_issues,
            "returned_issues": returned_issues,
            "currently_issued": currently_issued,
            "currently_overdue": currently_overdue,
            "return_rate_percentage": return_rate,
            "overdue_rate_percentage": overdue_rate,
            "renewed_issue_records": renewed_issues,
            "total_renewals": total_renewals,
            "renewal_usage_rate_percentage":
                renewal_usage_rate,
            "average_completed_borrowing_days":
                average_borrowing_days,
        },
        "top_circulated_books": top_books,
        "most_active_members": top_members,
        "monthly_trends": monthly_trends,
    }

# --------------------------------------------------
# BOOK ACQUISITION & COLLECTION DEVELOPMENT MONITORING
# ADMIN ONLY
#
# Provides:
# - circulation and reservation demand by active title
# - stock pressure and utilization
# - high-demand / low-stock / underutilized title counts
# - acquisition recommendations for additional copies
# --------------------------------------------------

@router.get("/collection-development-monitoring")
def get_collection_development_monitoring(
    recent_months: int = 6,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    if recent_months < 1:
        recent_months = 1
    if recent_months > 24:
        recent_months = 24

    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100

    now = datetime.utcnow()

    # Build a month-aligned lookback without introducing an
    # additional date library dependency.
    lookback_year = now.year
    lookback_month = now.month - (recent_months - 1)

    while lookback_month <= 0:
        lookback_month += 12
        lookback_year -= 1

    period_start = datetime(
        lookback_year,
        lookback_month,
        1
    )

    books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .order_by(
            Book.title.asc(),
            Book.id.asc()
        )
        .all()
    )

    all_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .group_by(Issue.book_id)
        .all()
    )

    recent_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.issue_date >= period_start
        )
        .group_by(Issue.book_id)
        .all()
    )

    current_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.status == "ISSUED"
        )
        .group_by(Issue.book_id)
        .all()
    )

    active_reservation_counts = dict(
        db.query(
            Reservation.book_id,
            func.count(Reservation.id)
        )
        .filter(
            Reservation.status == "ACTIVE"
        )
        .group_by(Reservation.book_id)
        .all()
    )

    ready_reservation_counts = dict(
        db.query(
            Reservation.book_id,
            func.count(Reservation.id)
        )
        .filter(
            Reservation.status == "READY"
        )
        .group_by(Reservation.book_id)
        .all()
    )

    rating_rows = (
        db.query(
            BookRating.book_id,
            func.avg(BookRating.rating),
            func.count(BookRating.id)
        )
        .group_by(BookRating.book_id)
        .all()
    )

    rating_stats = {
        book_id: {
            "average_rating": round(
                float(average_rating or 0),
                2
            ),
            "rating_count": int(rating_count or 0),
        }
        for (
            book_id,
            average_rating,
            rating_count
        ) in rating_rows
    }

    collection = []

    high_demand_titles = 0
    low_stock_titles = 0
    out_of_stock_titles = 0
    underutilized_titles = 0
    titles_recommended_for_additional_copies = 0
    total_recommended_additional_copies = 0

    for book in books:
        total_copies = int(book.total_copies or 0)
        available_copies = int(
            book.available_copies or 0
        )
        currently_issued = int(
            current_issue_counts.get(book.id, 0)
        )
        recent_borrows = int(
            recent_issue_counts.get(book.id, 0)
        )
        lifetime_borrows = int(
            all_issue_counts.get(book.id, 0)
        )
        active_queue = int(
            active_reservation_counts.get(
                book.id,
                0
            )
        )
        ready_for_pickup = int(
            ready_reservation_counts.get(
                book.id,
                0
            )
        )
        current_reservation_demand = (
            active_queue + ready_for_pickup
        )

        if available_copies <= 0:
            stock_status = "OUT_OF_STOCK"
            out_of_stock_titles += 1
        elif available_copies <= 2:
            stock_status = "LOW_STOCK"
            low_stock_titles += 1
        else:
            stock_status = "IN_STOCK"

        current_utilization_percentage = (
            round(
                (
                    currently_issued
                    / total_copies
                ) * 100,
                2
            )
            if total_copies > 0
            else 0.0
        )

        # Demand score intentionally combines recent circulation
        # with stronger weight for users currently waiting.
        demand_score = (
            recent_borrows
            + (active_queue * 3)
            + (ready_for_pickup * 2)
        )

        if (
            active_queue >= 3
            or (
                current_reservation_demand > 0
                and available_copies <= 0
            )
            or (
                recent_borrows >= 5
                and current_utilization_percentage >= 80
            )
        ):
            demand_level = "HIGH"
            high_demand_titles += 1
        elif (
            active_queue > 0
            or ready_for_pickup > 0
            or recent_borrows >= 2
            or current_utilization_percentage >= 50
        ):
            demand_level = "MEDIUM"
        else:
            demand_level = "LOW"

        underutilized = (
            lifetime_borrows == 0
            and current_reservation_demand == 0
        )

        if underutilized:
            underutilized_titles += 1

        recommended_additional_copies = 0
        recommendation = "NO_ACTION"
        recommendation_reasons = []

        if active_queue > 0:
            recommendation_reasons.append(
                "ACTIVE_RESERVATION_QUEUE"
            )

        if available_copies <= 0:
            recommendation_reasons.append(
                "OUT_OF_STOCK"
            )
        elif available_copies <= 2:
            recommendation_reasons.append(
                "LOW_STOCK"
            )

        if (
            recent_borrows >= 5
            and current_utilization_percentage >= 80
        ):
            recommendation_reasons.append(
                "HIGH_RECENT_CIRCULATION"
            )

        if demand_level == "HIGH":
            recommendation = "ADD_COPIES"

            # One extra copy per two waiting users, with at least
            # one additional copy for a HIGH-demand title.
            queue_based_copies = (
                (active_queue + 1) // 2
            )

            recommended_additional_copies = max(
                1,
                queue_based_copies
            )

            if available_copies <= 0:
                recommended_additional_copies = max(
                    recommended_additional_copies,
                    1
                )

        elif (
            demand_level == "MEDIUM"
            and (
                current_reservation_demand > 0
                or available_copies <= 2
            )
        ):
            recommendation = "MONITOR_DEMAND"

        if underutilized:
            recommendation = "REVIEW_UTILIZATION"
            recommended_additional_copies = 0
            recommendation_reasons = [
                "NO_RECORDED_BORROWING_OR_RESERVATION_DEMAND"
            ]

        if recommendation == "ADD_COPIES":
            titles_recommended_for_additional_copies += 1
            total_recommended_additional_copies += (
                recommended_additional_copies
            )

        rating_info = rating_stats.get(
            book.id,
            {
                "average_rating": 0.0,
                "rating_count": 0,
            }
        )

        collection.append(
            {
                "book_id": book.id,
                "title": book.title,
                "total_copies": total_copies,
                "available_copies": available_copies,
                "currently_issued": currently_issued,
                "stock_status": stock_status,
                "current_utilization_percentage":
                    current_utilization_percentage,
                "recent_borrows": recent_borrows,
                "lifetime_borrows": lifetime_borrows,
                "active_reservation_queue":
                    active_queue,
                "ready_for_pickup":
                    ready_for_pickup,
                "current_reservation_demand":
                    current_reservation_demand,
                "demand_score": demand_score,
                "demand_level": demand_level,
                "average_rating":
                    rating_info["average_rating"],
                "rating_count":
                    rating_info["rating_count"],
                "underutilized": underutilized,
                "recommendation": recommendation,
                "recommended_additional_copies":
                    recommended_additional_copies,
                "recommendation_reasons":
                    recommendation_reasons,
            }
        )

    recommendation_order = {
        "ADD_COPIES": 0,
        "MONITOR_DEMAND": 1,
        "REVIEW_UTILIZATION": 2,
        "NO_ACTION": 3,
    }

    collection.sort(
        key=lambda item: (
            recommendation_order.get(
                item["recommendation"],
                4
            ),
            -item["demand_score"],
            -item["recent_borrows"],
            item["title"].lower(),
            item["book_id"],
        )
    )

    acquisition_recommendations = [
        item
        for item in collection
        if item["recommendation"] == "ADD_COPIES"
    ][:limit]

    monitor_recommendations = [
        item
        for item in collection
        if item["recommendation"] == "MONITOR_DEMAND"
    ][:limit]

    underutilized_books = [
        item
        for item in collection
        if item["underutilized"]
    ][:limit]

    return {
        "policy": {
            "recent_months": recent_months,
            "period_start": period_start,
            "low_stock_available_copies_threshold": 2,
            "high_demand_active_queue_threshold": 3,
            "high_recent_circulation_threshold": 5,
            "high_utilization_threshold_percentage": 80,
            "recommendation_limit": limit,
        },
        "summary": {
            "active_titles_analyzed": len(books),
            "high_demand_titles": high_demand_titles,
            "low_stock_titles": low_stock_titles,
            "out_of_stock_titles": out_of_stock_titles,
            "underutilized_titles": underutilized_titles,
            "titles_recommended_for_additional_copies":
                titles_recommended_for_additional_copies,
            "total_recommended_additional_copies":
                total_recommended_additional_copies,
        },
        "acquisition_recommendations":
            acquisition_recommendations,
        "monitor_recommendations":
            monitor_recommendations,
        "underutilized_books":
            underutilized_books,
        "collection": collection,
    }

# --------------------------------------------------
# LIBRARY KPI & EXECUTIVE PERFORMANCE DASHBOARD
# ADMIN ONLY
#
# Consolidates management-level KPIs across:
# - circulation and returns
# - overdue exposure and fines
# - reservations
# - inventory and collection development
# - member borrowing risk
# - security and operational health
# --------------------------------------------------

@router.get("/executive-dashboard")
def get_executive_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("ADMIN")
    )
):
    now = datetime.utcnow()

    # --------------------------------------------------
    # MEMBERS
    # --------------------------------------------------

    members = (
        db.query(User)
        .join(Role)
        .filter(Role.name == "MEMBER")
        .all()
    )

    total_members = len(members)
    inactive_members = sum(
        1 for member in members
        if not member.is_active
    )

    currently_locked_accounts = (
        db.query(User)
        .filter(
            User.locked_until.isnot(None),
            User.locked_until > now
        )
        .count()
    )

    # --------------------------------------------------
    # CIRCULATION
    # --------------------------------------------------

    total_issues = db.query(Issue).count()

    returned_issues = (
        db.query(Issue)
        .filter(Issue.status == "RETURNED")
        .count()
    )

    currently_issued = (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .count()
    )

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )

    return_rate_percentage = (
        round(
            (returned_issues / total_issues) * 100,
            2
        )
        if total_issues > 0
        else 0.0
    )

    overdue_rate_percentage = (
        round(
            (overdue_books / currently_issued) * 100,
            2
        )
        if currently_issued > 0
        else 0.0
    )

    # --------------------------------------------------
    # FINES
    # --------------------------------------------------

    total_fines_generated = float(
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(Issue.fine_amount > 0)
        .scalar()
        or 0
    )

    total_fines_collected = float(
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .scalar()
        or 0
    )

    outstanding_fines = float(
        db.query(
            func.coalesce(
                func.sum(Issue.fine_amount),
                0
            )
        )
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .scalar()
        or 0
    )

    unpaid_fine_cases = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status != "PAID"
        )
        .count()
    )

    fine_collection_percentage = (
        round(
            (
                total_fines_collected
                / total_fines_generated
            ) * 100,
            2
        )
        if total_fines_generated > 0
        else 100.0
    )

    # --------------------------------------------------
    # RESERVATIONS
    # --------------------------------------------------

    active_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "ACTIVE")
        .count()
    )

    ready_for_pickup = (
        db.query(Reservation)
        .filter(Reservation.status == "READY")
        .count()
    )

    expired_ready_waiting = (
        db.query(Reservation)
        .filter(
            Reservation.status == "READY",
            Reservation.ready_until.isnot(None),
            Reservation.ready_until < now
        )
        .count()
    )

    reservation_queue_rows = (
        db.query(
            Reservation.book_id,
            func.count(Reservation.id)
        )
        .filter(Reservation.status == "ACTIVE")
        .group_by(Reservation.book_id)
        .all()
    )

    longest_active_queue = max(
        (
            int(count or 0)
            for _, count in reservation_queue_rows
        ),
        default=0
    )

    # --------------------------------------------------
    # INVENTORY
    # --------------------------------------------------

    active_books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .all()
    )

    active_titles = len(active_books)
    total_copies = 0
    available_copies = 0
    low_stock_titles = 0
    out_of_stock_titles = 0
    negative_stock_titles = 0
    copy_count_mismatches = 0

    active_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(Issue.status == "ISSUED")
        .group_by(Issue.book_id)
        .all()
    )

    for book in active_books:
        total = int(book.total_copies or 0)
        available = int(book.available_copies or 0)
        issued = int(
            active_issue_counts.get(book.id, 0)
        )

        total_copies += total
        available_copies += available

        if available < 0:
            negative_stock_titles += 1

        if available <= 0:
            out_of_stock_titles += 1
        elif available <= 2:
            low_stock_titles += 1

        # Count each affected title once for executive reporting.
        if (
            available > total
            or available + issued != total
        ):
            copy_count_mismatches += 1

    inventory_utilization_percentage = (
        round(
            (
                (total_copies - available_copies)
                / total_copies
            ) * 100,
            2
        )
        if total_copies > 0
        else 0.0
    )

    # --------------------------------------------------
    # MEMBER BORROWING RISK
    # --------------------------------------------------

    overdue_member_ids = {
        user_id
        for (user_id,) in (
            db.query(Issue.user_id)
            .filter(
                Issue.status == "ISSUED",
                Issue.due_date < now
            )
            .distinct()
            .all()
        )
    }

    unpaid_fine_member_ids = {
        user_id
        for (user_id,) in (
            db.query(Issue.user_id)
            .filter(
                Issue.fine_amount > 0,
                Issue.fine_status != "PAID"
            )
            .distinct()
            .all()
        )
    }

    active_issue_counts_by_member = dict(
        db.query(
            Issue.user_id,
            func.count(Issue.id)
        )
        .filter(Issue.status == "ISSUED")
        .group_by(Issue.user_id)
        .all()
    )

    blocked_members = 0
    high_risk_members = 0

    for member in members:
        active_count = int(
            active_issue_counts_by_member.get(
                member.id,
                0
            )
        )

        blocking_count = 0

        if not member.is_active:
            blocking_count += 1
        if member.id in overdue_member_ids:
            blocking_count += 1
        if member.id in unpaid_fine_member_ids:
            blocking_count += 1
        if active_count >= 3:
            blocking_count += 1

        if blocking_count > 0:
            blocked_members += 1

        if (
            not member.is_active
            or member.id in overdue_member_ids
            or blocking_count >= 2
        ):
            high_risk_members += 1

    eligible_members = max(
        0,
        total_members - blocked_members
    )

    # --------------------------------------------------
    # COLLECTION DEVELOPMENT
    # --------------------------------------------------

    recent_period_start = (
        now - timedelta(days=180)
    )

    recent_issue_counts = dict(
        db.query(
            Issue.book_id,
            func.count(Issue.id)
        )
        .filter(
            Issue.issue_date >= recent_period_start
        )
        .group_by(Issue.book_id)
        .all()
    )

    active_reservation_counts = dict(
        db.query(
            Reservation.book_id,
            func.count(Reservation.id)
        )
        .filter(
            Reservation.status == "ACTIVE"
        )
        .group_by(Reservation.book_id)
        .all()
    )

    high_demand_titles = 0
    titles_recommended_for_additional_copies = 0
    total_recommended_additional_copies = 0

    for book in active_books:
        total = int(book.total_copies or 0)
        available = int(book.available_copies or 0)
        issued = int(
            active_issue_counts.get(book.id, 0)
        )
        recent_borrows = int(
            recent_issue_counts.get(book.id, 0)
        )
        active_queue = int(
            active_reservation_counts.get(
                book.id,
                0
            )
        )

        utilization = (
            (issued / total) * 100
            if total > 0
            else 0.0
        )

        high_demand = (
            active_queue >= 3
            or (
                active_queue > 0
                and available <= 0
            )
            or (
                recent_borrows >= 5
                and utilization >= 80
            )
        )

        if high_demand:
            high_demand_titles += 1
            titles_recommended_for_additional_copies += 1

            queue_based_copies = (
                (active_queue + 1) // 2
            )

            total_recommended_additional_copies += max(
                1,
                queue_based_copies
            )

    # --------------------------------------------------
    # SECURITY / NOTIFICATION / DATA HEALTH
    # --------------------------------------------------

    unread_notifications = (
        db.query(Notification)
        .filter(Notification.is_read == False)
        .count()
    )

    issued_without_due_date = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date.is_(None)
        )
        .count()
    )

    returned_without_return_date = (
        db.query(Issue)
        .filter(
            Issue.status == "RETURNED",
            Issue.return_date.is_(None)
        )
        .count()
    )

    active_reservations_for_inactive_books = (
        db.query(Reservation)
        .join(
            Book,
            Book.id == Reservation.book_id
        )
        .filter(
            Reservation.status.in_(
                ["ACTIVE", "READY"]
            ),
            Book.is_active == False
        )
        .count()
    )

    data_consistency_issues = (
        issued_without_due_date
        + returned_without_return_date
        + active_reservations_for_inactive_books
        + negative_stock_titles
        + copy_count_mismatches
    )

    # --------------------------------------------------
    # KPI STATUS RULES
    # --------------------------------------------------

    kpis = []

    def add_kpi(
        code,
        label,
        value,
        unit,
        status,
        message
    ):
        kpis.append(
            {
                "code": code,
                "label": label,
                "value": value,
                "unit": unit,
                "status": status,
                "message": message,
            }
        )

    return_status = (
        "GOOD"
        if return_rate_percentage >= 80
        else (
            "ATTENTION"
            if return_rate_percentage >= 60
            else "CRITICAL"
        )
    )
    add_kpi(
        "RETURN_RATE",
        "Return Rate",
        return_rate_percentage,
        "PERCENT",
        return_status,
        "Percentage of all issue records that have been returned."
    )

    overdue_status = (
        "GOOD"
        if overdue_books == 0
        else (
            "ATTENTION"
            if overdue_rate_percentage <= 10
            else "CRITICAL"
        )
    )
    add_kpi(
        "OVERDUE_RATE",
        "Overdue Rate",
        overdue_rate_percentage,
        "PERCENT",
        overdue_status,
        "Current overdue issues as a share of currently issued books."
    )

    fine_status = (
        "GOOD"
        if outstanding_fines <= 0
        else (
            "ATTENTION"
            if fine_collection_percentage >= 75
            else "CRITICAL"
        )
    )
    add_kpi(
        "FINE_COLLECTION",
        "Fine Collection",
        fine_collection_percentage,
        "PERCENT",
        fine_status,
        "Share of generated fines that has been collected."
    )

    reservation_status = (
        "GOOD"
        if longest_active_queue == 0
        else (
            "ATTENTION"
            if longest_active_queue < 3
            else "CRITICAL"
        )
    )
    add_kpi(
        "RESERVATION_PRESSURE",
        "Reservation Pressure",
        longest_active_queue,
        "BOOKS_WAITING",
        reservation_status,
        "Longest current ACTIVE reservation queue for a title."
    )

    inventory_status = (
        "CRITICAL"
        if out_of_stock_titles > 0
        else (
            "ATTENTION"
            if low_stock_titles > 0
            else "GOOD"
        )
    )
    add_kpi(
        "INVENTORY_HEALTH",
        "Inventory Health",
        out_of_stock_titles,
        "OUT_OF_STOCK_TITLES",
        inventory_status,
        "Active titles currently out of stock."
    )

    member_status = (
        "GOOD"
        if high_risk_members == 0
        else (
            "ATTENTION"
            if high_risk_members <= max(
                1,
                total_members // 10
            )
            else "CRITICAL"
        )
    )
    add_kpi(
        "MEMBER_RISK",
        "Member Risk",
        high_risk_members,
        "HIGH_RISK_MEMBERS",
        member_status,
        "Members with high current borrowing risk."
    )

    collection_status = (
        "GOOD"
        if high_demand_titles == 0
        else (
            "ATTENTION"
            if high_demand_titles <= 2
            else "CRITICAL"
        )
    )
    add_kpi(
        "COLLECTION_DEVELOPMENT",
        "Collection Development",
        high_demand_titles,
        "HIGH_DEMAND_TITLES",
        collection_status,
        "High-demand titles requiring acquisition attention."
    )

    security_status = (
        "CRITICAL"
        if currently_locked_accounts > 0
        else "GOOD"
    )
    add_kpi(
        "SECURITY",
        "Security",
        currently_locked_accounts,
        "LOCKED_ACCOUNTS",
        security_status,
        "User accounts currently locked."
    )

    data_status = (
        "GOOD"
        if data_consistency_issues == 0
        else "CRITICAL"
    )
    add_kpi(
        "DATA_HEALTH",
        "Data Health",
        data_consistency_issues,
        "ISSUES",
        data_status,
        "Detected operational data consistency issues."
    )

    status_counts = {
        "GOOD": sum(
            1 for item in kpis
            if item["status"] == "GOOD"
        ),
        "ATTENTION": sum(
            1 for item in kpis
            if item["status"] == "ATTENTION"
        ),
        "CRITICAL": sum(
            1 for item in kpis
            if item["status"] == "CRITICAL"
        ),
    }

    if status_counts["CRITICAL"] > 0:
        overall_status = "CRITICAL"
    elif status_counts["ATTENTION"] > 0:
        overall_status = "ATTENTION"
    else:
        overall_status = "GOOD"

    # --------------------------------------------------
    # MANAGEMENT PRIORITIES
    # --------------------------------------------------

    priority_actions = []

    if overdue_books > 0:
        priority_actions.append(
            {
                "priority": "HIGH",
                "area": "CIRCULATION",
                "message":
                    f"Follow up on {overdue_books} overdue book(s).",
            }
        )

    if outstanding_fines > 0:
        priority_actions.append(
            {
                "priority": "MEDIUM",
                "area": "FINES",
                "message":
                    f"₹{outstanding_fines:.2f} in fines remains outstanding.",
            }
        )

    if out_of_stock_titles > 0:
        priority_actions.append(
            {
                "priority": "HIGH",
                "area": "INVENTORY",
                "message":
                    f"{out_of_stock_titles} active title(s) are out of stock.",
            }
        )

    if titles_recommended_for_additional_copies > 0:
        priority_actions.append(
            {
                "priority": "MEDIUM",
                "area": "COLLECTION_DEVELOPMENT",
                "message":
                    f"Review acquisition of {total_recommended_additional_copies} additional copy/copies across {titles_recommended_for_additional_copies} title(s).",
            }
        )

    if high_risk_members > 0:
        priority_actions.append(
            {
                "priority": "HIGH",
                "area": "MEMBER_RISK",
                "message":
                    f"{high_risk_members} member(s) are currently classified as high risk.",
            }
        )

    if currently_locked_accounts > 0:
        priority_actions.append(
            {
                "priority": "HIGH",
                "area": "SECURITY",
                "message":
                    f"{currently_locked_accounts} account(s) are currently locked.",
            }
        )

    if data_consistency_issues > 0:
        priority_actions.append(
            {
                "priority": "HIGH",
                "area": "DATA_HEALTH",
                "message":
                    f"{data_consistency_issues} data consistency issue(s) require review.",
            }
        )

    if not priority_actions:
        priority_actions.append(
            {
                "priority": "LOW",
                "area": "OPERATIONS",
                "message":
                    "No immediate executive intervention is required.",
            }
        )

    priority_rank = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
    }

    priority_actions.sort(
        key=lambda item: priority_rank.get(
            item["priority"],
            3
        )
    )

    return {
        "overall_status": overall_status,
        "generated_at": now,
        "status_counts": status_counts,
        "executive_summary": {
            "total_members": total_members,
            "eligible_members": eligible_members,
            "blocked_members": blocked_members,
            "high_risk_members": high_risk_members,
            "active_titles": active_titles,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "inventory_utilization_percentage":
                inventory_utilization_percentage,
            "total_issues": total_issues,
            "returned_issues": returned_issues,
            "currently_issued": currently_issued,
            "overdue_books": overdue_books,
            "return_rate_percentage":
                return_rate_percentage,
            "overdue_rate_percentage":
                overdue_rate_percentage,
            "active_reservations":
                active_reservations,
            "ready_for_pickup":
                ready_for_pickup,
            "longest_active_queue":
                longest_active_queue,
            "total_fines_generated":
                round(total_fines_generated, 2),
            "total_fines_collected":
                round(total_fines_collected, 2),
            "outstanding_fines":
                round(outstanding_fines, 2),
            "fine_collection_percentage":
                fine_collection_percentage,
            "low_stock_titles":
                low_stock_titles,
            "out_of_stock_titles":
                out_of_stock_titles,
            "high_demand_titles":
                high_demand_titles,
            "titles_recommended_for_additional_copies":
                titles_recommended_for_additional_copies,
            "total_recommended_additional_copies":
                total_recommended_additional_copies,
            "currently_locked_accounts":
                currently_locked_accounts,
            "unread_notifications":
                unread_notifications,
            "data_consistency_issues":
                data_consistency_issues,
        },
        "kpis": kpis,
        "priority_actions": priority_actions,
        "operational_health": {
            "inactive_members": inactive_members,
            "unpaid_fine_cases": unpaid_fine_cases,
            "expired_ready_waiting":
                expired_ready_waiting,
            "low_stock_titles":
                low_stock_titles,
            "out_of_stock_titles":
                out_of_stock_titles,
            "negative_stock_titles":
                negative_stock_titles,
            "copy_count_mismatches":
                copy_count_mismatches,
            "unread_notifications":
                unread_notifications,
            "data_consistency_issues":
                data_consistency_issues,
        },
    }

