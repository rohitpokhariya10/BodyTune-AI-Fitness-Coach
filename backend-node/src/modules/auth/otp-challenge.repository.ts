import { Types, type HydratedDocument } from 'mongoose';

import { OtpChallengeModel, type OtpChallengePersistence } from './otp-challenge.model';
import type { OtpPurpose } from './auth.types';

export interface OtpChallengeEntity {
  attempts: number;
  challengeKey: string;
  codeDigest: string;
  consumedAt: Date | null;
  createdAt: Date;
  emailDigest: string;
  expiresAt: Date;
  id: string;
  invalidatedAt: Date | null;
  maxAttempts: number;
  purpose: OtpPurpose;
  userId: string | null;
}

export interface CreateOtpChallengeInput {
  challengeKey: string;
  codeDigest: string;
  emailDigest: string;
  expiresAt: Date;
  maxAttempts: number;
  purpose: OtpPurpose;
  userId?: string;
}

const toEntity = (challenge: HydratedDocument<OtpChallengePersistence>): OtpChallengeEntity => ({
  attempts: challenge.attempts,
  challengeKey: challenge.challengeKey,
  codeDigest: challenge.codeDigest,
  consumedAt: challenge.consumedAt,
  createdAt: challenge.createdAt,
  emailDigest: challenge.emailDigest,
  expiresAt: challenge.expiresAt,
  id: challenge._id.toString(),
  invalidatedAt: challenge.invalidatedAt,
  maxAttempts: challenge.maxAttempts,
  purpose: challenge.purpose,
  userId: challenge.userId?.toString() ?? null,
});

export interface OtpChallengeRepositoryPort {
  consumeActive(challengeId: string, consumedAt: Date): Promise<boolean>;
  create(input: CreateOtpChallengeInput): Promise<OtpChallengeEntity>;
  findLatest(emailDigest: string, purpose: OtpPurpose): Promise<OtpChallengeEntity | null>;
  findLatestActive(
    emailDigest: string,
    purpose: OtpPurpose,
    now: Date,
  ): Promise<OtpChallengeEntity | null>;
  invalidate(challengeId: string, invalidatedAt: Date): Promise<void>;
  invalidateOutstanding(
    emailDigest: string,
    purpose: OtpPurpose,
    invalidatedAt: Date,
  ): Promise<void>;
  recordFailedAttempt(challengeId: string, now: Date): Promise<boolean>;
}

const objectId = (id: string): Types.ObjectId | null =>
  Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export class MongooseOtpChallengeRepository implements OtpChallengeRepositoryPort {
  public async create(input: CreateOtpChallengeInput): Promise<OtpChallengeEntity> {
    const userId = input.userId ? objectId(input.userId) : null;
    const challenge = await OtpChallengeModel.create({
      challengeKey: input.challengeKey,
      codeDigest: input.codeDigest,
      emailDigest: input.emailDigest,
      expiresAt: input.expiresAt,
      maxAttempts: input.maxAttempts,
      purpose: input.purpose,
      userId,
    });
    return toEntity(challenge);
  }

  public async findLatest(
    emailDigest: string,
    purpose: OtpPurpose,
  ): Promise<OtpChallengeEntity | null> {
    const challenge = await OtpChallengeModel.findOne({ emailDigest, purpose })
      .select('+codeDigest')
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    return challenge ? toEntity(challenge) : null;
  }

  public async findLatestActive(
    emailDigest: string,
    purpose: OtpPurpose,
    now: Date,
  ): Promise<OtpChallengeEntity | null> {
    const challenge = await OtpChallengeModel.findOne({
      consumedAt: null,
      emailDigest,
      expiresAt: { $gt: now },
      invalidatedAt: null,
      purpose,
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    })
      .select('+codeDigest')
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    return challenge ? toEntity(challenge) : null;
  }

  public async recordFailedAttempt(challengeId: string, now: Date): Promise<boolean> {
    const id = objectId(challengeId);
    if (!id) {
      return false;
    }

    const result = await OtpChallengeModel.updateOne(
      {
        _id: id,
        consumedAt: null,
        expiresAt: { $gt: now },
        invalidatedAt: null,
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      { $inc: { attempts: 1 } },
    ).exec();
    return result.modifiedCount === 1;
  }

  public async consumeActive(challengeId: string, consumedAt: Date): Promise<boolean> {
    const id = objectId(challengeId);
    if (!id) {
      return false;
    }

    const result = await OtpChallengeModel.updateOne(
      {
        _id: id,
        consumedAt: null,
        expiresAt: { $gt: consumedAt },
        invalidatedAt: null,
        $expr: { $lt: ['$attempts', '$maxAttempts'] },
      },
      { $set: { consumedAt } },
    ).exec();
    return result.modifiedCount === 1;
  }

  public async invalidate(challengeId: string, invalidatedAt: Date): Promise<void> {
    const id = objectId(challengeId);
    if (!id) {
      return;
    }

    await OtpChallengeModel.updateOne(
      { _id: id, consumedAt: null, invalidatedAt: null },
      { $set: { invalidatedAt } },
    ).exec();
  }

  public async invalidateOutstanding(
    emailDigest: string,
    purpose: OtpPurpose,
    invalidatedAt: Date,
  ): Promise<void> {
    await OtpChallengeModel.updateMany(
      { consumedAt: null, emailDigest, invalidatedAt: null, purpose },
      { $set: { invalidatedAt } },
    ).exec();
  }
}
