import { OtpChallengeModel } from '../auth/otp-challenge.model';
import { UserModel } from './user.model';

describe('identity model protections', () => {
  it('excludes password hashes by default and defines identity uniqueness', () => {
    expect(UserModel.schema.path('passwordHash').options.select).toBe(false);

    const indexes = UserModel.schema.indexes();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ email: 1 }, expect.objectContaining({ unique: true })],
        [
          { 'providers.google.subject': 1 },
          expect.objectContaining({
            partialFilterExpression: {
              'providers.google.subject': { $type: 'string' },
            },
            unique: true,
          }),
        ],
      ]),
    );
  });

  it('stores only a hidden OTP digest and expires challenges with a TTL index', () => {
    expect(OtpChallengeModel.schema.path('codeDigest').options.select).toBe(false);
    expect(OtpChallengeModel.schema.path('otpCode')).toBeUndefined();
    expect(OtpChallengeModel.schema.indexes()).toEqual(
      expect.arrayContaining([
        [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
      ]),
    );
  });
});
