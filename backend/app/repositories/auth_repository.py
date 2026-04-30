from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth_user import AuthUser


class AuthUserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, user_data: dict[str, object]) -> AuthUser:
        user = AuthUser(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> AuthUser | None:
        return self.db.get(AuthUser, user_id)

    def get_by_email(self, email: str) -> AuthUser | None:
        statement = select(AuthUser).where(AuthUser.email == email.strip().lower())
        return self.db.scalars(statement).first()

    def update(self, user: AuthUser, update_data: dict[str, object]) -> AuthUser:
        for field, value in update_data.items():
            setattr(user, field, value)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_all(self) -> list[AuthUser]:
        statement = select(AuthUser).order_by(AuthUser.id)
        return list(self.db.scalars(statement).all())
