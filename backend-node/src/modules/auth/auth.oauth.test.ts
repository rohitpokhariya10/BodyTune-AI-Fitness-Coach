import type { Request } from 'express';

import { ValidationError } from '../../errors/ValidationError';
import {
  buildFrontendRedirect,
  consumeOAuthReturnPath,
  defaultOAuthReturnPath,
  getGoogleOAuthIdentity,
  setGoogleOAuthIdentity,
  validateOAuthReturnPath,
} from './auth.oauth';
import type { AuthenticatedIdentity } from './auth.types';

const identity: AuthenticatedIdentity = {
  principal: { sessionVersion: 2, userId: '507f1f77bcf86cd799439011' },
  user: {
    age: null,
    created_at: '2026-07-18T00:00:00.000Z',
    email: 'user@example.com',
    experience_level: 'beginner',
    fitness_goal: 'general_fitness',
    height_cm: null,
    id: '507f1f77bcf86cd799439011',
    is_verified: true,
    name: 'BodyTune User',
    role: 'user',
    updated_at: '2026-07-18T00:00:00.000Z',
    weight_kg: null,
  },
};

describe('OAuth boundary helpers', () => {
  it('stores callback identity outside the public request fields', () => {
    const request = {} as Request;
    setGoogleOAuthIdentity(request, identity);

    expect(getGoogleOAuthIdentity(request)).toEqual(identity);
    expect(Reflect.get(request, 'user')).toBeUndefined();
  });

  it('uses only exact allowlisted return paths', () => {
    const allowed = ['/dashboard', '/admin'];

    expect(defaultOAuthReturnPath(allowed)).toBe('/dashboard');
    expect(validateOAuthReturnPath(undefined, allowed)).toBe('/dashboard');
    expect(validateOAuthReturnPath('/admin', allowed)).toBe('/admin');
    expect(() => validateOAuthReturnPath('//attacker.example', allowed)).toThrow(ValidationError);
    expect(() => validateOAuthReturnPath('/dashboard?next=evil', allowed)).toThrow(ValidationError);
    expect(consumeOAuthReturnPath('//attacker.example', allowed)).toBe('/dashboard');
  });

  it('builds redirects from the fixed frontend URL and clears inherited URL data', () => {
    expect(buildFrontendRedirect('https://app.example.com/base?unsafe=value', '/dashboard')).toBe(
      'https://app.example.com/dashboard',
    );
    expect(buildFrontendRedirect('https://app.example.com/base', '/login', 'failed')).toBe(
      'https://app.example.com/login?oauth=failed',
    );
  });
});
