import { randomInt } from 'crypto';

/**
 * Generates a cryptographically secure 6-digit One-Time Password (OTP).
 * 
 * Why `crypto.randomInt` is used:
 * - It utilizes Node.js's underlying cryptographically secure pseudo-random number generator (CSPRNG).
 *   This draws from the operating system's entropy source (e.g., /dev/urandom) to ensure high unpredictability.
 * - It provides a uniform distribution over the specified range [min, max), which avoids modulo bias
 *   and ensures each possible OTP has an equal probability of being selected.
 * 
 * Why `Math.random` is avoided:
 * - `Math.random()` is a non-cryptographic PRNG (typically using xorshift or similar algorithms).
 *   Its internal state can be easily reconstructed after observing a small sequence of outputs,
 *   which would allow an attacker to predict future OTPs and compromise the authentication system.
 * 
 * @returns A 6-digit OTP string, padded with leading zeros if necessary (e.g., "048291").
 */
export function generateOtp(): string {
  // Generate a cryptographically secure random integer in the range [0, 1000000)
  const otpVal = randomInt(0, 1000000);
  
  // Pad with leading zeros to ensure a consistent 6-digit format
  return otpVal.toString().padStart(6, '0');
}
