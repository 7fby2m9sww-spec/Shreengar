import { cookies } from 'next/headers';
import { COOKIE_NAME, COOKIE_MAX_AGE, SAME_SITE } from './config';

/**
 * Sets the customer session token in a secure HttpOnly cookie.
 * 
 * @param token The signed customer JWT session token.
 */
export async function setCustomerSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: SAME_SITE,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Retrieves the customer session token from cookies if it exists.
 * 
 * @returns The session token string, or null if it does not exist.
 */
export async function getCustomerSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Clears the customer session cookie.
 */
export async function clearCustomerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
