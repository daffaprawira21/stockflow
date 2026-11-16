import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'stockflow_session';

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Page protection excludes API routes, login, static assets, and public metadata files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots\\.txt$|login).*)'],
};
