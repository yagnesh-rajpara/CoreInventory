"""Add secure OTP fields to users table

Revision ID: 002_secure_otp
Revises: 001_initial
Create Date: 2026-03-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_secure_otp"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Hashed OTP (replaces plaintext otp_code)
    op.add_column("users", sa.Column("otp_hash", sa.String(255), nullable=True))
    # Track failed OTP verification attempts (brute-force protection)
    op.add_column("users", sa.Column("otp_attempts", sa.Integer(), nullable=False, server_default="0"))
    # Single-use reset token issued after OTP verification
    op.add_column("users", sa.Column("reset_token", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("reset_token_expires_at", sa.DateTime(timezone=True), nullable=True))
    # Per-user rate-limit timestamp
    op.add_column("users", sa.Column("last_otp_requested_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_otp_requested_at")
    op.drop_column("users", "reset_token_expires_at")
    op.drop_column("users", "reset_token")
    op.drop_column("users", "otp_attempts")
    op.drop_column("users", "otp_hash")
