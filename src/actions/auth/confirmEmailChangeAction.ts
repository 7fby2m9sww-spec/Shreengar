'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/auth/verifyOtp';

export type ConfirmEmailChangeResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to confirm an email change using an OTP.
 * Verifies the OTP, updates the profile email, and ensures the email is not already taken.
 */
export async function confirmEmailChangeAction(
  newEmail: string,
  otp: string
): Promise<ConfirmEmailChangeResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to change your email.' };
  }

  const cleanEmail = newEmail.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!cleanEmail || !cleanOtp) {
    return { success: false, error: 'Email and verification code are required.' };
  }

  try {
    const supabase = createAdminClient();

    // 2. Re-verify the email is still not taken (in case someone else claimed it between request and confirm)
    const { data: existingProfile, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dbError) {
      console.error('Database query failed in confirmEmailChangeAction:', dbError);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }

    if (existingProfile) {
      return { success: false, error: 'This email is already in use by another account.' };
    }

    // 3. Verify the OTP
    const otpResult = await verifyOtp(cleanEmail, cleanOtp, 'change_email');
    if (!otpResult.success) {
      return { success: false, error: otpResult.error };
    }

    // 4. Update the profile with the new email
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: cleanEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.profile.id);

    if (updateError) {
      console.error('Profile update failed in confirmEmailChangeAction:', updateError);
      return { success: false, error: 'Failed to update email. Please try again.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in confirmEmailChangeAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
