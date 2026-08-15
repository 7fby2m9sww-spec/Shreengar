/**
 * Authentication configuration constants for Shreengar.
 * Acts as the single source of truth for cookies, tokens, and verification policies.
 */

/**
 * Expiration duration for verification OTP codes in minutes.
 */
export const OTP_EXPIRY_MINUTES = 10;

/**
 * JWT token expiration format for signing (7 days).
 */
export const CUSTOMER_JWT_EXPIRY = '7d';

/**
 * Literal type identifier for customer authentication tokens.
 */
export const CUSTOMER_TOKEN_TYPE = 'customer' as const;

/**
 * Number of digits required for verification OTP.
 */
export const OTP_LENGTH = 6;

/**
 * Cookie identifier name for storing the HttpOnly session token.
 */
export const COOKIE_NAME = 'shreengar_session';

/**
 * SameSite cookie attribute value to prevent CSRF while allowing standard navigation.
 */
export const SAME_SITE = 'lax' as const;

/**
 * Max age duration of the session cookie in seconds (7 days).
 */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
