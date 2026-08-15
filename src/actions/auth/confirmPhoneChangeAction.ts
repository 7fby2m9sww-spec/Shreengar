'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/auth/verifyOtp';

export type ConfirmPhoneChangeResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to confirm a phone change using an OTP.
 * Verifies the OTP (sent to current email), updates the profile phone, and ensures uniqueness.
 */
export async function confirmPhoneChangeAction(
  newPhone: string,
  otp: string
): Promise<ConfirmPhoneChangeResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to change your phone number.' };
  }

  const cleanPhone = newPhone.trim();
  const cleanOtp = otp.trim();

  if (!cleanPhone || !cleanOtp) {
    return { success: false, error: 'Phone number and verification code are required.' };
  }

  try {
    const supabase = createAdminClient();

    // 2. Re-verify the phone is still not taken (in case someone else claimed it between request and confirm)
    const { data: existingProfile, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (dbError) {
      console.error('Database query failed in confirmPhoneChangeAction:', dbError);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }

    if (existingProfile) {
      return { success: false, error: 'This phone number is already in use by another account.' };
    }

    // 3. Verify the OTP (which was sent to the current email)
    const otpResult = await verifyOtp(session.profile.email, cleanOtp, 'change_phone');
    if (!otpResult.success) {
      return { success: false, error: otpResult.error };
    }

    // 4. Update the profile with the new phone
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.profile.id);

    if (updateError) {
      console.error('Profile update failed in confirmPhoneChangeAction:', updateError);
      return { success: false, error: 'Failed to update phone number. Please try again.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in confirmPhoneChangeAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
