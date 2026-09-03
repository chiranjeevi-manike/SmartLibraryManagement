from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import SECRET_KEY, ALGORITHM
from app.models.user import User
from app.models.role import Role


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# ---------------------------------------------------------
# GET CURRENT USER
# ---------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if user is None:
        raise credentials_exception

    # -----------------------------------------------------
    # BLOCK DEACTIVATED USERS
    # -----------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


# ---------------------------------------------------------
# REQUIRE ONE ROLE
# Example:
# require_role("ADMIN")
# ---------------------------------------------------------

def require_role(required_role: str):

    def role_checker(
        current_user: User = Depends(
            get_current_user
        ),
        db: Session = Depends(get_db)
    ):

        role = (
            db.query(Role)
            .filter(
                Role.id == current_user.role_id
            )
            .first()
        )

        if (
            not role
            or role.name != required_role
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have permission "
                    "to access this resource"
                )
            )

        return current_user

    return role_checker


# ---------------------------------------------------------
# REQUIRE MULTIPLE ROLES
# Example:
# require_roles("ADMIN", "LIBRARIAN")
# ---------------------------------------------------------

def require_roles(*allowed_roles: str):

    def role_checker(
        current_user: User = Depends(
            get_current_user
        ),
        db: Session = Depends(get_db)
    ):

        role = (
            db.query(Role)
            .filter(
                Role.id == current_user.role_id
            )
            .first()
        )

        if (
            not role
            or role.name not in allowed_roles
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have permission "
                    "to access this resource"
                )
            )

        return current_user

    return role_checker