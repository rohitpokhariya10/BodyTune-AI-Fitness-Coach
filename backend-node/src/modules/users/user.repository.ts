import { Types, type HydratedDocument } from 'mongoose';

import { UserModel, type UserPersistence } from './user.model';
import type {
  CreateLocalUserInput,
  GoogleIdentityInput,
  UserEntity,
  UserProfileEntity,
  UserProfilePersistenceUpdate,
} from './user.types';

const defaultProfile = (profile: Partial<UserProfileEntity> | undefined): UserProfileEntity => ({
  age: profile?.age ?? null,
  calorieGoal: profile?.calorieGoal ?? null,
  carbsGoalG: profile?.carbsGoalG ?? null,
  experienceLevel: profile?.experienceLevel ?? 'beginner',
  fatsGoalG: profile?.fatsGoalG ?? null,
  fitnessGoal: profile?.fitnessGoal ?? 'general_fitness',
  heightCm: profile?.heightCm ?? null,
  proteinGoalG: profile?.proteinGoalG ?? null,
  timezone: profile?.timezone ?? 'UTC',
  weightKg: profile?.weightKg ?? null,
});

const toEntity = (document: HydratedDocument<UserPersistence>): UserEntity => {
  const googleIdentity = document.providers.google;

  return {
    createdAt: document.createdAt,
    email: document.email,
    emailVerifiedAt: document.emailVerifiedAt,
    ...(googleIdentity
      ? {
          googleIdentity: {
            email: googleIdentity.email,
            linkedAt: googleIdentity.linkedAt,
            subject: googleIdentity.subject,
          },
        }
      : {}),
    id: document._id.toString(),
    lastLoginAt: document.lastLoginAt,
    ...(document.legacyId === undefined ? {} : { legacyId: document.legacyId }),
    name: document.name,
    ...(document.passwordHash === undefined ? {} : { passwordHash: document.passwordHash }),
    profile: {
      age: document.profile.age,
      calorieGoal: document.profile.calorieGoal,
      carbsGoalG: document.profile.carbsGoalG,
      experienceLevel: document.profile.experienceLevel,
      fatsGoalG: document.profile.fatsGoalG,
      fitnessGoal: document.profile.fitnessGoal,
      heightCm: document.profile.heightCm,
      proteinGoalG: document.profile.proteinGoalG,
      timezone: document.profile.timezone,
      weightKg: document.profile.weightKg,
    },
    role: document.role,
    sessionVersion: document.sessionVersion,
    status: document.status,
    updatedAt: document.updatedAt,
  };
};

const objectIdFilter = (id: string): Types.ObjectId | null =>
  Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export interface UserRepositoryPort {
  createGoogleUser(identity: GoogleIdentityInput): Promise<UserEntity>;
  createLocalUser(input: CreateLocalUserInput): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByEmailForAuthentication(email: string): Promise<UserEntity | null>;
  findByGoogleSubject(subject: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findBySessionPrincipal(id: string, sessionVersion: number): Promise<UserEntity | null>;
  linkGoogleIdentity(userId: string, identity: GoogleIdentityInput): Promise<UserEntity | null>;
  markEmailVerified(userId: string, verifiedAt: Date): Promise<UserEntity | null>;
  touchLastLogin(userId: string, loggedInAt: Date): Promise<void>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  updatePasswordAndRevokeSessions(userId: string, passwordHash: string): Promise<UserEntity | null>;
  updateProfile(userId: string, update: UserProfilePersistenceUpdate): Promise<UserEntity | null>;
}

export class MongooseUserRepository implements UserRepositoryPort {
  public async createLocalUser(input: CreateLocalUserInput): Promise<UserEntity> {
    const user = await UserModel.create({
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      profile: defaultProfile(input.profile),
      providers: {},
    });

    return toEntity(user);
  }

  public async createGoogleUser(identity: GoogleIdentityInput): Promise<UserEntity> {
    const now = new Date();
    const user = await UserModel.create({
      email: identity.email,
      emailVerifiedAt: now,
      name: identity.displayName,
      profile: defaultProfile(undefined),
      providers: {
        google: {
          email: identity.email,
          linkedAt: now,
          subject: identity.subject,
        },
      },
      role: 'user',
    });

    return toEntity(user);
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ email }).exec();
    return user ? toEntity(user) : null;
  }

  public async findByEmailForAuthentication(email: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ email }).select('+passwordHash').exec();
    return user ? toEntity(user) : null;
  }

  public async findByGoogleSubject(subject: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ 'providers.google.subject': subject }).exec();
    return user ? toEntity(user) : null;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const objectId = objectIdFilter(id);
    if (!objectId) {
      return null;
    }

    const user = await UserModel.findById(objectId).exec();
    return user ? toEntity(user) : null;
  }

  public async findBySessionPrincipal(
    id: string,
    sessionVersion: number,
  ): Promise<UserEntity | null> {
    const objectId = objectIdFilter(id);
    if (!objectId) {
      return null;
    }

    const user = await UserModel.findOne({
      _id: objectId,
      sessionVersion,
      status: 'active',
    }).exec();
    return user ? toEntity(user) : null;
  }

  public async linkGoogleIdentity(
    userId: string,
    identity: GoogleIdentityInput,
  ): Promise<UserEntity | null> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return null;
    }

    const user = await UserModel.findOneAndUpdate(
      {
        _id: objectId,
        role: 'user',
        status: 'active',
        $or: [
          { 'providers.google.subject': identity.subject },
          { 'providers.google': { $exists: false } },
          { 'providers.google': null },
        ],
      },
      {
        $set: {
          emailVerifiedAt: new Date(),
          'providers.google': {
            email: identity.email,
            linkedAt: new Date(),
            subject: identity.subject,
          },
        },
      },
      { new: true, runValidators: true },
    ).exec();

    return user ? toEntity(user) : null;
  }

  public async markEmailVerified(userId: string, verifiedAt: Date): Promise<UserEntity | null> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return null;
    }

    const user = await UserModel.findOneAndUpdate(
      { _id: objectId, status: 'active' },
      { $set: { emailVerifiedAt: verifiedAt } },
      { new: true, runValidators: true },
    ).exec();
    return user ? toEntity(user) : null;
  }

  public async touchLastLogin(userId: string, loggedInAt: Date): Promise<void> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return;
    }

    await UserModel.updateOne(
      { _id: objectId, status: 'active' },
      { $set: { lastLoginAt: loggedInAt } },
    ).exec();
  }

  public async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return;
    }

    await UserModel.updateOne(
      { _id: objectId, status: 'active' },
      { $set: { passwordHash } },
      { runValidators: true },
    ).exec();
  }

  public async updatePasswordAndRevokeSessions(
    userId: string,
    passwordHash: string,
  ): Promise<UserEntity | null> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return null;
    }

    const user = await UserModel.findOneAndUpdate(
      { _id: objectId, status: 'active' },
      { $inc: { sessionVersion: 1 }, $set: { passwordHash } },
      { new: true, runValidators: true },
    ).exec();
    return user ? toEntity(user) : null;
  }

  public async updateProfile(
    userId: string,
    update: UserProfilePersistenceUpdate,
  ): Promise<UserEntity | null> {
    const objectId = objectIdFilter(userId);
    if (!objectId) {
      return null;
    }

    const set: Record<string, unknown> = {};
    const profileFields: Exclude<keyof UserProfilePersistenceUpdate, 'name'>[] = [
      'age',
      'calorieGoal',
      'carbsGoalG',
      'experienceLevel',
      'fatsGoalG',
      'fitnessGoal',
      'heightCm',
      'proteinGoalG',
      'timezone',
      'weightKg',
    ];

    if (update.name !== undefined) {
      set.name = update.name;
    }

    for (const field of profileFields) {
      if (update[field] !== undefined) {
        set[`profile.${field}`] = update[field];
      }
    }

    if (Object.keys(set).length === 0) {
      return this.findById(userId);
    }

    const user = await UserModel.findOneAndUpdate(
      { _id: objectId, status: 'active' },
      { $set: set },
      { new: true, runValidators: true },
    ).exec();
    return user ? toEntity(user) : null;
  }
}
