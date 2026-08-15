'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type RequestEmailChangeResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to request an email change.
 * Validates the new email, ensures it's unique, and sends an OTP to the NEW email address.
 */
export async function requestEmailChangeAction(newEmail: string): Promise<RequestEmailChangeResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to change your email.' };
  }

  const cleanEmail = newEmail.trim().toLowerCase();

  // 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  if (cleanEmail === session.profile.email.toLowerCase()) {
    return { success: false, error: 'This is already your current email address.' };
  }

  try {
    const supabase = createAdminClient();

    // 3. Ensure the new email is not already taken by another profile
    const { data: existingProfile, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dbError) {
      console.error('Database query failed in requestEmailChangeAction:', dbError);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }

    if (existingProfile) {
      return { success: false, error: 'This email is already in use by another account.' };
    }

    // 4. Send OTP to the new email address
    const otpResult = await sendOtp(cleanEmail, session.profile.full_name || undefined, 'change_email');
    if (!otpResult.success) {
      return { success: false, error: 'Failed to send verification code. Please try again later.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in requestEmailChangeAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
