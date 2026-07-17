import { serializeSafeUser, serializeUserProfile } from './user.serializer';
import type { UserEntity } from './user.types';

const user: UserEntity = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  email: 'user@example.com',
  emailVerifiedAt: new Date('2026-01-02T00:00:00.000Z'),
  googleIdentity: {
    email: 'user@example.com',
    linkedAt: new Date('2026-01-02T00:00:00.000Z'),
    subject: 'private-provider-subject',
  },
  id: '507f1f77bcf86cd799439011',
  lastLoginAt: null,
  name: 'BodyTune User',
  passwordHash: 'secret-password-hash',
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
  sessionVersion: 8,
  status: 'active',
  updatedAt: new Date('2026-01-03T00:00:00.000Z'),
};

describe('user serializers', () => {
  it('exposes only the safe auth compatibility projection', () => {
    const serialized = serializeSafeUser(user);
    expect(serialized.id).toBe(user.id);
    expect(serialized.is_verified).toBe(true);
    expect(serialized.fitness_goal).toBe('strength');
    expect(JSON.stringify(serialized)).not.toContain('password');
    expect(JSON.stringify(serialized)).not.toContain('private-provider-subject');
    expect(JSON.stringify(serialized)).not.toContain('sessionVersion');
  });

  it('maps the embedded profile to snake_case explicitly', () => {
    expect(serializeUserProfile(user)).toEqual({
      age: 24,
      calorie_goal: 2200,
      carbs_goal_g: 250,
      created_at: '2026-01-01T00:00:00.000Z',
      experience_level: 'beginner',
      fats_goal_g: 70,
      fitness_goal: 'strength',
      height_cm: 175,
      id: user.id,
      name: 'BodyTune User',
      protein_goal_g: 120,
      timezone: 'Asia/Kolkata',
      updated_at: '2026-01-03T00:00:00.000Z',
      weight_kg: 72,
    });
  });
});
