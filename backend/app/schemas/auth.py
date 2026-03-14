from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re


# ── Signup / Login ───────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    role: str = "warehouse_staff"

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[^a-zA-Z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


# ── Forgot-Password Flow ────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    """Step 1: User submits their email."""
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    """Step 2: User submits the 6-digit OTP they received."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$')


class VerifyOTPResponse(BaseModel):
    """Returned after successful OTP verification — contains a single-use reset token."""
    status: str = "success"
    message: str
    reset_token: str


class ResetPasswordRequest(BaseModel):
    """Step 3: User submits new password along with the reset token."""
    email: EmailStr
    reset_token: str
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        if not re.search(r'[^a-zA-Z0-9]', v):
            raise ValueError('Password must contain at least one special character')
        return v


# ── Standardized API Responses ──────────────────────────────────────────

class SuccessResponse(BaseModel):
    status: str = "success"
    message: str


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str


# ── Legacy schemas (kept for backward compat) ───────────────────────────

class OTPRequest(BaseModel):
    email: EmailStr


class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
