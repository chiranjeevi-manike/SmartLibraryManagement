from pydantic import BaseModel, EmailStr
from typing import Optional


# =====================================================
# PUBLIC USER REGISTRATION
# =====================================================
# Used for POST /auth/register
# Public users cannot select ADMIN/LIBRARIAN roles.
# The backend automatically assigns MEMBER.
# =====================================================

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str


# =====================================================
# USER CREATE
# =====================================================
# Kept separately for internal/admin operations
# where a role may need to be specified.
# =====================================================

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role_id: int


# =====================================================
# USER RESPONSE
# =====================================================

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    role_id: int

    class Config:
        from_attributes = True


# =====================================================
# USER UPDATE
# =====================================================

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


# =====================================================
# USER ROLE UPDATE
# =====================================================

class UserRoleUpdate(BaseModel):
    role_id: int


# =====================================================
# USER STATUS UPDATE
# =====================================================

class UserStatusUpdate(BaseModel):
    is_active: bool




# =====================================================
# FORGOT PASSWORD
# =====================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


# =====================================================
# RESET PASSWORD
# =====================================================

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str



class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str