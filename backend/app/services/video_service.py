from app.models.exercise_video import ExerciseVideo
from app.repositories.video_repository import ExerciseVideoRepository
from app.schemas.video import (
    ExerciseVideoCreate,
    ExerciseVideoUpdate,
    UserExerciseVideoRead,
    VideoAccessRead,
)
from app.services.subscription_service import SubscriptionService


class ExerciseVideoNotFoundError(Exception):
    def __init__(self, video_id: int) -> None:
        self.video_id = video_id
        super().__init__(f"Exercise video with id {video_id} was not found")


class VideoService:
    def __init__(
        self,
        video_repository: ExerciseVideoRepository,
        subscription_service: SubscriptionService,
    ) -> None:
        self.video_repository = video_repository
        self.subscription_service = subscription_service

    def create_video(self, video_data: ExerciseVideoCreate) -> ExerciseVideo:
        return self.video_repository.create(video_data)

    def list_admin_videos(self) -> list[ExerciseVideo]:
        return self.video_repository.list_all()

    def update_video(
        self,
        video_id: int,
        update_data: ExerciseVideoUpdate,
    ) -> ExerciseVideo:
        video = self.video_repository.get_by_id(video_id)
        if video is None:
            raise ExerciseVideoNotFoundError(video_id)

        return self.video_repository.update(
            video,
            update_data.model_dump(exclude_unset=True),
        )

    def delete_video(self, video_id: int) -> None:
        video = self.video_repository.get_by_id(video_id)
        if video is None:
            raise ExerciseVideoNotFoundError(video_id)
        self.video_repository.delete(video)

    def list_user_videos(self, user_id: int | None = None) -> list[UserExerciseVideoRead]:
        unlocks_premium = (
            self.subscription_service.user_unlocks_premium(user_id)
            if user_id is not None
            else False
        )
        return [
            self._to_user_video_read(video, unlocks_premium)
            for video in self.video_repository.list_active()
        ]

    def get_user_video(self, video_id: int, user_id: int | None = None) -> VideoAccessRead:
        video = self.video_repository.get_active_by_id(video_id)
        if video is None:
            raise ExerciseVideoNotFoundError(video_id)

        unlocks_premium = (
            self.subscription_service.user_unlocks_premium(user_id)
            if user_id is not None
            else False
        )
        user_video = self._to_user_video_read(video, unlocks_premium)
        if user_video.locked:
            return VideoAccessRead(
                locked=True,
                message="Upgrade your subscription to watch this premium video.",
                video=user_video,
            )

        return VideoAccessRead(
            locked=False,
            message="Video unlocked.",
            video=user_video,
        )

    def _to_user_video_read(
        self,
        video: ExerciseVideo,
        unlocks_premium: bool,
    ) -> UserExerciseVideoRead:
        return UserExerciseVideoRead.model_validate(video).model_copy(
            update={"locked": video.is_premium and not unlocks_premium},
        )
