import type { UserRepositoryPort } from '../users/user.repository';
import type { UserEntity, UserProfilePersistenceUpdate } from '../users/user.types';

export interface ProfileRepositoryPort {
  findByUserId(userId: string): Promise<UserEntity | null>;
  updateByUserId(userId: string, update: UserProfilePersistenceUpdate): Promise<UserEntity | null>;
}

export class UserBackedProfileRepository implements ProfileRepositoryPort {
  public constructor(private readonly users: UserRepositoryPort) {}

  public findByUserId(userId: string): Promise<UserEntity | null> {
    return this.users.findById(userId);
  }

  public updateByUserId(
    userId: string,
    update: UserProfilePersistenceUpdate,
  ): Promise<UserEntity | null> {
    return this.users.updateProfile(userId, update);
  }
}
