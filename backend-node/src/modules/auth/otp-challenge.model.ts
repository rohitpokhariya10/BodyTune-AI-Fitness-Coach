import mongoose, { type Model, Schema, type Types } from 'mongoose';

import { otpPurposes, type OtpPurpose } from './auth.types';

export interface OtpChallengePersistence {
  _id: Types.ObjectId;
  attempts: number;
  challengeKey: string;
  codeDigest: string;
  consumedAt: Date | null;
  createdAt: Date;
  emailDigest: string;
  expiresAt: Date;
  invalidatedAt: Date | null;
  maxAttempts: number;
  purpose: OtpPurpose;
  updatedAt: Date;
  userId: Types.ObjectId | null;
}

const otpChallengeSchema = new Schema<OtpChallengePersistence>(
  {
    attempts: { default: 0, max: 20, min: 0, required: true, type: Number },
    challengeKey: { maxlength: 128, required: true, type: String },
    codeDigest: { maxlength: 128, required: true, select: false, type: String },
    consumedAt: { default: null, type: Date },
    emailDigest: { maxlength: 128, required: true, type: String },
    expiresAt: { required: true, type: Date },
    invalidatedAt: { default: null, type: Date },
    maxAttempts: { default: 5, max: 20, min: 1, required: true, type: Number },
    purpose: { enum: otpPurposes, required: true, type: String },
    userId: { default: null, ref: 'User', type: Schema.Types.ObjectId },
  },
  { collection: 'otp_challenges', timestamps: true },
);

otpChallengeSchema.index({ challengeKey: 1 }, { name: 'otp_challenges_key_unique', unique: true });
otpChallengeSchema.index(
  { emailDigest: 1, purpose: 1, createdAt: -1 },
  { name: 'otp_challenges_lookup' },
);
otpChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'otp_challenges_expiry_ttl' },
);

export const OtpChallengeModel: Model<OtpChallengePersistence> =
  (mongoose.models.OtpChallenge as Model<OtpChallengePersistence> | undefined) ??
  mongoose.model<OtpChallengePersistence>('OtpChallenge', otpChallengeSchema);
