import { describe, expect, it } from 'vitest';
import { isOriginAllowed, isStateChangingMethod } from '../../lib/api/origin';

function request(method: string, origin?: string): Request {
  const headers = new Headers();

  if (origin !== undefined) {
    headers.set('origin', origin);
  }

  return new Request('http://localhost:3000/api/auth/login', { method, headers });
}

describe('state-changing methods', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('treats %s as state changing', (method) => {
    expect(isStateChangingMethod(method)).toBe(true);
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('treats %s as safe', (method) => {
    expect(isStateChangingMethod(method)).toBe(false);
  });
});

describe('origin validation', () => {
  it('allows safe methods without an origin header', () => {
    expect(isOriginAllowed(request('GET'))).toBe(true);
  });

  it('accepts a same-origin request', () => {
    expect(isOriginAllowed(request('POST', 'http://localhost:3000'))).toBe(true);
  });

  it('accepts an explicitly allowed origin', () => {
    expect(
      isOriginAllowed(request('POST', 'http://127.0.0.1:3000'), ['http://127.0.0.1:3000']),
    ).toBe(true);
  });

  it('rejects a foreign origin', () => {
    expect(isOriginAllowed(request('POST', 'https://evil.example'), ['http://localhost:3000'])).toBe(
      false,
    );
  });

  it('rejects a state-changing request with no origin header', () => {
    expect(isOriginAllowed(request('POST'))).toBe(false);
  });

  it('rejects a malformed origin', () => {
    expect(isOriginAllowed(request('POST', 'not a url'))).toBe(false);
  });
});
