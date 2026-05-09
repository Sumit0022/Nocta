import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';
  const isAdminApi = path.startsWith('/api/admin') && path !== '/api/admin/login' && path !== '/api/admin/logout';

  const hasToken = 
    request.cookies.has('token') || 
    request.cookies.has('admin_token') || 
    request.cookies.has('adminAuth') || 
    request.cookies.has('isLoggedIn');

  // 1. SMART FIX: Agar API par bina token ke call aayi, toh JSON error do, HTML redirect nahi!
  if (isAdminApi && !hasToken) {
    return NextResponse.json({ success: false, error: 'Unauthorized Access' }, { status: 401 });
  }

  // 2. Agar UI Page par bina token ke aaye, toh pehle ki tarah Login page par bhejo
  if (isAdminRoute && !hasToken) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // 3. Agar already logged in ho, toh login page se wapas dashboard bhejo
  if (path === '/admin/login' && hasToken) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
};