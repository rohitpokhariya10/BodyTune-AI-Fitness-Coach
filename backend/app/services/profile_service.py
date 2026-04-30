from app.models.user_profile import UserProfile
from app.repositories.profile_repository import ProfileRepository
from app.schemas.profile import UserProfileCreate, UserProfileUpdate


class ProfileNotFoundError(Exception):
    def __init__(self, profile_id: int) -> None:
        self.profile_id = profile_id
        super().__init__(f"Profile with id {profile_id} was not found")


class ProfileService:
    def __init__(self, profile_repository: ProfileRepository) -> None:
        self.profile_repository = profile_repository

    def create_profile(self, profile_data: UserProfileCreate) -> UserProfile:
        return self.profile_repository.create(profile_data)

    def get_profile(self, profile_id: int) -> UserProfile:
        profile = self.profile_repository.get_by_id(profile_id)
        if profile is None:
            raise ProfileNotFoundError(profile_id)
        return profile

    def update_profile(
        self,
        profile_id: int,
        profile_data: UserProfileUpdate,
    ) -> UserProfile:
        profile = self.get_profile(profile_id)
        update_data = profile_data.model_dump(exclude_unset=True)
        return self.profile_repository.update(profile, update_data)

    def delete_profile(self, profile_id: int) -> None:
        profile = self.get_profile(profile_id)
        self.profile_repository.delete(profile)

    def list_profiles(self) -> list[UserProfile]:
        return self.profile_repository.list()
