import type { UserEntity } from '../users/user.types';
import type { ProfileRepositoryPort } from './profile.repository';
import { ProfileService } from './profile.service';

const user: UserEntity = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  email: 'user@example.com',
  emailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
  id: '507f1f77bcf86cd799439011',
  lastLoginAt: null,
  name: 'BodyTune User',
  profile: {
    age: 24,
    calorieGoal: 2200,
    carbsGoalG: 250,
    experienceLevel: 'beginner',
    fatsGoalG: 70,
    fitnessGoal: 'strength',
    heightCm: 175,
    proteinGoalG: 120,
    timezone: 'Asia/Kolkata',
    weightKg: 72,
  },
  role: 'user',
  sessionVersion: 0,
  status: 'active',
  updatedAt: new Date('2026-01-03T00:00:00.000Z'),
};

describe('ProfileService', () => {
  it('preserves legacy null semantics for physical metrics while allowing goal clearing', async () => {
    const repository: jest.Mocked<ProfileRepositoryPort> = {
      findByUserId: jest.fn(),
      updateByUserId: jest.fn().mockResolvedValue(user),
    };
    const service = new ProfileService(repository);

    await service.updateMyProfile(user.id, {
      age: null,
      calorie_goal: null,
      height_cm: null,
      name: 'Updated User',
      weight_kg: null,
    });

    expect(repository.updateByUserId).toHaveBeenCalledWith(user.id, {
      calorieGoal: null,
      name: 'Updated User',
    });
  });
});
