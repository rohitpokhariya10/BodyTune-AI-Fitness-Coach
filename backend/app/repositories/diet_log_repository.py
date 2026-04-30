from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diet_log import DietLog


class DietLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        food_item_id: int,
        quantity: float,
        meal_type: str,
        calories: float,
        protein_g: float,
        carbs_g: float,
        fats_g: float,
        photo_id: int | None = None,
    ) -> DietLog:
        diet_log = DietLog(
            calories=calories,
            carbs_g=carbs_g,
            fats_g=fats_g,
            food_item_id=food_item_id,
            logged_at=datetime.now(),
            meal_type=meal_type,
            photo_id=photo_id,
            protein_g=protein_g,
            quantity=quantity,
            user_id=user_id,
        )
        self.db.add(diet_log)
        self.db.commit()
        self.db.refresh(diet_log)
        return diet_log

    def list_by_user_id(self, user_id: int) -> list[DietLog]:
        statement = (
            select(DietLog)
            .where(DietLog.user_id == user_id)
            .order_by(DietLog.logged_at.desc(), DietLog.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, log_id: int) -> DietLog | None:
        return self.db.get(DietLog, log_id)

    def delete_by_id(self, log_id: int) -> DietLog | None:
        diet_log = self.get_by_id(log_id)
        if diet_log is None:
            return None

        self.db.delete(diet_log)
        self.db.commit()
        return diet_log
