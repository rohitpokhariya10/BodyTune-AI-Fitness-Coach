import type { UserRepositoryPort } from '../users/user.repository';
import type { UserEntity } from '../users/user.types';
import { InvalidOtpError, GoogleIdentityError } from './auth.errors';
import { HmacOtpHasher } from './auth.security';
import { AuthService } from './auth.service';
import type { EmailGateway, PasswordHasher } from './auth.types';
import type { OtpChallengeEntity, OtpChallengeRepositoryPort } from './otp-challenge.repository';

const fixedNow = new Date('2026-07-18T10:00:00.000Z');

const createUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  email: 'user@example.com',
  emailVerifiedAt: null,
  id: '507f1f77bcf86cd799439011',
  lastLoginAt: null,
  name: 'BodyTune User',
  passwordHash: 'encoded-password',
  profile: {
    age: null,
    calorieGoal: null,
    carbsGoalG: null,
    experienceLevel: 'beginner',
    fatsGoalG: null,
    fitnessGoal: 'general_fitness',
    heightCm: null,
    proteinGoalG: null,
    timezone: 'UTC',
    weightKg: null,
  },
  role: 'user',
  sessionVersion: 0,
  status: 'active',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const createChallenge = (
  codeDigest: string,
  overrides: Partial<OtpChallengeEntity> = {},
): OtpChallengeEntity => ({
  attempts: 0,
  challengeKey: 'challenge-key',
  codeDigest,
  consumedAt: null,
  createdAt: new Date(fixedNow.getTime() - 61_000),
  emailDigest: 'email-digest',
  expiresAt: new Date(fixedNow.getTime() + 600_000),
  id: '507f191e810c19729de860ea',
  invalidatedAt: null,
  maxAttempts: 5,
  purpose: 'register',
  userId: '507f1f77bcf86cd799439011',
  ...overrides,
});

interface Harness {
  email: jest.Mocked<EmailGateway>;
  otp: jest.Mocked<OtpChallengeRepositoryPort>;
  otpHasher: HmacOtpHasher;
  passwords: jest.Mocked<PasswordHasher>;
  service: AuthService;
  users: jest.Mocked<UserRepositoryPort>;
}

const createHarness = (): Harness => {
  const users: jest.Mocked<UserRepositoryPort> = {
    createGoogleUser: jest.fn(),
    createLocalUser: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailForAuthentication: jest.fn(),
    findByGoogleSubject: jest.fn(),
    findById: jest.fn(),
    findBySessionPrincipal: jest.fn(),
    linkGoogleIdentity: jest.fn(),
    markEmailVerified: jest.fn(),
    touchLastLogin: jest.fn(),
    updatePasswordAndRevokeSessions: jest.fn(),
    updatePasswordHash: jest.fn(),
    updateProfile: jest.fn(),
  };
  const otp: jest.Mocked<OtpChallengeRepositoryPort> = {
    consumeActive: jest.fn(),
    create: jest.fn(),
    findLatest: jest.fn(),
    findLatestActive: jest.fn(),
    invalidate: jest.fn(),
    invalidateOutstanding: jest.fn(),
    recordFailedAttempt: jest.fn(),
  };
  const passwords: jest.Mocked<PasswordHasher> = {
    burn: jest.fn(),
    hash: jest.fn(),
    needsRehash: jest.fn(),
    verify: jest.fn(),
  };
  const email: jest.Mocked<EmailGateway> = { sendOtp: jest.fn() };
  const otpHasher = new HmacOtpHasher('a-secure-test-pepper-that-is-longer-than-32-bytes');

  return {
    email,
    otp,
    otpHasher,
    passwords,
    service: new AuthService({
      clock: { now: () => fixedNow },
      emailGateway: email,
      options: {
        otpExpiresMinutes: 10,
        otpMaxAttempts: 5,
        otpResendCooldownSeconds: 60,
      },
      otpHasher,
      otpRepository: otp,
      passwordHasher: passwords,
      userRepository: users,
    }),
    users,
  };
};

describe('AuthService', () => {
  it('registers a user and persists only the OTP digest', async () => {
    const harness = createHarness();
    const user = createUser();
    harness.users.findByEmail.mockResolvedValue(null);
    harness.passwords.hash.mockResolvedValue('encoded-password');
    harness.users.createLocalUser.mockResolvedValue(user);
    harness.otp.findLatest.mockResolvedValue(null);
    harness.otp.create.mockImplementation(async (input) =>
      createChallenge(input.codeDigest, {
        challengeKey: input.challengeKey,
        emailDigest: input.emailDigest,
      }),
    );

    await expect(
      harness.service.register({
        email: ' USER@example.com ',
        name: 'BodyTune User',
        password: 'strong-password',
      }),
    ).resolves.toEqual({
      email: 'user@example.com',
      requires_verification: true,
    });

    const sent = harness.email.sendOtp.mock.calls[0]?.[0];
    const stored = harness.otp.create.mock.calls[0]?.[0];
    expect(sent).toBeDefined();
    expect(stored).toBeDefined();
    expect(stored?.codeDigest).not.toBe(sent?.code);
    expect(
      harness.otpHasher.verifyCode(
        stored?.challengeKey ?? '',
        'register',
        sent?.code ?? '',
        stored?.codeDigest ?? '',
      ),
    ).toBe(true);
  });

  it('atomically consumes registration OTPs before establishing identity', async () => {
    const harness = createHarness();
    const user = createUser();
    const digest = harness.otpHasher.digestCode('challenge-key', 'register', '123456');
    harness.users.findByEmail.mockResolvedValue(user);
    harness.otp.findLatestActive.mockResolvedValue(createChallenge(digest));
    harness.otp.consumeActive.mockResolvedValue(true);
    harness.users.markEmailVerified.mockResolvedValue(createUser({ emailVerifiedAt: fixedNow }));

    const result = await harness.service.verifyRegistrationOtp({
      email: user.email,
      otp_code: '123456',
      purpose: 'register',
    });

    expect(harness.otp.consumeActive).toHaveBeenCalledWith('507f191e810c19729de860ea', fixedNow);
    expect(result.user.is_verified).toBe(true);
    expect(result.principal).toEqual({ sessionVersion: 0, userId: user.id });
  });

  it('counts a wrong OTP attempt without consuming the challenge', async () => {
    const harness = createHarness();
    const user = createUser();
    harness.users.findByEmail.mockResolvedValue(user);
    harness.otp.findLatestActive.mockResolvedValue(
      createChallenge(harness.otpHasher.digestCode('challenge-key', 'register', '123456')),
    );

    await expect(
      harness.service.verifyRegistrationOtp({
        email: user.email,
        otp_code: '654321',
        purpose: 'register',
      }),
    ).rejects.toBeInstanceOf(InvalidOtpError);
    expect(harness.otp.recordFailedAttempt).toHaveBeenCalledTimes(1);
    expect(harness.otp.consumeActive).not.toHaveBeenCalled();
  });

  it('uses reset challenges only to change the password and revoke sessions', async () => {
    const harness = createHarness();
    const user = createUser({ emailVerifiedAt: fixedNow, sessionVersion: 4 });
    const digest = harness.otpHasher.digestCode('challenge-key', 'forgot_password', '123456');
    harness.users.findByEmail.mockResolvedValue(user);
    harness.otp.findLatestActive.mockResolvedValue(
      createChallenge(digest, { purpose: 'forgot_password' }),
    );
    harness.otp.consumeActive.mockResolvedValue(true);
    harness.passwords.hash.mockResolvedValue('new-encoded-password');
    harness.users.updatePasswordAndRevokeSessions.mockResolvedValue(
      createUser({ emailVerifiedAt: fixedNow, sessionVersion: 5 }),
    );

    await expect(
      harness.service.resetPassword({
        email: user.email,
        new_password: 'new-strong-password',
        otp_code: '123456',
      }),
    ).resolves.toEqual({ email: user.email });
    expect(harness.users.updatePasswordAndRevokeSessions).toHaveBeenCalledWith(
      user.id,
      'new-encoded-password',
    );
  });

  it('never auto-links an administrator through Google email matching', async () => {
    const harness = createHarness();
    harness.users.findByGoogleSubject.mockResolvedValue(null);
    harness.users.findByEmail.mockResolvedValue(createUser({ role: 'admin' }));

    await expect(
      harness.service.authenticateGoogleIdentity({
        displayName: 'Admin',
        email: 'user@example.com',
        emailVerified: true,
        subject: 'google-subject',
      }),
    ).rejects.toBeInstanceOf(GoogleIdentityError);
    expect(harness.users.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('never auto-links an unverified local account through Google email matching', async () => {
    const harness = createHarness();
    harness.users.findByGoogleSubject.mockResolvedValue(null);
    harness.users.findByEmail.mockResolvedValue(createUser({ emailVerifiedAt: null }));

    await expect(
      harness.service.authenticateGoogleIdentity({
        displayName: 'Pending User',
        email: 'user@example.com',
        emailVerified: true,
        subject: 'google-subject',
      }),
    ).rejects.toBeInstanceOf(GoogleIdentityError);
    expect(harness.users.linkGoogleIdentity).not.toHaveBeenCalled();
  });

  it('does not let a failed email delivery consume the resend cooldown', async () => {
    const harness = createHarness();
    const user = createUser();
    harness.users.findByEmail.mockResolvedValue(user);
    harness.otp.findLatest.mockResolvedValue(
      createChallenge('unused-digest', {
        createdAt: new Date(fixedNow.getTime() - 1_000),
        invalidatedAt: new Date(fixedNow.getTime() - 500),
      }),
    );
    harness.otp.create.mockImplementation(async (input) =>
      createChallenge(input.codeDigest, {
        challengeKey: input.challengeKey,
        emailDigest: input.emailDigest,
      }),
    );

    await harness.service.resendOtp({ email: user.email, purpose: 'register' });

    expect(harness.otp.create).toHaveBeenCalledTimes(1);
    expect(harness.email.sendOtp).toHaveBeenCalledTimes(1);
  });
});
