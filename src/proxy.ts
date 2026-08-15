import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { verifyCustomerJwt } from '@/lib/auth/verifyJwt';
import { COOKIE_NAME } from '@/lib/auth/config';

// Define the set of routes that require customer authentication
const PROTECTED_ROUTES = ['/account', '/orders', '/wishlist', '/checkout', '/profile', '/addresses', '/settings', '/coupons', '/notifications'];

// Define the set of routes used for customer authentication
const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/verify-otp'];

/**
 * Next.js Proxy (Middleware) to enforce customer authentication policies.
 * Redirects unauthenticated requests to protected pages, cleans up invalid session cookies,
 * and redirects authenticated users away from public auth pages.
 * Bypasses administrative and static routes to preserve admin authentication.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Explicitly ignore administrative, API, and static asset routes to delegate directly to updateSession
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path.startsWith('/images') ||
    path.startsWith('/_next') ||
    path === '/favicon.ico'
  ) {
    return await updateSession(request);
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => path === route);

  // 2. Handle request flow when no customer session cookie is present
  if (!token) {
    if (isProtectedRoute) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }
    return await updateSession(request);
  }

  // 3. Verify session JWT if cookie is present
  const verifyResult = await verifyCustomerJwt(token);

  if (!verifyResult.success) {
    // Session is invalid; clear the cookie and redirect to login if accessing protected resources
    if (isProtectedRoute) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      return response;
    }

    // Allow access to public pages but strip the invalid cookie
    const response = await updateSession(request);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // 4. Handle authenticated request flow
  if (isAuthRoute) {
    // Authenticated users visiting login/signup/verify-otp are redirected to their account page
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
