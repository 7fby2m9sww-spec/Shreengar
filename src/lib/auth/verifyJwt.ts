import { jwtVerify } from 'jose';
import { CUSTOMER_TOKEN_TYPE } from './config';
import { CustomerJwtPayload } from './createJwt';

export type VerifyJwtResult =
  | { success: true; payload: CustomerJwtPayload }
  | { success: false; error: string };

/**
 * Verifies a customer JWT session token using the jose library.
 * Performs strict validations including signature validity, expiration status, algorithm alignment,
 * subject existence, and token type matching.
 * 
 * @param token The raw signed JWT session string.
 * @returns A promise resolving to a VerifyJwtResult.
 */
export async function verifyCustomerJwt(token: string): Promise<VerifyJwtResult> {
  const secretString = process.env.JWT_SECRET;

  if (!secretString) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is missing.');
  }

  // Convert string secret into a Uint8Array key required by jose for HMAC verification
  const secretKey = new TextEncoder().encode(secretString);

  // Return generic error message to prevent security enumeration
  const genericError = 'Invalid session.';

  try {
    // Verify the signature, expiration, and require the HS256 algorithm
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    // Enforce that a subject (sub) exists and the token type is exactly CUSTOMER_TOKEN_TYPE
    if (!payload.sub || payload.type !== CUSTOMER_TOKEN_TYPE) {
      return { success: false, error: genericError };
    }

    return {
      success: true,
      payload: {
        sub: payload.sub,
        type: payload.type as 'customer',
      },
    };
  } catch (error: unknown) {
    // Log exception details for server-side telemetry (e.g. expired, invalid signature)
    console.error('JWT verification failed:', error);
    
    return { success: false, error: genericError };
  }
}
