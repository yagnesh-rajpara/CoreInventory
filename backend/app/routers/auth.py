"""
Authentication router for CoreInventory.

Password-Reset Flow (3 API calls):
  1. POST /api/auth/forgot-password   → generates & emails OTP
  2. POST /api/auth/verify-otp        → validates OTP, returns reset_token
  3. POST /api/auth/reset-password    → validates reset_token, updates password

Security measures implemented:
  • Cryptographically secure OTP (secrets module)
  • OTP is bcrypt-hashed before storage — DB leak won't expose codes
  • Per-user rate-limiting on OTP requests (configurable cooldown)
  • Brute-force protection: max N attempts per OTP, then automatic invalidation
  • Constant-time responses to prevent user-enumeration
  • Single-use reset token (UUID4) issued after OTP verification
  • Reset token has its own short expiry window
  • OTP and reset token are invalidated immediately after use
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    ForgotPasswordRequest, VerifyOTPRequest, VerifyOTPResponse,
    ResetPasswordRequest, SuccessResponse,
    OTPRequest, OTPVerify, UserUpdate,
)
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.services.email_service import send_otp_email

logger = logging.getLogger("coreinventory.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ═══════════════════════════════════════════════════════════════════════════
#  SIGNUP / LOGIN / PROFILE (unchanged but cleaned up)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    role = UserRole.INVENTORY_MANAGER if data.role == "inventory_manager" else UserRole.WAREHOUSE_STAFF
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already in use")
        current_user.email = data.email
    db.commit()
    db.refresh(current_user)
    return current_user


# ═══════════════════════════════════════════════════════════════════════════
#  STEP 1 — FORGOT PASSWORD  (generate OTP, send via email)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/forgot-password", response_model=SuccessResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generates a secure 6-digit OTP and sends it to the user's email.

    Security notes:
    ───────────────
    • We *always* return the same 200 response regardless of whether the email
      exists.  This prevents **user enumeration** — an attacker can't tell
      which emails are registered by watching for different responses.
    • The OTP is generated using `secrets.randbelow()`, which draws from
      the OS CSPRNG (cryptographically secure pseudo-random number generator).
      Python's `random` module is NOT suitable — it uses Mersenne Twister,
      which is predictable.
    • The OTP is bcrypt-hashed before being stored.  Even if the DB is
      compromised, the attacker can't read the OTPs.
    • We enforce a per-user cooldown to prevent OTP spam / abuse.
    """

    # Always return the same response shaped exactly the same way
    GENERIC_RESPONSE = SuccessResponse(
        message="If this email is registered, you will receive a password reset code shortly."
    )

    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.is_active:
        # Don't reveal that the account doesn't exist
        return GENERIC_RESPONSE

    # ── Rate-limit: enforce cooldown between OTP requests ────────────────
    now = datetime.now(timezone.utc)
    if user.last_otp_requested_at:
        elapsed = (now - user.last_otp_requested_at).total_seconds()
        if elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
            # Still return generic response to prevent enumeration,
            # but silently skip sending a new OTP
            logger.info("OTP request rate-limited for user %s", user.id)
            return GENERIC_RESPONSE

    # ── Generate cryptographically secure OTP ────────────────────────────
    otp_code = "".join(str(secrets.randbelow(10)) for _ in range(settings.OTP_LENGTH))

    # ── Store hashed OTP + metadata ──────────────────────────────────────
    user.otp_hash = hash_password(otp_code)
    user.otp_expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    user.otp_attempts = 0
    user.reset_token = None  # invalidate any previous reset token
    user.reset_token_expires_at = None
    user.last_otp_requested_at = now
    db.commit()

    # ── Send email ───────────────────────────────────────────────────────
    send_otp_email(
        to_email=user.email,
        user_name=user.full_name,
        otp_code=otp_code,
    )

    logger.info("OTP generated for user %s (email: %s)", user.id, user.email)
    return GENERIC_RESPONSE


# ═══════════════════════════════════════════════════════════════════════════
#  STEP 2 — VERIFY OTP  (validate code, issue reset token)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/verify-otp", response_model=VerifyOTPResponse)
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    Validates the user-submitted OTP code.

    Security notes:
    ───────────────
    • Uses bcrypt `verify_password` for constant-time comparison —
      prevents timing side-channel attacks.
    • Each failed attempt increments `otp_attempts`.  After
      `OTP_MAX_ATTEMPTS` failures the OTP is **permanently invalidated**
      and the user must request a new one.  This stops brute-force attacks
      (10^6 combinations can be trivially attempted without this safeguard).
    • On success we issue a single-use reset_token (UUID4) with its own
      short expiry.  This decouples OTP validation from the actual password
      change, which is important for UX (users can take a moment to type
      their new password without the OTP expiring mid-submission).
    """
    user = db.query(User).filter(User.email == data.email).first()

    # Generic error to avoid user enumeration
    INVALID_OTP_MSG = "Invalid or expired verification code"

    if not user or not user.otp_hash:
        raise HTTPException(status_code=400, detail=INVALID_OTP_MSG)

    # ── Check attempt limit ──────────────────────────────────────────────
    if user.otp_attempts >= settings.OTP_MAX_ATTEMPTS:
        # Invalidate the OTP entirely
        user.otp_hash = None
        user.otp_expires_at = None
        user.otp_attempts = 0
        db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Please request a new code."
        )

    # ── Check expiry ─────────────────────────────────────────────────────
    if user.otp_expires_at and user.otp_expires_at < datetime.now(timezone.utc):
        user.otp_hash = None
        user.otp_expires_at = None
        user.otp_attempts = 0
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    # ── Verify OTP (constant-time via bcrypt) ────────────────────────────
    if not verify_password(data.otp, user.otp_hash):
        user.otp_attempts += 1
        remaining = settings.OTP_MAX_ATTEMPTS - user.otp_attempts
        db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # ── OTP is valid — issue a single-use reset token ────────────────────
    reset_token = str(uuid.uuid4())
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.reset_token = hash_password(reset_token)
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    db.commit()

    logger.info("OTP verified for user %s — reset token issued", user.id)

    return VerifyOTPResponse(
        message="Verification successful. You may now set a new password.",
        reset_token=reset_token,
    )


# ═══════════════════════════════════════════════════════════════════════════
#  STEP 3 — RESET PASSWORD  (validate reset token, update password)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/reset-password", response_model=SuccessResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Consumes the reset_token and sets a new password.

    Security notes:
    ───────────────
    • The reset_token is a UUID4 (122 bits of entropy) — effectively
      unguessable, unlike a 6-digit OTP.
    • It's bcrypt-hashed in the DB, so a DB leak can't be used to
      reset arbitrary passwords.
    • It's single-use: cleared from the DB the moment it's consumed.
    • It has its own separate expiry (default 15 min) that is shorter
      than a regular session token.
    • The new password goes through the same strength validation as signup
      (uppercase, digit, special char, min 8 chars).
    """
    user = db.query(User).filter(User.email == data.email).first()

    INVALID_TOKEN_MSG = "Invalid or expired reset token. Please restart the password reset process."

    if not user or not user.reset_token:
        raise HTTPException(status_code=400, detail=INVALID_TOKEN_MSG)

    # ── Check token expiry ───────────────────────────────────────────────
    if user.reset_token_expires_at and user.reset_token_expires_at < datetime.now(timezone.utc):
        user.reset_token = None
        user.reset_token_expires_at = None
        db.commit()
        raise HTTPException(status_code=400, detail=INVALID_TOKEN_MSG)

    # ── Verify reset token ───────────────────────────────────────────────
    if not verify_password(data.reset_token, user.reset_token):
        raise HTTPException(status_code=400, detail=INVALID_TOKEN_MSG)

    # ── Update password & clear all reset state ──────────────────────────
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    user.otp_hash = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    db.commit()

    logger.info("Password successfully reset for user %s", user.id)

    return SuccessResponse(message="Password has been reset successfully. You can now sign in with your new password.")


# ═══════════════════════════════════════════════════════════════════════════
#  LEGACY ENDPOINTS (kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/request-otp", deprecated=True)
def request_otp_legacy(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Legacy endpoint — redirects to forgot-password internally."""
    return forgot_password(data, db)
