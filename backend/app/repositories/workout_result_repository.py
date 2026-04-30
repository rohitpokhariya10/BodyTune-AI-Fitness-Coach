from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workout_result import WorkoutResult
from app.schemas.result import WorkoutResultCreate


class WorkoutResultRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, result_data: WorkoutResultCreate) -> WorkoutResult:
        result = WorkoutResult(**result_data.model_dump(), created_at=datetime.now())
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)
        return result

    def get_by_id(self, result_id: int) -> WorkoutResult | None:
        return self.db.get(WorkoutResult, result_id)

    def list_by_user_id(self, user_id: int) -> list[WorkoutResult]:
        statement = (
            select(WorkoutResult)
            .where(WorkoutResult.user_id == user_id)
            .order_by(WorkoutResult.id)
        )
        return list(self.db.scalars(statement).all())

    def list_all(self) -> list[WorkoutResult]:
        statement = select(WorkoutResult).order_by(WorkoutResult.id)
        return list(self.db.scalars(statement).all())

    def delete(self, result: WorkoutResult) -> None:
        self.db.delete(result)
        self.db.commit()
