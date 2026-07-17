import { ExternalServiceError } from '../../errors/ExternalServiceError';
import { serializeSafeUser } from '../users/user.serializer';
import type { GoogleIdentityInput, UserEntity, UserProfileEntity } from '../users/user.types';
import type { UserRepositoryPort } from '../users/user.repository';
import {
  GoogleIdentityError,
  InvalidCredentialsError,
  InvalidOtpError,
  OtpRequestRateLimitError,
} from './auth.errors';
import { generateChallengeKey, generateOtpCode, normalizeEmail } from './auth.security';
import type {
  AuthenticatedIdentity,
  AuthMessageData,
  Clock,
  EmailGateway,
  LoginInput,
  LoginResult,
  OtpHasher,
  OtpPurpose,
  PasswordHasher,
  RegisterInput,
  RegisterResult,
  ResendOtpInput,
  ResetPasswordInput,
  SessionPrincipal,
  VerifyOtpInput,
} from './auth.types';
import { systemClock } from './auth.types';
import type { OtpChallengeEntity, OtpChallengeRepositoryPort } from './otp-challenge.repository';

export interface AuthServiceOptions {
  otpExpiresMinutes: number;
  otpMaxAttempts: number;
  otpResendCooldownSeconds: number;
}

export interface AuthServiceDependencies {
  clock?: Clock;
  emailGateway: EmailGateway;
  options: AuthServiceOptions;
  otpHasher: OtpHasher;
  otpRepository: OtpChallengeRepositoryPort;
  passwordHasher: PasswordHasher;
  userRepository: UserRepositoryPort;
}

interface IssueChallengeOptions {
  email: string;
  purpose: OtpPurpose;
  suppressCooldownError?: boolean;
  suppressDeliveryError?: boolean;
  userId: string;
}

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11_000;

const profileFromRegistration = (input: RegisterInput): Partial<UserProfileEntity> => ({
  ...(input.age == null ? {} : { age: input.age }),
  ...(input.experience_level == null ? {} : { experienceLevel: input.experience_level }),
  ...(input.fitness_goal == null ? {} : { fitnessGoal: input.fitness_goal }),
  ...(input.height_cm == null ? {} : { heightCm: input.height_cm }),
  ...(input.weight_kg == null ? {} : { weightKg: input.weight_kg }),
});

export class AuthService {
  private readonly clock: Clock;
  private readonly emailGateway: EmailGateway;
  private readonly options: AuthServiceOptions;
  private readonly otpHasher: OtpHasher;
  private readonly otpRepository: OtpChallengeRepositoryPort;
  private readonly passwordHasher: PasswordHasher;
  private readonly userRepository: UserRepositoryPort;

  public constructor(dependencies: AuthServiceDependencies) {
    this.clock = dependencies.clock ?? systemClock;
    this.emailGateway = dependencies.emailGateway;
    this.options = dependencies.options;
    this.otpHasher = dependencies.otpHasher;
    this.otpRepository = dependencies.otpRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.userRepository = dependencies.userRepository;
  }

  public async register(input: RegisterInput): Promise<RegisterResult> {
    const email = normalizeEmail(input.email);
    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      const passwordHash = await this.passwordHasher.hash(input.password);
      try {
        user = await this.userRepository.createLocalUser({
          email,
          name: input.name.trim(),
          passwordHash,
          profile: profileFromRegistration(input),
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        user = await this.userRepository.findByEmail(email);
      }
    } else {
      await this.passwordHasher.burn(input.password);
    }

    if (user?.status === 'active' && user.emailVerifiedAt === null) {
      await this.issueChallenge({
        email,
        purpose: 'register',
        suppressCooldownError: true,
        userId: user.id,
      });
    }

    return { email, requires_verification: true };
  }

  public async login(input: LoginInput): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const user = await this.userRepository.findByEmailForAuthentication(email);

    if (!user?.passwordHash || user.status !== 'active') {
      await this.passwordHasher.burn(input.password);
      throw new InvalidCredentialsError();
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    if (this.passwordHasher.needsRehash(user.passwordHash)) {
      const upgradedHash = await this.passwordHasher.hash(input.password);
      await this.userRepository.updatePasswordHash(user.id, upgradedHash);
    }

    if (user.emailVerifiedAt === null) {
      await this.issueChallenge({
        email,
        purpose: 'register',
        suppressCooldownError: true,
        suppressDeliveryError: true,
        userId: user.id,
      });
      return {
        email,
        requires_verification: true,
        status: 'verification_required',
      };
    }

    await this.userRepository.touchLastLogin(user.id, this.clock.now());
    return {
      ...this.authenticatedIdentity(user),
      status: 'authenticated',
    };
  }

  public async verifyRegistrationOtp(input: VerifyOtpInput): Promise<AuthenticatedIdentity> {
    const email = normalizeEmail(input.email);
    const user = await this.userRepository.findByEmail(email);
    if (user?.status !== 'active') {
      throw new InvalidOtpError();
    }

    const challenge = await this.consumeChallenge(email, 'register', input.otp_code);
    if (challenge.userId !== user.id) {
      throw new InvalidOtpError();
    }

    const verifiedUser = await this.userRepository.markEmailVerified(user.id, this.clock.now());
    if (!verifiedUser) {
      throw new InvalidOtpError();
    }

    await this.userRepository.touchLastLogin(verifiedUser.id, this.clock.now());
    return this.authenticatedIdentity(verifiedUser);
  }

  public async resendOtp(input: ResendOtpInput): Promise<AuthMessageData> {
    const email = normalizeEmail(input.email);
    const user =
      input.purpose === 'forgot_password'
        ? await this.userRepository.findByEmailForAuthentication(email)
        : await this.userRepository.findByEmail(email);

    if (user?.status === 'active') {
      const purposeAllowed =
        (input.purpose === 'forgot_password' && user.passwordHash !== undefined) ||
        (input.purpose === 'register' && user.emailVerifiedAt === null);
      if (purposeAllowed) {
        await this.issueChallenge({
          email,
          purpose: input.purpose,
          suppressCooldownError: true,
          suppressDeliveryError: true,
          userId: user.id,
        });
      }
    }

    return { email };
  }

  public async forgotPassword(emailValue: string): Promise<AuthMessageData> {
    const email = normalizeEmail(emailValue);
    const user = await this.userRepository.findByEmailForAuthentication(email);

    if (user?.status === 'active' && user.passwordHash) {
      await this.issueChallenge({
        email,
        purpose: 'forgot_password',
        suppressCooldownError: true,
        suppressDeliveryError: true,
        userId: user.id,
      });
    }

    return { email };
  }

  public async resetPassword(input: ResetPasswordInput): Promise<AuthMessageData> {
    const email = normalizeEmail(input.email);
    const user = await this.userRepository.findByEmail(email);
    if (user?.status !== 'active') {
      await this.passwordHasher.burn(input.new_password);
      throw new InvalidOtpError();
    }

    const challenge = await this.consumeChallenge(email, 'forgot_password', input.otp_code);
    if (challenge.userId !== user.id) {
      throw new InvalidOtpError();
    }

    const passwordHash = await this.passwordHasher.hash(input.new_password);
    const updated = await this.userRepository.updatePasswordAndRevokeSessions(
      user.id,
      passwordHash,
    );
    if (!updated) {
      throw new InvalidOtpError();
    }

    return { email };
  }

  public async authenticateGoogleIdentity(
    identity: GoogleIdentityInput,
  ): Promise<AuthenticatedIdentity> {
    if (!identity.emailVerified || !identity.subject.trim() || !identity.email.trim()) {
      throw new GoogleIdentityError();
    }

    const normalizedIdentity: GoogleIdentityInput = {
      ...identity,
      displayName: identity.displayName.trim().slice(0, 120) || 'BodyTune User',
      email: normalizeEmail(identity.email),
      subject: identity.subject.trim(),
    };

    let user = await this.userRepository.findByGoogleSubject(normalizedIdentity.subject);
    if (!user) {
      const emailUser = await this.userRepository.findByEmail(normalizedIdentity.email);
      if (emailUser) {
        if (
          emailUser.status !== 'active' ||
          emailUser.role === 'admin' ||
          emailUser.emailVerifiedAt === null
        ) {
          throw new GoogleIdentityError();
        }
        user = await this.userRepository.linkGoogleIdentity(emailUser.id, normalizedIdentity);
        if (!user) {
          throw new GoogleIdentityError();
        }
      } else {
        try {
          user = await this.userRepository.createGoogleUser(normalizedIdentity);
        } catch (error) {
          if (!isDuplicateKeyError(error)) {
            throw error;
          }
          user = await this.userRepository.findByGoogleSubject(normalizedIdentity.subject);
        }
      }
    }

    if (user?.status !== 'active') {
      throw new GoogleIdentityError();
    }

    await this.userRepository.touchLastLogin(user.id, this.clock.now());
    return this.authenticatedIdentity(user);
  }

  public async getSessionIdentity(
    principal: SessionPrincipal,
  ): Promise<AuthenticatedIdentity | null> {
    const user = await this.userRepository.findBySessionPrincipal(
      principal.userId,
      principal.sessionVersion,
    );
    return user ? this.authenticatedIdentity(user) : null;
  }

  private authenticatedIdentity(user: UserEntity): AuthenticatedIdentity {
    return {
      principal: { sessionVersion: user.sessionVersion, userId: user.id },
      user: serializeSafeUser(user),
    };
  }

  private async issueChallenge(options: IssueChallengeOptions): Promise<boolean> {
    const now = this.clock.now();
    const emailDigest = this.otpHasher.digestEmail(options.email);
    const latest = await this.otpRepository.findLatest(emailDigest, options.purpose);
    const cooldownMilliseconds = this.options.otpResendCooldownSeconds * 1_000;

    if (
      latest?.invalidatedAt === null &&
      now.getTime() - latest.createdAt.getTime() < cooldownMilliseconds
    ) {
      if (options.suppressCooldownError) {
        return false;
      }
      throw new OtpRequestRateLimitError();
    }

    const code = generateOtpCode();
    const challengeKey = generateChallengeKey();
    await this.otpRepository.invalidateOutstanding(emailDigest, options.purpose, now);
    const challenge = await this.otpRepository.create({
      challengeKey,
      codeDigest: this.otpHasher.digestCode(challengeKey, options.purpose, code),
      emailDigest,
      expiresAt: new Date(now.getTime() + this.options.otpExpiresMinutes * 60_000),
      maxAttempts: this.options.otpMaxAttempts,
      purpose: options.purpose,
      userId: options.userId,
    });

    try {
      await this.emailGateway.sendOtp({
        code,
        expiresInMinutes: this.options.otpExpiresMinutes,
        purpose: options.purpose,
        to: options.email,
      });
    } catch (error) {
      await this.otpRepository.invalidate(challenge.id, this.clock.now());
      if (!options.suppressDeliveryError) {
        throw new ExternalServiceError('Verification email could not be sent', error);
      }
      return false;
    }

    return true;
  }

  private async consumeChallenge(
    email: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<OtpChallengeEntity> {
    const now = this.clock.now();
    const challenge = await this.otpRepository.findLatestActive(
      this.otpHasher.digestEmail(email),
      purpose,
      now,
    );
    if (!challenge) {
      throw new InvalidOtpError();
    }

    if (!this.otpHasher.verifyCode(challenge.challengeKey, purpose, code, challenge.codeDigest)) {
      await this.otpRepository.recordFailedAttempt(challenge.id, now);
      throw new InvalidOtpError();
    }

    const consumed = await this.otpRepository.consumeActive(challenge.id, now);
    if (!consumed) {
      throw new InvalidOtpError();
    }

    return challenge;
  }
}
