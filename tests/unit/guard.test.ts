import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSessionToken } from '../../lib/api/guard';

function requestWithCookie(cookie?: string): Request {
  const headers = new Headers();

  if (cookie !== undefined) {
    headers.set('cookie', cookie);
  }

  return new Request('http://localhost:3000/', { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('session cookie parsing', () => {
  it('returns the configured session token', () => {
    const request = requestWithCookie('theme=dark; stockflow_session=abc123; other=1');

    expect(getSessionToken(request)).toBe('abc123');
  });

  it('returns null when there is no cookie header', () => {
    expect(getSessionToken(requestWithCookie())).toBeNull();
  });

  it('returns null when the session cookie is absent', () => {
    expect(getSessionToken(requestWithCookie('theme=dark; other=1'))).toBeNull();
  });

  it('decodes a percent-encoded token', () => {
    const request = requestWithCookie('stockflow_session=abc%2Fdef%3D');

    expect(getSessionToken(request)).toBe('abc/def=');
  });

  it('keeps trailing equals signs in the token', () => {
    const request = requestWithCookie('stockflow_session=abc==; theme=dark');

    expect(getSessionToken(request)).toBe('abc==');
  });

  it('honours a custom cookie name', () => {
    vi.stubEnv('SESSION_COOKIE_NAME', 'custom_session');
    const request = requestWithCookie('stockflow_session=old; custom_session=new');

    expect(getSessionToken(request)).toBe('new');
  });

  it('ignores malformed cookie segments', () => {
    const request = requestWithCookie('malformed; stockflow_session=token');

    expect(getSessionToken(request)).toBe('token');
  });
});
