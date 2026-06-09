import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'osm_session';
const PROTECTED_PREFIXES = ['/dashboard', '/sandbox', '/releasify'];
const AUTH_PAGES = ['/login', '/signup'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/sandbox/:path*', '/releasify/:path*', '/login', '/signup'],
};
