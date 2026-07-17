import { NotFoundError } from '../../errors/NotFoundError';
import { serializeUserProfile } from '../users/user.serializer';
import type { UserProfileDto, UserProfilePersistenceUpdate } from '../users/user.types';
import type { ProfileRepositoryPort } from './profile.repository';
import type { ProfileUpdateBody } from './profile.validation';

const toPersistenceUpdate = (input: ProfileUpdateBody): UserProfilePersistenceUpdate => ({
  ...(input.age == null ? {} : { age: input.age }),
  ...(input.calorie_goal === undefined ? {} : { calorieGoal: input.calorie_goal }),
  ...(input.carbs_goal_g === undefined ? {} : { carbsGoalG: input.carbs_goal_g }),
  ...(input.experience_level === undefined ? {} : { experienceLevel: input.experience_level }),
  ...(input.fats_goal_g === undefined ? {} : { fatsGoalG: input.fats_goal_g }),
  ...(input.fitness_goal === undefined ? {} : { fitnessGoal: input.fitness_goal }),
  ...(input.height_cm == null ? {} : { heightCm: input.height_cm }),
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.protein_goal_g === undefined ? {} : { proteinGoalG: input.protein_goal_g }),
  ...(input.timezone === undefined ? {} : { timezone: input.timezone }),
  ...(input.weight_kg == null ? {} : { weightKg: input.weight_kg }),
});

export class ProfileService {
  public constructor(private readonly profileRepository: ProfileRepositoryPort) {}

  public async getMyProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.profileRepository.findByUserId(userId);
    if (user?.status !== 'active') {
      throw new NotFoundError('Profile not found');
    }
    return serializeUserProfile(user);
  }

  public async updateMyProfile(userId: string, input: ProfileUpdateBody): Promise<UserProfileDto> {
    const user = await this.profileRepository.updateByUserId(userId, toPersistenceUpdate(input));
    if (user?.status !== 'active') {
      throw new NotFoundError('Profile not found');
    }
    return serializeUserProfile(user);
  }
}
