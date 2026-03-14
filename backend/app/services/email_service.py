"""
Email service for CoreInventory — sends OTP codes via SMTP.

Why smtplib instead of a third-party library?
  • Zero extra dependencies
  • Full control over TLS and connection lifecycle
  • Works with any SMTP provider (Gmail, SendGrid, Mailgun, AWS SES, etc.)

Gmail Setup:
  1. Enable 2-Factor Authentication on your Google account
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate an App Password for "Mail"
  4. Set EMAIL_USER and EMAIL_PASSWORD in .env
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger("coreinventory.email")


def _build_otp_html(user_name: str, otp_code: str, expire_minutes: int) -> str:
    """
    Build a professional, responsive HTML email for the OTP.
    """
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="padding:32px 32px 0;text-align:center;">
                  <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#2563eb;border-radius:12px;color:#fff;font-weight:bold;font-size:16px;text-align:center;">CI</div>
                  <h1 style="margin:16px 0 4px;color:#f8fafc;font-size:22px;font-weight:700;">Password Reset</h1>
                  <p style="margin:0;color:#94a3b8;font-size:14px;">CoreInventory Security</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">
                    Hi <strong>{user_name}</strong>,
                  </p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    We received a request to reset your password. Use the verification code below to proceed:
                  </p>

                  <!-- OTP Box -->
                  <div style="background:rgba(37,99,235,0.12);border:1px solid rgba(37,99,235,0.25);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
                    <p style="margin:0;color:#60a5fa;font-size:36px;font-weight:800;letter-spacing:8px;font-family:monospace;">{otp_code}</p>
                  </div>

                  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;">
                    ⏱ This code expires in <strong style="color:#e2e8f0;">{expire_minutes} minutes</strong>.<br/>
                    If you didn't request this reset, please ignore this email — your account is safe.
                  </p>

                  <!-- Security Warning -->
                  <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:8px;padding:12px 16px;">
                    <p style="margin:0;color:#fca5a5;font-size:12px;line-height:1.5;">
                      🔒 <strong>Security Tip:</strong> Never share this code with anyone. CoreInventory staff will never ask for your OTP.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:0 32px 32px;text-align:center;">
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 16px;">
                  <p style="margin:0;color:#475569;font-size:11px;">
                    &copy; 2026 CoreInventory &mdash; Inventory Management System
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def send_otp_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """
    Send the OTP email via SMTP.

    Returns True on success, False on failure.
    Failures are *logged* but never bubble up to the caller —
    we don't want SMTP issues to reveal whether an email exists.
    """
    if not settings.EMAIL_USER or not settings.EMAIL_PASSWORD:
        # SMTP not configured — log OTP for dev convenience
        logger.warning(
            "SMTP not configured. OTP for %s: %s (dev-only log)",
            to_email, otp_code,
        )
        return True  # Return True so the flow continues in dev

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_USER}>"
        msg["To"] = to_email
        msg["Subject"] = "🔐 Your CoreInventory Password Reset Code"

        # Plain-text fallback
        plain_text = (
            f"Hi {user_name},\n\n"
            f"Your password reset code is: {otp_code}\n"
            f"This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
            f"If you didn't request this, please ignore this email.\n\n"
            f"— CoreInventory Security"
        )
        msg.attach(MIMEText(plain_text, "plain"))

        # HTML version
        html = _build_otp_html(user_name, otp_code, settings.OTP_EXPIRE_MINUTES)
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, to_email, msg.as_string())

        logger.info("OTP email sent to %s", to_email)
        return True

    except Exception:
        logger.exception("Failed to send OTP email to %s", to_email)
        return False
