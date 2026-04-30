from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.otp_verification import OTPVerification


class OTPVerificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        email: str,
        expires_at: datetime,
        otp_code: str,
        purpose: str,
    ) -> OTPVerification:
        otp = OTPVerification(
            email=email.strip().lower(),
            expires_at=expires_at,
            otp_code=otp_code,
            purpose=purpose,
        )
        self.db.add(otp)
        self.db.commit()
        self.db.refresh(otp)
        return otp

    def get_latest(self, email: str, purpose: str) -> OTPVerification | None:
        statement = (
            select(OTPVerification)
            .where(
                OTPVerification.email == email.strip().lower(),
                OTPVerification.purpose == purpose,
            )
            .order_by(OTPVerification.created_at.desc(), OTPVerification.id.desc())
        )
        return self.db.scalars(statement).first()

    def get_latest_unused(self, email: str, purpose: str) -> OTPVerification | None:
        statement = (
            select(OTPVerification)
            .where(
                OTPVerification.email == email.strip().lower(),
                OTPVerification.purpose == purpose,
                OTPVerification.is_used.is_(False),
            )
            .order_by(OTPVerification.created_at.desc(), OTPVerification.id.desc())
        )
        return self.db.scalars(statement).first()

    def mark_used(self, otp: OTPVerification) -> OTPVerification:
        otp.is_used = True
        self.db.add(otp)
        self.db.commit()
        self.db.refresh(otp)
        return otp

    def mark_unused_used(self, email: str, purpose: str) -> None:
        statement = select(OTPVerification).where(
            OTPVerification.email == email.strip().lower(),
            OTPVerification.purpose == purpose,
            OTPVerification.is_used.is_(False),
        )
        for otp in self.db.scalars(statement).all():
            otp.is_used = True
            self.db.add(otp)
        self.db.commit()
