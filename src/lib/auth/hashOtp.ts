import bcrypt from 'bcryptjs';

/**
 * Hashes a One-Time Password (OTP) using bcryptjs before storing it.
 * 
 * Why OTPs are hashed:
 * - OTPs, like passwords, must never be stored in plain text in the database.
 *   If the database is compromised, an attacker could read active OTPs and hijack user sessions.
 *   Hashing ensures that even if database access is leaked, the actual OTP cannot be easily reversed.
 * 
 * Why bcrypt is used:
 * - bcrypt is a slow, CPU-bound hashing function specifically designed for password hashing.
 *   Unlike fast cryptographic hash functions like SHA-256 or MD5 (which can be brute-forced billions
 *   of times per second), bcrypt makes brute-forcing computationally expensive.
 * - It automatically handles salting (generating a unique salt per hash), preventing rainbow table attacks.
 * 
 * Why a cost factor of 12 is chosen:
 * - The cost factor (work factor) determines the number of hashing rounds (2^12 = 4,096 iterations).
 *   A cost factor of 12 strikes a balance between security and performance (server latency).
 *   It provides strong resistance against modern offline brute-force attempts while keeping the server-side
 *   response time for legitimate users within acceptable limits (~100-250ms).
 * 
 * @param otp The plain text 6-digit OTP.
 * @returns The hashed OTP string.
 */
export async function hashOtp(otp: string): Promise<string> {
  // Generate a secure salt with a cost factor of 12
  const salt = await bcrypt.genSalt(12);
  
  // Hash the OTP with the generated salt
  const hash = await bcrypt.hash(otp, salt);
  
  return hash;
}
