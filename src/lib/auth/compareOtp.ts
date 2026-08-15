import bcrypt from 'bcryptjs';

/**
 * Compares a plain text OTP with a hashed OTP to check for a match.
 * 
 * Why bcrypt hashes cannot be decrypted:
 * - bcrypt is a one-way cryptographic hash function. It converts input data into a fixed-length string (hash)
 *   using mathematical operations that cannot be reversed. There is no decryption key or process that can
 *   turn the hash back into the original plain text OTP.
 * 
 * Why bcrypt.compare() is required:
 * - Because bcrypt hashes are salted (a random string is embedded in the hash) and one-way, you cannot
 *   hash the incoming OTP separately and perform a simple string equality check.
 * - `bcrypt.compare()` extracts the salt from the stored hash, hashes the incoming plain text OTP using that same salt
 *   and cost factor, and then performs a constant-time comparison to prevent timing attacks.
 * 
 * Why this protects against database leaks:
 * - If the database is breached, the attacker only obtains the cryptographically secure hashes, not the actual OTPs.
 *   Since they cannot decrypt the hashes and brute-forcing them takes significant time and computation,
 *   the attacker cannot gain access to active user authentication sessions.
 * 
 * @param otp The plain text OTP entered by the user.
 * @param hash The stored bcrypt hash of the valid OTP.
 * @returns A promise that resolves to true if they match, or false otherwise.
 */
export async function compareOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
