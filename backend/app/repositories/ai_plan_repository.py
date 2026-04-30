from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ai_plan import AIPlan


class AIPlanRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        title: str,
        goal: str,
        input_data: dict[str, object],
        plan_data: dict[str, object],
        duration_days: int,
    ) -> AIPlan:
        plan = AIPlan(
            user_id=user_id,
            title=title,
            goal=goal,
            input_data=input_data,
            plan_data=plan_data,
            duration_days=duration_days,
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        return plan

    def list_for_user(self, user_id: int) -> list[AIPlan]:
        statement = (
            select(AIPlan)
            .where(AIPlan.user_id == user_id)
            .order_by(AIPlan.created_at.desc(), AIPlan.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_for_user(self, plan_id: int, user_id: int) -> AIPlan | None:
        statement = select(AIPlan).where(
            AIPlan.id == plan_id,
            AIPlan.user_id == user_id,
        )
        return self.db.scalars(statement).first()

    def delete(self, plan: AIPlan) -> None:
        self.db.delete(plan)
        self.db.commit()
