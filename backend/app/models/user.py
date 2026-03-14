from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    INVENTORY_MANAGER = "inventory_manager"
    WAREHOUSE_STAFF = "warehouse_staff"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.WAREHOUSE_STAFF, nullable=False)
    is_active = Column(Boolean, default=True)

    # ── OTP / Password-Reset fields ──────────────────────────────────────
    # Hashed OTP (never store plaintext in production)
    otp_hash = Column(String(255), nullable=True)
    # When the OTP expires (UTC)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Failed verification attempts – cap at MAX_OTP_ATTEMPTS
    otp_attempts = Column(Integer, default=0, nullable=False)
    # Single-use reset token issued after OTP verification
    reset_token = Column(String(255), nullable=True)
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Timestamp of last OTP request – used for per-user rate limiting
    last_otp_requested_at = Column(DateTime(timezone=True), nullable=True)

    # ── Legacy column kept for backward compat (migration-safe) ──────────
    otp_code = Column(String(6), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
