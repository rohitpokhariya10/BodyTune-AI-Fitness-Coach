import { registerBodySchema, verifyOtpBodySchema } from './auth.validation';

describe('authentication request validation', () => {
  it('normalizes safe user registration input', () => {
    expect(
      registerBodySchema.parse({
        email: '  USER@Example.COM ',
        name: ' BodyTune User ',
        password: 'strong-password',
        role: 'user',
      }),
    ).toEqual({
      email: 'user@example.com',
      name: 'BodyTune User',
      password: 'strong-password',
      role: 'user',
    });
  });

  it('rejects public admin registration and legacy admin keys', () => {
    expect(
      registerBodySchema.safeParse({
        admin_registration_key: 'browser-secret',
        email: 'admin@example.com',
        name: 'Unsafe Admin',
        password: 'strong-password',
        role: 'admin',
      }).success,
    ).toBe(false);
  });

  it('never accepts a reset challenge on the login-producing verification route', () => {
    expect(
      verifyOtpBodySchema.safeParse({
        email: 'user@example.com',
        otp_code: '123456',
        purpose: 'forgot_password',
      }).success,
    ).toBe(false);
  });
});
