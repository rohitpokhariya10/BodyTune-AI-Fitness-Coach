import { HmacOtpHasher, ScryptPasswordHasher } from './auth.security';

describe('authentication secrets', () => {
  it('hashes passwords with a salted scrypt encoding', async () => {
    const hasher = new ScryptPasswordHasher();
    const encoded = await hasher.hash('correct horse battery staple');

    await expect(hasher.verify('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(hasher.verify('wrong password', encoded)).resolves.toBe(false);
    expect(encoded).not.toContain('correct horse battery staple');
    expect(hasher.needsRehash(encoded)).toBe(false);
  }, 30_000);

  it('uses purpose-bound, challenge-bound constant-time OTP digests', () => {
    const hasher = new HmacOtpHasher('a-secure-test-pepper-that-is-longer-than-32-bytes');
    const digest = hasher.digestCode('challenge-a', 'register', '123456');

    expect(hasher.verifyCode('challenge-a', 'register', '123456', digest)).toBe(true);
    expect(hasher.verifyCode('challenge-a', 'forgot_password', '123456', digest)).toBe(false);
    expect(hasher.verifyCode('challenge-b', 'register', '123456', digest)).toBe(false);
    expect(digest).not.toContain('123456');
  });
});
