import { SignJWT } from 'jose';

export interface CustomerJwtPayload {
  sub: string;
  type: 'customer';
}

/**
 * Creates and signs a JSON Web Token (JWT) for a customer session using the HS256 algorithm.
 * The payload is strictly kept minimal to protect user privacy and minimize token payload size.
 * 
 * @param profileId The unique database identifier of the customer's profile.
 * @returns A promise resolving to the signed JWT string.
 */
export async function createCustomerJwt(profileId: string): Promise<string> {
  const secretString = process.env.JWT_SECRET;

  if (!secretString) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is missing.');
  }

  // Convert string secret into a Uint8Array key required by jose for HMAC signing
  const secretKey = new TextEncoder().encode(secretString);

  // Sign the JWT with a 7-day expiration time and HS256 algorithm
  const jwt = await new SignJWT({ type: 'customer' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(profileId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  return jwt;
}
