'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type RequestPhoneChangeResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to request a phone number change.
 * Validates the new phone number, ensures it's unique, and sends an OTP to the CURRENT verified email address.
 */
export async function requestPhoneChangeAction(newPhone: string): Promise<RequestPhoneChangeResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to change your phone number.' };
  }

  const cleanPhone = newPhone.trim();

  // 2. Validate phone format (10 digit Indian number)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { success: false, error: 'Please enter a valid 10-digit phone number.' };
  }

  if (cleanPhone === session.profile.phone) {
    return { success: false, error: 'This is already your current phone number.' };
  }

  try {
    const supabase = createAdminClient();

    // 3. Ensure the new phone is not already taken by another profile
    const { data: existingProfile, error: dbError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (dbError) {
      console.error('Database query failed in requestPhoneChangeAction:', dbError);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }

    if (existingProfile) {
      return { success: false, error: 'This phone number is already in use by another account.' };
    }

    // 4. Send OTP to the CURRENT verified email address
    // We pass 'change_phone' as the purpose
    const otpResult = await sendOtp(session.profile.email, session.profile.full_name || undefined, 'change_phone');
    if (!otpResult.success) {
      return { success: false, error: 'Failed to send verification code to your email. Please try again later.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in requestPhoneChangeAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
