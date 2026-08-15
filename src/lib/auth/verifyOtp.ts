import { createAdminClient } from '@/lib/supabase/server';
import { compareOtp } from './compareOtp';

export type VerifyOtpResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Verifies a user-supplied OTP against the stored hashed OTP in the database.
 * Ensures strict security checks against expiration, replay attacks, and info leaks.
 * 
 * @param email The user's email address.
 * @param otp The plain text 6-digit OTP code to verify.
 * @param purpose The purpose of the OTP. Defaults to 'login'.
 * @returns A promise resolving to a VerifyOtpResult.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  purpose: string = 'login'
): Promise<VerifyOtpResult> {
  // 1. Normalize the email address immediately
  const normalizedEmail = email.trim().toLowerCase();

  // Define generic error message to prevent user enumeration and timing/information leaks
  const genericAuthError = 'Invalid or expired verification code.';
  const genericSystemError = 'Unable to verify code. Please try again.';

  try {
    // 2. Initialize Supabase admin client
    const supabase = createAdminClient();

    // 3. Retrieve the latest unused OTP record for this email and purpose
    const { data: record, error: fetchError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('purpose', purpose)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Database fetch error during OTP verification:', fetchError);
      return { success: false, error: genericSystemError };
    }

    // 4. If no active OTP record is found, return generic error (do not reveal if email exists)
    if (!record) {
      return { success: false, error: genericAuthError };
    }

    // 4.5. Reject a record already at or above 5 attempts
    if ((record.attempts || 0) >= 5) {
      return { success: false, error: genericAuthError };
    }

    // 5. Check if the OTP record has expired
    const now = new Date();
    const expiresAt = new Date(record.expires_at);

    if (now > expiresAt) {
      // Clean up the expired OTP from the database
      const { error: deleteError } = await supabase
        .from('email_otps')
        .delete()
        .eq('id', record.id);

      if (deleteError) {
        console.error('Failed to delete expired OTP record:', deleteError);
      }

      return { success: false, error: genericAuthError };
    }

    // 6. Compare the supplied OTP with the stored bcrypt hash
    const isValid = await compareOtp(otp, record.otp_hash);

    if (!isValid) {
      const newAttempts = (record.attempts || 0) + 1;
      const isMaxedOut = newAttempts >= 5;

      const { error: updateError } = await supabase
        .from('email_otps')
        .update({
          attempts: newAttempts,
          used: isMaxedOut ? true : false,
        })
        .eq('id', record.id);

      if (updateError) {
        console.error('Failed to update OTP attempts status:', updateError);
        return { success: false, error: genericSystemError };
      }

      return { success: false, error: genericAuthError };
    }

    // 7. Mark the OTP as used immediately to prevent replay attacks
    const { error: updateError } = await supabase
      .from('email_otps')
      .update({ used: true })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to update OTP used status:', updateError);
      return { success: false, error: genericSystemError };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception during OTP verification:', error);
    return { success: false, error: genericSystemError };
  }
}
