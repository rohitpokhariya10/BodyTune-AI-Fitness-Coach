import {
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

import type { OtpHasher, OtpPurpose, PasswordHasher } from './auth.types';

const SCRYPT_VERSION = 1;
// OWASP's current scrypt baseline: N=2^17, r=8, p=1.
const SCRYPT_COST = 131_072;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 256 * 1024 * 1024;

const scryptAsync = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

interface ParsedScryptHash {
  cost: number;
  digest: Buffer;
  parallelization: number;
  blockSize: number;
  salt: Buffer;
  version: number;
}

const parsePositiveInteger = (value: string | undefined): number | null => {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseScryptHash = (encodedHash: string): ParsedScryptHash | null => {
  const [algorithm, versionValue, costValue, blockSizeValue, parallelValue, salt, digest] =
    encodedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !digest) {
    return null;
  }

  const version = parsePositiveInteger(versionValue?.replace(/^v=/, ''));
  const cost = parsePositiveInteger(costValue?.replace(/^n=/, ''));
  const blockSize = parsePositiveInteger(blockSizeValue?.replace(/^r=/, ''));
  const parallelization = parsePositiveInteger(parallelValue?.replace(/^p=/, ''));

  if (!version || !cost || !blockSize || !parallelization) {
    return null;
  }

  try {
    const saltBuffer = Buffer.from(salt, 'base64url');
    const digestBuffer = Buffer.from(digest, 'base64url');
    if (saltBuffer.length < 16 || digestBuffer.length !== SCRYPT_KEY_LENGTH) {
      return null;
    }

    return {
      blockSize,
      cost,
      digest: digestBuffer,
      parallelization,
      salt: saltBuffer,
      version,
    };
  } catch {
    return null;
  }
};

const scryptOptions = (
  cost = SCRYPT_COST,
  blockSize = SCRYPT_BLOCK_SIZE,
  parallelization = SCRYPT_PARALLELIZATION,
): ScryptOptions => ({
  N: cost,
  maxmem: SCRYPT_MAX_MEMORY,
  p: parallelization,
  r: blockSize,
});

export class ScryptPasswordHasher implements PasswordHasher {
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const digest = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, scryptOptions());

    return [
      'scrypt',
      `v=${String(SCRYPT_VERSION)}`,
      `n=${String(SCRYPT_COST)}`,
      `r=${String(SCRYPT_BLOCK_SIZE)}`,
      `p=${String(SCRYPT_PARALLELIZATION)}`,
      salt.toString('base64url'),
      digest.toString('base64url'),
    ].join('$');
  }

  public async verify(password: string, encodedHash: string): Promise<boolean> {
    const parsed = parseScryptHash(encodedHash);
    if (!parsed) {
      await this.burn(password);
      return false;
    }

    try {
      const digest = await scryptAsync(
        password,
        parsed.salt,
        parsed.digest.length,
        scryptOptions(parsed.cost, parsed.blockSize, parsed.parallelization),
      );
      return timingSafeEqual(digest, parsed.digest);
    } catch {
      await this.burn(password);
      return false;
    }
  }

  public needsRehash(encodedHash: string): boolean {
    const parsed = parseScryptHash(encodedHash);
    if (parsed === null) {
      return true;
    }

    return (
      parsed.version !== SCRYPT_VERSION ||
      parsed.cost !== SCRYPT_COST ||
      parsed.blockSize !== SCRYPT_BLOCK_SIZE ||
      parsed.parallelization !== SCRYPT_PARALLELIZATION
    );
  }

  public async burn(password: string): Promise<void> {
    await scryptAsync(
      password,
      Buffer.from('bodytune-auth-dummy-salt-v1'),
      SCRYPT_KEY_LENGTH,
      scryptOptions(),
    );
  }
}

const safeDigestEqual = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export class HmacOtpHasher implements OtpHasher {
  public constructor(private readonly pepper: string) {
    if (Buffer.byteLength(pepper) < 32) {
      throw new Error('OTP pepper must contain at least 32 bytes');
    }
  }

  public digestEmail(email: string): string {
    return this.digest(`email:${normalizeEmail(email)}`);
  }

  public digestCode(challengeKey: string, purpose: OtpPurpose, code: string): string {
    return this.digest(`code:${challengeKey}:${purpose}:${code}`);
  }

  public verifyCode(
    challengeKey: string,
    purpose: OtpPurpose,
    code: string,
    expectedDigest: string,
  ): boolean {
    return safeDigestEqual(this.digestCode(challengeKey, purpose, code), expectedDigest);
  }

  private digest(value: string): string {
    return createHmac('sha256', this.pepper).update(value).digest('base64url');
  }
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const generateOtpCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

export const generateChallengeKey = (): string => randomBytes(24).toString('base64url');
