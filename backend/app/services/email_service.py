from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmailServiceNotConfiguredError(Exception):
    pass


class EmailDeliveryError(Exception):
    pass


class EmailService:
    def ensure_configured(self) -> None:
        settings = get_settings()
        if settings.dev_mode or self._has_smtp_configured():
            return
        raise EmailServiceNotConfiguredError("Email service is not configured.")

    def send_otp(self, *, email: str, otp_code: str, purpose: str) -> None:
        settings = get_settings()

        if not self._has_smtp_configured():
            if settings.dev_mode:
                logger.info("Development OTP for %s [%s]: %s", email, purpose, otp_code)
                return
            raise EmailServiceNotConfiguredError("Email service is not configured.")

        message = EmailMessage()
        sender_email = settings.smtp_from_email or settings.smtp_username
        message["From"] = formataddr((settings.smtp_from_name, sender_email))
        message["To"] = email
        message["Subject"] = "AI Fitness Coach Verification Code"
        message.set_content(self._plain_text_body(otp_code=otp_code, purpose=purpose))
        message.add_alternative(
            self._html_body(otp_code=otp_code, purpose=purpose),
            subtype="html",
        )

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(message)
        except Exception as error:
            logger.exception("Failed to send OTP email to %s", email)
            raise EmailDeliveryError("Could not send OTP email.") from error

    def _has_smtp_configured(self) -> bool:
        settings = get_settings()
        return all(
            [
                settings.smtp_host,
                settings.smtp_username,
                settings.smtp_password,
                settings.smtp_from_email or settings.smtp_username,
            ],
        )

    def _purpose_label(self, purpose: str) -> str:
        if purpose == "forgot_password":
            return "password reset"
        return "account verification"

    def _plain_text_body(self, *, otp_code: str, purpose: str) -> str:
        settings = get_settings()
        purpose_label = self._purpose_label(purpose)
        return (
            "Hello,\n\n"
            f"Your AI Fitness Coach OTP code is: {otp_code}\n\n"
            f"Purpose: {purpose_label}.\n"
            f"This code expires in {settings.otp_expire_minutes} minutes.\n\n"
            "Security note: do not share this code with anyone.\n\n"
            "AI Fitness Coach"
        )

    def _html_body(self, *, otp_code: str, purpose: str) -> str:
        settings = get_settings()
        purpose_label = self._purpose_label(purpose)
        return f"""
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">AI Fitness Coach Verification Code</h2>
          <p>Hello,</p>
          <p>Use this OTP for your <strong>{purpose_label}</strong>:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 18px 0;">
            {otp_code}
          </p>
          <p>This code expires in {settings.otp_expire_minutes} minutes.</p>
          <p><strong>Security note:</strong> do not share this code with anyone.</p>
          <p>AI Fitness Coach</p>
        </div>
        """
