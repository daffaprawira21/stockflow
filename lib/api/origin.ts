const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

export function isOriginAllowed(request: Request, allowedOrigins: string[] = []): boolean {
  if (!isStateChangingMethod(request.method)) {
    return true;
  }

  const header = request.headers.get('origin');

  if (!header) {
    return false;
  }

  const origin = normalizeOrigin(header);
  const requestOrigin = normalizeOrigin(request.url);

  if (!origin || !requestOrigin) {
    return false;
  }

  if (origin === requestOrigin) {
    return true;
  }

  return allowedOrigins.some((allowed) => normalizeOrigin(allowed) === origin);
}
