from datetime import date, datetime, time
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.dependencies import require_role


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)


# ---------------------------------------------------------
# GET AUDIT LOGS
# ADMIN ONLY
#
# Supports:
# - pagination
# - action filter
# - entity type filter
# - user filter
# - entity filter
# - date range filter
# - newest first
# ---------------------------------------------------------

@router.get("/")
def get_audit_logs(
    skip: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    action: Optional[str] = None,

    entity_type: Optional[str] = None,

    user_id: Optional[int] = None,

    entity_id: Optional[int] = None,

    start_date: Optional[date] = None,

    end_date: Optional[date] = None,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("ADMIN")
    ),
):

    # -----------------------------------------------------
    # DATE VALIDATION
    # -----------------------------------------------------

    if (
        start_date
        and end_date
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date cannot be greater than end_date",
        )

    query = db.query(AuditLog)

    # -----------------------------------------------------
    # ACTION FILTER
    # -----------------------------------------------------

    if action:
        query = query.filter(
            AuditLog.action
            == action.strip().upper()
        )

    # -----------------------------------------------------
    # ENTITY TYPE FILTER
    # -----------------------------------------------------

    if entity_type:
        query = query.filter(
            AuditLog.entity_type
            == entity_type.strip().upper()
        )

    # -----------------------------------------------------
    # USER FILTER
    # User who performed the action
    # -----------------------------------------------------

    if user_id is not None:
        query = query.filter(
            AuditLog.user_id == user_id
        )

    # -----------------------------------------------------
    # ENTITY ID FILTER
    # -----------------------------------------------------

    if entity_id is not None:
        query = query.filter(
            AuditLog.entity_id == entity_id
        )

    # -----------------------------------------------------
    # START DATE FILTER
    # -----------------------------------------------------

    if start_date:
        start_datetime = datetime.combine(
            start_date,
            time.min,
        )

        query = query.filter(
            AuditLog.created_at
            >= start_datetime
        )

    # -----------------------------------------------------
    # END DATE FILTER
    # -----------------------------------------------------

    if end_date:
        end_datetime = datetime.combine(
            end_date,
            time.max,
        )

        query = query.filter(
            AuditLog.created_at
            <= end_datetime
        )

    # -----------------------------------------------------
    # TOTAL BEFORE PAGINATION
    # -----------------------------------------------------

    total = query.count()

    # -----------------------------------------------------
    # NEWEST FIRST + PAGINATION
    # -----------------------------------------------------

    logs = (
        query
        .order_by(
            AuditLog.created_at.desc(),
            AuditLog.id.desc(),
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "returned": len(logs),

        "audit_logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details,
                "created_at": log.created_at,
            }
            for log in logs
        ],
    }


# ---------------------------------------------------------
# AUDIT LOG SUMMARY
# ADMIN ONLY
#
# Returns the number of audit events for each supported
# action together with the total number of audit records.
#
# IMPORTANT:
# Keep /summary BEFORE /{audit_log_id}
# ---------------------------------------------------------

@router.get("/summary")
def get_audit_summary(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("ADMIN")
    ),
):

    # -----------------------------------------------------
    # SUPPORTED AUDIT ACTIONS
    # -----------------------------------------------------

    actions = [
        "BOOK_CREATED",
        "BOOK_UPDATED",
        "BOOK_DEACTIVATED",

        "BOOK_ISSUED",
        "BOOK_RETURNED",
        "BOOK_RENEWED",

        "FINE_PAID",

        "RESERVATION_CREATED",
        "RESERVATION_CANCELLED",
        "RESERVATION_FULFILLED",

        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",

        "LOGIN_SUCCESS",
        "LOGIN_FAILED",

        "ACCOUNT_LOCKED",
        "ACCOUNT_UNLOCKED",
    ]

    # -----------------------------------------------------
    # COUNT EACH ACTION
    # -----------------------------------------------------

    summary = {}

    for action in actions:

        count = (
            db.query(AuditLog)
            .filter(
                AuditLog.action == action
            )
            .count()
        )

        # Example:
        # ACCOUNT_LOCKED -> account_locked
        # LOGIN_FAILED -> login_failed
        summary[action.lower()] = count

    # -----------------------------------------------------
    # TOTAL AUDIT RECORDS
    # -----------------------------------------------------

    total_audit_records = (
        db.query(AuditLog)
        .count()
    )

    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return {
        "total_audit_records":
            total_audit_records,

        **summary,
    }


# ---------------------------------------------------------
# GET ONE AUDIT LOG
# ADMIN ONLY
#
# IMPORTANT:
# Keep this dynamic route LAST.
# Otherwise /summary could be interpreted as audit_log_id.
# ---------------------------------------------------------

@router.get("/{audit_log_id}")
def get_audit_log_by_id(
    audit_log_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_role("ADMIN")
    ),
):

    audit_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.id == audit_log_id
        )
        .first()
    )

    if not audit_log:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found",
        )

    return {
        "id": audit_log.id,
        "user_id": audit_log.user_id,
        "action": audit_log.action,
        "entity_type": audit_log.entity_type,
        "entity_id": audit_log.entity_id,
        "details": audit_log.details,
        "created_at": audit_log.created_at,
    }