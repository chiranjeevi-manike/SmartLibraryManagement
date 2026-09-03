from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.role import Role

from app.models.issue import Issue

from app.services.audit_service import create_audit_log

from app.models.reservation import Reservation

from datetime import datetime
from app.models.book import Book
from app.models.notification import Notification

from app.utils.dependencies import (
    get_current_user,
    require_role,
    require_roles
)

from app.schemas.user import (
    UserUpdate,
    UserRoleUpdate,
    UserStatusUpdate,
    ChangePasswordRequest
)

# from app.utils.security import hash_password
from app.utils.security import hash_password, verify_password
from app.schemas.user import UserUpdate
router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role_id": current_user.role_id
    }
@router.get("/admin-only")
def admin_only(
    current_user: User = Depends(require_role("ADMIN"))
):
    return {
        "message": "Welcome Admin!",
        "username": current_user.username,
        "role": "Admin"
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_user(
    username: str,
    email: str,
    full_name: str,
    password: str,
    role_name: str = "MEMBER",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    # Check duplicate username
    existing_username = (
        db.query(User)
        .filter(User.username == username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Check duplicate email
    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    # Find requested role
    role = (
        db.query(Role)
        .filter(Role.name == role_name.upper())
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )

    # Create user
    new_user = User(
        username=username,
        email=email,
        full_name=full_name,
        password=hash_password(password),
        role_id=role.id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "full_name": new_user.full_name,
        "role": role.name
    }




@router.get("/me/dashboard")
def get_my_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    def get_book_title(book_id: int):
        book = db.query(Book).filter(Book.id == book_id).first()
        return book.title if book else "Unknown Book"



    active_issues = (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.status == "ISSUED"
        )
        .all()
    )


    my_reservations = (
        db.query(Reservation)
        .filter(
            Reservation.user_id == current_user.id
        )
        .order_by(Reservation.reserved_at.desc())
        .all()
    )

    now = datetime.utcnow()

    overdue_issues = (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .all()
    )

    fine_history = (
        db.query(Issue)
        .filter(
            Issue.user_id == current_user.id,
            Issue.fine_amount > 0
        )
        .order_by(Issue.issue_date.desc())
        .all()
    )


    unpaid_fines = [
        issue
        for issue in fine_history
        if issue.fine_status == "UNPAID"
    ]

    paid_fines = [
        issue
        for issue in fine_history
        if issue.fine_status == "PAID"
    ]

    total_fines_generated = sum(
        float(issue.fine_amount)
        for issue in fine_history
    )

    outstanding_fines = sum(
        float(issue.fine_amount)
        for issue in unpaid_fines
    )

    paid_fines_amount = sum(
        float(issue.fine_amount)
        for issue in paid_fines
    )

    active_books_count = len(active_issues)

    total_reservations = len(my_reservations)

    ready_reservations = sum(
        1
        for reservation in my_reservations
        if reservation.status == "READY"
    )

    overdue_books_count = len(overdue_issues)

    total_fines = sum(
        float(issue.fine_amount)
        for issue in fine_history
    )

    return {

        "summary": {
        "active_books": active_books_count,
        "total_reservations": total_reservations,
        "ready_reservations": ready_reservations,
        "overdue_books": overdue_books_count,
        "total_fines_generated": total_fines_generated,
        "outstanding_fines": outstanding_fines,
        "paid_fines": paid_fines_amount
    },


    "user": {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role_id": current_user.role_id
    },

    "active_issues": [
        {
            "issue_id": issue.id,
            "book_id": issue.book_id,
            "book_title": get_book_title(issue.book_id),
            "issue_date": issue.issue_date,
            "due_date": issue.due_date,
            "renewal_count": issue.renewal_count
        }
        for issue in active_issues
    ],

    "reservations": [
        {
            "reservation_id": reservation.id,
            "book_id": reservation.book_id,
            "book_title": get_book_title(reservation.book_id),
            "reserved_at": reservation.reserved_at,
            "status": reservation.status,
            "ready_until": reservation.ready_until
        }
        for reservation in my_reservations
    ],

    "overdue_issues": [
        {
            "issue_id": issue.id,
            "book_id": issue.book_id,
            "book_title": get_book_title(issue.book_id),
            "issue_date": issue.issue_date,
            "due_date": issue.due_date,
            "overdue_days": (
                now.date() - issue.due_date.date()
            ).days
        }
        for issue in overdue_issues
    ],

    "fine_history": [
        {
            "issue_id": issue.id,
            "book_id": issue.book_id,
            "book_title": get_book_title(issue.book_id),
            "overdue_days": issue.overdue_days,
            "fine_amount": float(issue.fine_amount),

            "fine_status": issue.fine_status,
            "fine_paid_at": issue.fine_paid_at,

            "status": issue.status
        }
        for issue in fine_history
    ]
}



@router.get("/dashboard/library")
def get_library_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):

    # Total active book titles
    total_books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .count()
    )

    # Total physical copies
    total_copies = (
        db.query(Book)
        .filter(Book.is_active == True)
        .all()
    )

    total_copies_count = sum(
        book.total_copies for book in total_copies
    )

    # Currently available copies
    available_copies = sum(
        book.available_copies for book in total_copies
    )

    # Currently issued books
    active_issues = (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .count()
    )

    # Overdue issued books
    now = datetime.utcnow()

    overdue_books = (
        db.query(Issue)
        .filter(
            Issue.status == "ISSUED",
            Issue.due_date < now
        )
        .count()
    )

    # Waiting reservations
    active_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "ACTIVE")
        .count()
    )

    # Books ready for pickup
    ready_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "READY")
        .count()
    )


    # Total fines generated from returned books
    fine_records = (
        db.query(Issue)
        .filter(Issue.fine_amount > 0)
        .all()
    )

    total_fines_generated = sum(
        float(issue.fine_amount)
        for issue in fine_records
    )

    paid_fine_records = [
        issue
        for issue in fine_records
        if issue.fine_status == "PAID"
    ]

    unpaid_fine_records = [
        issue
        for issue in fine_records
        if issue.fine_status == "UNPAID"
    ]

    paid_fines = sum(
        float(issue.fine_amount)
        for issue in paid_fine_records
    )

    outstanding_fines = sum(
        float(issue.fine_amount)
        for issue in unpaid_fine_records
    )

    total_fine_cases = len(fine_records)

    return {
        "user": {
            "id": current_user.id,
            "username": current_user.username
        },

        "summary": {
            "total_book_titles": total_books,
            "total_copies": total_copies_count,
            "available_copies": available_copies,
            "issued_books": active_issues,
            "overdue_books": overdue_books,
            "active_reservations": active_reservations,
            "ready_for_pickup": ready_reservations,
            "total_fine_cases": total_fine_cases,
            "total_fines_generated": total_fines_generated,
            "paid_fines": paid_fines,
            "outstanding_fines": outstanding_fines
        }
    }


@router.get("/")
def get_all_users(
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    query = db.query(User).join(
        Role,
        User.role_id == Role.id
    )

    # -----------------------------------------------------
    # SEARCH
    # Search by username, full name, or email
    # -----------------------------------------------------
    if search:
        search_value = f"%{search.strip()}%"

        query = query.filter(
            (User.username.ilike(search_value)) |
            (User.full_name.ilike(search_value)) |
            (User.email.ilike(search_value))
        )

    # -----------------------------------------------------
    # ROLE FILTER
    # -----------------------------------------------------
    if role:
        query = query.filter(
            Role.name == role.strip().upper()
        )

    # -----------------------------------------------------
    # ACTIVE / INACTIVE FILTER
    # -----------------------------------------------------
    if is_active is not None:
        query = query.filter(
            User.is_active == is_active
        )

    # -----------------------------------------------------
    # TOTAL MATCHING USERS
    # -----------------------------------------------------
    total = query.count()

    # -----------------------------------------------------
    # PAGINATION
    # -----------------------------------------------------
    users = (
        query
        .order_by(User.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------
    return {
        "total": total,
        "skip": skip,
        "limit": limit,

        "users": [
            {
                "id": user.id,

                "username": user.username,

                "email": user.email,

                "full_name": user.full_name,

                "role_id": user.role_id,

                "role": (
                    user.role.name
                    if user.role
                    else None
                ),

                # Account activation status
                "is_active": user.is_active,

                # Most recent successful login
                "last_login": user.last_login,

                # Number of consecutive failed logins
                "failed_login_attempts":
                    user.failed_login_attempts,

                # Temporary account lock expiration
                "locked_until": user.locked_until
            }

            for user in users
        ]
    }


@router.get("/search")
def search_users(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    users = (
        db.query(User)
        .filter(
            (User.username.ilike(f"%{query}%")) |
            (User.full_name.ilike(f"%{query}%")) |
            (User.email.ilike(f"%{query}%"))
        )
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role_id": user.role_id
        }
        for user in users
    ]


@router.get("/librarian/dashboard")
def get_librarian_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    now = datetime.utcnow()

    # ---------------------------------------------
    # Book statistics
    # ---------------------------------------------

    books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .all()
    )

    total_book_titles = len(books)

    total_copies = sum(
        book.total_copies or 0
        for book in books
    )

    available_copies = sum(
        book.available_copies or 0
        for book in books
    )

    # ---------------------------------------------
    # Issue statistics
    # ---------------------------------------------

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

    # ---------------------------------------------
    # Reservation statistics
    # ---------------------------------------------

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

    # ---------------------------------------------
    # Fine statistics
    # ---------------------------------------------

    unpaid_fine_records = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "UNPAID"
        )
        .all()
    )

    outstanding_fines = sum(
        float(issue.fine_amount or 0)
        for issue in unpaid_fine_records
    )

    # ---------------------------------------------
    # Response
    # ---------------------------------------------

    return {
        "total_book_titles": total_book_titles,
        "total_copies": total_copies,
        "available_copies": available_copies,
        "currently_issued": currently_issued,
        "overdue_books": overdue_books,
        "active_reservations": active_reservations,
        "ready_for_pickup": ready_for_pickup,
        "unpaid_fine_cases": len(unpaid_fine_records),
        "outstanding_fines": outstanding_fines
    }



@router.get("/admin/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN")
    )
):
    now = datetime.utcnow()

    # --------------------------------------------------
    # User statistics
    # --------------------------------------------------

    total_users = db.query(User).count()

    total_members = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == "MEMBER")
        .count()
    )

    total_librarians = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == "LIBRARIAN")
        .count()
    )

    total_admins = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == "ADMIN")
        .count()
    )

    # --------------------------------------------------
    # Book statistics
    # --------------------------------------------------

    books = (
        db.query(Book)
        .filter(Book.is_active == True)
        .all()
    )

    total_book_titles = len(books)

    total_copies = sum(
        book.total_copies or 0
        for book in books
    )

    available_copies = sum(
        book.available_copies or 0
        for book in books
    )

    # --------------------------------------------------
    # Issue statistics
    # --------------------------------------------------

    issued_books = (
        db.query(Issue)
        .filter(Issue.status == "ISSUED")
        .count()
    )

    returned_books = (
        db.query(Issue)
        .filter(Issue.status == "RETURNED")
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

    # --------------------------------------------------
    # Reservation statistics
    # --------------------------------------------------

    active_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "ACTIVE")
        .count()
    )

    ready_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "READY")
        .count()
    )

    fulfilled_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "FULFILLED")
        .count()
    )

    expired_reservations = (
        db.query(Reservation)
        .filter(Reservation.status == "EXPIRED")
        .count()
    )

    # --------------------------------------------------
    # Fine statistics
    # --------------------------------------------------

    fine_records = (
        db.query(Issue)
        .filter(Issue.fine_amount > 0)
        .all()
    )

    total_fines_generated = sum(
        float(issue.fine_amount or 0)
        for issue in fine_records
    )

    paid_fine_records = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "PAID"
        )
        .all()
    )

    paid_fines = sum(
        float(issue.fine_amount or 0)
        for issue in paid_fine_records
    )

    unpaid_fine_records = (
        db.query(Issue)
        .filter(
            Issue.fine_amount > 0,
            Issue.fine_status == "UNPAID"
        )
        .all()
    )

    outstanding_fines = sum(
        float(issue.fine_amount or 0)
        for issue in unpaid_fine_records
    )

    # --------------------------------------------------
    # Notification statistics
    # --------------------------------------------------

    total_notifications = db.query(Notification).count()

    unread_notifications = (
        db.query(Notification)
        .filter(Notification.is_read == False)
        .count()
    )

    # --------------------------------------------------
    # Final response
    # --------------------------------------------------

    return {
        "users": {
            "total_users": total_users,
            "admins": total_admins,
            "librarians": total_librarians,
            "members": total_members
        },

        "books": {
            "total_book_titles": total_book_titles,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "issued_books": issued_books
        },

        "issues": {
            "issued_books": issued_books,
            "returned_books": returned_books,
            "overdue_books": overdue_books
        },

        "reservations": {
            "active": active_reservations,
            "ready": ready_reservations,
            "fulfilled": fulfilled_reservations,
            "expired": expired_reservations
        },

        "fines": {
            "total_generated": total_fines_generated,
            "paid": paid_fines,
            "outstanding": outstanding_fines,
            "unpaid_cases": len(unpaid_fine_records)
        },

        "notifications": {
            "total": total_notifications,
            "unread": unread_notifications
        }
    }



# ---------------------------------------------------------
# ADMIN USER MANAGEMENT
# ---------------------------------------------------------

@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if data.username is not None and data.username != user.username:
        duplicate_username = (
            db.query(User)
            .filter(User.username == data.username, User.id != user_id)
            .first()
        )
        if duplicate_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        user.username = data.username

    if data.email is not None and data.email != user.email:
        duplicate_email = (
            db.query(User)
            .filter(User.email == data.email, User.id != user_id)
            .first()
        )
        if duplicate_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        user.email = data.email

    if data.full_name is not None:
        user.full_name = data.full_name

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role_id": user.role_id,
            "role": user.role.name if user.role else None,
            "is_active": user.is_active
        }
    }

@router.put("/me/password")
def change_my_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate current password
    if not verify_password(
        data.current_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Validate new password length
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )

    # Prevent reusing current password
    if verify_password(
        data.new_password,
        current_user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Update password
    current_user.password = hash_password(
    data.new_password
    )

    create_audit_log(
        db=db,
        user_id=current_user.id,
        action="PASSWORD_CHANGED",
        entity_type="USER",
        entity_id=current_user.id,
        details="User changed their account password"
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }

@router.put("/{user_id}/role")
def change_user_role(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    role = db.query(Role).filter(Role.id == data.role_id).first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Prevent removing the current admin's own ADMIN role
    if user.id == current_user.id and role.name != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own ADMIN role"
        )

# Prevent demoting the last active ADMIN
    if (
        user.role
        and user.role.name == "ADMIN"
        and role.name != "ADMIN"
    ):
        active_admin_count = (
            db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(
                Role.name == "ADMIN",
                User.is_active == True
            )
            .count()
        )

    if user.is_active and active_admin_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the last active ADMIN"
        )

    user.role_id = role.id
    db.commit()
    db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user_id": user.id,
        "role_id": user.role_id,
        "role": role.name
    }


@router.put("/me/profile")
def update_my_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    changed_fields = []

    # Username is intentionally NOT editable from My Profile.
    # It is the account's login identity.

    if data.email is not None:
        clean_email = str(data.email).strip().lower()

        existing_email = (
            db.query(User)
            .filter(
                User.email == clean_email,
                User.id != current_user.id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use"
            )

        if clean_email != current_user.email:
            current_user.email = clean_email
            changed_fields.append("email")

    if data.full_name is not None:
        clean_name = data.full_name.strip()

        if len(clean_name) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Full name must contain at least 2 characters"
            )

        if clean_name != current_user.full_name:
            current_user.full_name = clean_name
            changed_fields.append("full_name")

    if changed_fields:
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="PROFILE_UPDATED",
            entity_type="USER",
            entity_id=current_user.id,
            details=(
                "User updated profile fields: "
                + ", ".join(changed_fields)
            )
        )

        db.commit()
        db.refresh(current_user)

    return {
        "message": (
            "Profile updated successfully"
            if changed_fields
            else "No profile changes detected"
        ),
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role_id": current_user.role_id,
            "is_active": current_user.is_active
        }
    }



@router.put("/{user_id}/status")
def change_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent an admin from deactivating their own account
    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
    )

# Prevent deactivating the last active ADMIN
    if (
        user.role
        and user.role.name == "ADMIN"
        and data.is_active is False
        and user.is_active
    ):
        active_admin_count = (
            db.query(User)
            .join(Role, User.role_id == Role.id)
            .filter(
                Role.name == "ADMIN",
                User.is_active == True
            )
            .count()
        )

    if active_admin_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate the last active ADMIN"
        )

    user.is_active = data.is_active
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "User activated successfully"
            if user.is_active
            else "User deactivated successfully"
        ),
        "user_id": user.id,
        "is_active": user.is_active
    }





# ---------------------------------------------------------
# ADMIN - UNLOCK USER ACCOUNT
# ---------------------------------------------------------

@router.put("/{user_id}/unlock")
def unlock_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    was_locked = (
        user.locked_until is not None
        or user.failed_login_attempts > 0
    )

    user.failed_login_attempts = 0
    user.locked_until = None

    if was_locked:
        create_audit_log(
            db=db,
            user_id=current_user.id,
            action="ACCOUNT_UNLOCKED",
            entity_type="USER",
            entity_id=user.id,
            details=(
                f"Administrator unlocked user account: "
                f"{user.username}"
            )
        )

    db.commit()
    db.refresh(user)

    return {
        "message": "User account unlocked successfully",
        "user_id": user.id,
        "username": user.username,
        "failed_login_attempts": user.failed_login_attempts,
        "locked_until": user.locked_until
    }


@router.get("/{user_id}/library-profile")
def get_user_library_profile(
    user_id: int,
    issue_status: str | None = None,
    reservation_status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "LIBRARIAN")
    )
):
    # Find user
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


    # -----------------------------------
    # Overall records for summary
    # -----------------------------------

    all_issues = (
        db.query(Issue)
        .filter(Issue.user_id == user_id)
        .all()
    )

    all_reservations = (
        db.query(Reservation)
        .filter(Reservation.user_id == user_id)
        .all()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get all issue records
    issues_query = (
        db.query(Issue)
        .filter(Issue.user_id == user_id)
    )

    if issue_status:
        issues_query = issues_query.filter(
            Issue.status == issue_status.upper()
        )

    issues = (
        issues_query
        .order_by(Issue.issue_date.desc())
        .all()
    )

    # Get reservations
    reservations_query = (
        db.query(Reservation)
        .filter(Reservation.user_id == user_id)
    )

    if reservation_status:
        reservations_query = reservations_query.filter(
            Reservation.status == reservation_status.upper()
    )

    reservations = (
        reservations_query
        .order_by(Reservation.reserved_at.desc())
        .all()
    )

    active_issues = [
        issue
        for issue in all_issues
        if issue.status == "ISSUED"
    ]

    total_fines = sum(
        float(issue.fine_amount)
        for issue in all_issues
        if issue.fine_amount
    )

    active_reservations = [
        reservation
        for reservation in all_reservations
        if reservation.status in ("ACTIVE", "READY")
    ]   

    def get_book_title(book_id: int):
        book = (
            db.query(Book)
            .filter(Book.id == book_id)
            .first()
        )
        return book.title if book else "Unknown Book"

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role_id": user.role_id
        },

        "summary": {
            "total_issue_records": len(all_issues),
            "active_books": len(active_issues),
            "total_reservations": len(all_reservations),
            "active_reservations": len(active_reservations),
            "total_fines": total_fines
        },

        "issues": [
            {
                "issue_id": issue.id,
                "book_id": issue.book_id,
                "book_title": get_book_title(issue.book_id),
                "issue_date": issue.issue_date,
                "due_date": issue.due_date,
                "return_date": issue.return_date,
                "status": issue.status,
                "overdue_days": issue.overdue_days,
                "fine_amount": float(issue.fine_amount),
                "renewal_count": issue.renewal_count
            }
            for issue in issues
        ],

        "reservations": [
            {
                "reservation_id": reservation.id,
                "book_id": reservation.book_id,
                "book_title": get_book_title(
                    reservation.book_id
                ),
                "reserved_at": reservation.reserved_at,
                "status": reservation.status,
                "ready_until": reservation.ready_until
            }
            for reservation in reservations
        ],

        
    }