from datetime import timedelta, datetime, UTC

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.schemas.user import (
    UserRegister,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.schemas.token import Token
from app.utils.security import (
    hash_password,
    verify_password,
)
from app.utils.jwt_handler import (
    create_access_token,
    decode_access_token,
)
from app.services.audit_service import create_audit_log


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =====================================================
# DATABASE DEPENDENCY
# =====================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =====================================================
# REGISTER USER
# =====================================================

@router.post(
    "/register",
    response_model=UserResponse
)
def register_user(
    user: UserRegister,
    db: Session = Depends(get_db)
):

    # Check username
    existing_user = (
        db.query(User)
        .filter(User.username == user.username)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    # Check email
    existing_email = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    # Public registration always creates MEMBER
    member_role = (
        db.query(Role)
        .filter(Role.name == "MEMBER")
        .first()
    )

    if not member_role:
        raise HTTPException(
            status_code=500,
            detail="MEMBER role is not configured"
        )

    hashed_password = hash_password(
        user.password
    )

    new_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
        full_name=user.full_name,
        role_id=member_role.id,
        is_active=True,
        failed_login_attempts=0,
        locked_until=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =====================================================
# LOGIN
# =====================================================

@router.post(
    "/login",
    response_model=Token
)
def login_user(
    login_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.username == login_data.username
        )
        .first()
    )

    now = datetime.now(UTC).replace(tzinfo=None)

    # -----------------------------------------------------
    # USERNAME NOT FOUND
    # -----------------------------------------------------
    if not user:

        create_audit_log(
            db=db,
            user_id=None,
            action="LOGIN_FAILED",
            entity_type="USER",
            entity_id=None,
            details=(
                f"Failed login attempt for username: "
                f"{login_data.username}"
            )
        )

        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # -----------------------------------------------------
    # CHECK TEMPORARY ACCOUNT LOCK
    # -----------------------------------------------------
    if user.locked_until:

        # Account is still locked
        if now < user.locked_until:

            create_audit_log(
                db=db,
                user_id=user.id,
                action="LOGIN_FAILED",
                entity_type="USER",
                entity_id=user.id,
                details=(
                    "Login blocked because account "
                    "is temporarily locked"
                )
            )

            db.commit()

            raise HTTPException(
                status_code=423,
                detail=(
                    "Account is temporarily locked. "
                    "Please try again later."
                )
            )

        # Lock period has expired
        user.locked_until = None
        user.failed_login_attempts = 0

        db.commit()
        db.refresh(user)

    # -----------------------------------------------------
    # WRONG PASSWORD
    # -----------------------------------------------------
    if not verify_password(
        login_data.password,
        user.password
    ):

        user.failed_login_attempts += 1

        # -------------------------------------------------
        # LOCK AFTER 5 FAILED LOGIN ATTEMPTS
        # -------------------------------------------------
        if user.failed_login_attempts >= 5:

            user.locked_until = (
                now + timedelta(minutes=15)
            )

            create_audit_log(
                db=db,
                user_id=user.id,
                action="ACCOUNT_LOCKED",
                entity_type="USER",
                entity_id=user.id,
                details=(
                    "Account temporarily locked after "
                    "5 failed login attempts"
                )
            )

            db.commit()
            db.refresh(user)

            raise HTTPException(
                status_code=423,
                detail=(
                    "Too many failed login attempts. "
                    "Account locked for 15 minutes."
                )
            )

        # -------------------------------------------------
        # NORMAL FAILED ATTEMPT
        # -------------------------------------------------
        create_audit_log(
            db=db,
            user_id=user.id,
            action="LOGIN_FAILED",
            entity_type="USER",
            entity_id=user.id,
            details=(
                "Failed login attempt: incorrect password. "
                f"Attempt {user.failed_login_attempts} of 5"
            )
        )

        db.commit()
        db.refresh(user)

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    # -----------------------------------------------------
    # INACTIVE ACCOUNT
    # -----------------------------------------------------
    if not user.is_active:

        create_audit_log(
            db=db,
            user_id=user.id,
            action="LOGIN_FAILED",
            entity_type="USER",
            entity_id=user.id,
            details=(
                "Failed login attempt: "
                "account is inactive"
            )
        )

        db.commit()

        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    # -----------------------------------------------------
    # SUCCESSFUL LOGIN
    # -----------------------------------------------------

    # Reset failed attempts after successful login
    user.failed_login_attempts = 0
    user.locked_until = None

    # Record successful login time
    user.last_login = now

    create_audit_log(
        db=db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="USER",
        entity_id=user.id,
        details="User logged in successfully"
    )

    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={
            "sub": user.username
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =====================================================
# FORGOT PASSWORD
# =====================================================

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    # Do not reveal whether email exists
    if not user:
        return {
            "message":
                "If the email exists, a password reset link has been generated."
        }

    if not user.is_active:
        return {
            "message":
                "If the email exists, a password reset link has been generated."
        }

    # Reset token valid for 15 minutes
    reset_token = create_access_token(
        data={
            "sub": user.username,
            "purpose": "password_reset"
        },
        expires_delta=timedelta(
            minutes=15
        )
    )

    # Development/testing only
    return {
        "message":
            "Password reset token generated successfully.",
        "reset_token": reset_token
    }


# =====================================================
# RESET PASSWORD
# =====================================================

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):

    # Basic password validation
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 6 characters"
            )
        )

    # Decode token
    payload = decode_access_token(
        request.token
    )

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token"
        )

    # Confirm this token is specifically
    # for password reset
    if payload.get(
        "purpose"
    ) != "password_reset":

        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    username = payload.get("sub")

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    # Prevent reusing the same password
    if verify_password(
        request.new_password,
        user.password
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New password must be different "
                "from the current password"
            )
        )

    # Update password
    user.password = hash_password(
        request.new_password
    )

    # Reset account lock after password reset
    user.failed_login_attempts = 0
    user.locked_until = None

    db.commit()
    db.refresh(user)

    return {
        "message":
            "Password reset successfully. "
            "You can now login with your new password."
    }