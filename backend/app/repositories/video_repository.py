from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exercise_video import ExerciseVideo
from app.schemas.video import ExerciseVideoCreate


class ExerciseVideoRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, video_data: ExerciseVideoCreate) -> ExerciseVideo:
        video = ExerciseVideo(**video_data.model_dump())
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    def get_by_id(self, video_id: int) -> ExerciseVideo | None:
        return self.db.get(ExerciseVideo, video_id)

    def get_by_title(self, title: str) -> ExerciseVideo | None:
        statement = select(ExerciseVideo).where(ExerciseVideo.title == title)
        return self.db.scalars(statement).first()

    def get_active_by_id(self, video_id: int) -> ExerciseVideo | None:
        statement = select(ExerciseVideo).where(
            ExerciseVideo.id == video_id,
            ExerciseVideo.is_active.is_(True),
        )
        return self.db.scalars(statement).first()

    def list_all(self) -> list[ExerciseVideo]:
        statement = select(ExerciseVideo).order_by(ExerciseVideo.id)
        return list(self.db.scalars(statement).all())

    def list_active(self) -> list[ExerciseVideo]:
        statement = (
            select(ExerciseVideo)
            .where(ExerciseVideo.is_active.is_(True))
            .order_by(ExerciseVideo.id)
        )
        return list(self.db.scalars(statement).all())

    def update(self, video: ExerciseVideo, update_data: dict[str, Any]) -> ExerciseVideo:
        for field, value in update_data.items():
            setattr(video, field, value)
        self.db.add(video)
        self.db.commit()
        self.db.refresh(video)
        return video

    def delete(self, video: ExerciseVideo) -> None:
        self.db.delete(video)
        self.db.commit()
