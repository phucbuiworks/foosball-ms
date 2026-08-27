import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth-jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('foosball_session');

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(sessionCookie.value);

  if (!payload) {
    // Session token expired or invalid, clear cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('foosball_session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
