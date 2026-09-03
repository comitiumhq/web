import { describe, expect, it } from 'vitest';

import {
  authSearchSchema,
  buildAuthRoute,
  isAuthRoutePath,
  resolveInternalReturnTo,
  resolveNonAuthReturnTo,
} from '../navigation';

describe('authSearchSchema', () => {
  it('accepts an optional return target', () => {
    expect(authSearchSchema.parse({ returnTo: '/applications' })).toEqual({ returnTo: '/applications' });
    expect(authSearchSchema.parse({})).toEqual({});
  });
});

describe('isAuthRoutePath', () => {
  it.each(['/login', '/login/help', '/signup', '/signup/help'])('recognizes auth route %s', (value) => {
    expect(isAuthRoutePath(value)).toBe(true);
  });

  it.each(['/', '/login-help', '/signup-complete'])('rejects non-auth route %s', (value) => {
    expect(isAuthRoutePath(value)).toBe(false);
  });
});

describe('buildAuthRoute', () => {
  it('preserves a complete internal destination as one encoded search value', () => {
    expect(buildAuthRoute('/login', '/account?source=menu#methods')).toBe(
      '/login?returnTo=%2Faccount%3Fsource%3Dmenu%23methods',
    );
  });
});

describe('resolveInternalReturnTo', () => {
  it('preserves an internal path with query and hash', () => {
    expect(resolveInternalReturnTo('/careers/acme/jobs/engineer/apply?source=jobs#form', '/applications')).toBe(
      '/careers/acme/jobs/engineer/apply?source=jobs#form',
    );
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '%2F%2Fevil.example',
    '%252F%252Fevil.example',
    '/\\evil.example',
    '%2F%5Cevil.example',
    'applications',
    '',
    null,
    undefined,
  ])('rejects unsafe or malformed return target %s', (value) => {
    expect(resolveInternalReturnTo(value, '/applications')).toBe('/applications');
  });
});

describe('resolveNonAuthReturnTo', () => {
  it.each(['/login', '/login?returnTo=%2F', '/login/help', '/signup', '/signup?returnTo=%2F', '/signup/help'])(
    'rejects an auth route target %s',
    (value) => {
      expect(resolveNonAuthReturnTo(value, '/')).toBe('/');
    },
  );

  it('preserves a non-auth internal target', () => {
    expect(resolveNonAuthReturnTo('/org/123/jobs', '/')).toBe('/org/123/jobs');
    expect(resolveNonAuthReturnTo('/login-help', '/')).toBe('/login-help');
  });
});
