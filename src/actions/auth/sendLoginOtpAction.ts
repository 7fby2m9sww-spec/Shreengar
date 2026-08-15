'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type SendLoginOtpActionResponse =
  | { success: true; email: string; fullName: string; phone: string }
  | { success: false; error: string };

/**
 * Server Action to securely handle OTP requests for customer logins.
 * Resolves the user profile on the server using RLS-bypassed admin client,
 * verifies account existence, and delegates to the sendOtp helper.
 * Includes extensive logs and forwards original error messages.
 * 
 * @param params The search parameter: email or phone.
 * @returns A promise resolving to a SendLoginOtpActionResponse.
 */
export async function sendLoginOtpAction(params: {
  email?: string;
  phone?: string;
}): Promise<SendLoginOtpActionResponse> {
  const { email, phone } = params;

  if (!email && !phone) {
    return { success: false, error: 'Please enter your email address or mobile number.' };
  }

  try {
    const supabase = createAdminClient();
    let profile = null;

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, phone')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error('[sendLoginOtpAction] Database query error on email lookup:', error);
        return { success: false, error: `Database query error: ${error.message || JSON.stringify(error)}` };
      }

      if (!data) {
        return { success: false, error: 'No account found with this email.' };
      }

      profile = data;
    } else if (phone) {
      const cleanPhone = phone.trim();
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return { success: false, error: 'Please enter a valid 10-digit phone number.' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) {
        console.error('[sendLoginOtpAction] Database query error on phone lookup:', error);
        return { success: false, error: `Database query error: ${error.message || JSON.stringify(error)}` };
      }

      if (!data) {
        return { success: false, error: 'No account found with this phone number.' };
      }

      profile = data;
    }

    if (!profile || !profile.email) {
      return { success: false, error: 'An unexpected error occurred: Resolved profile is incomplete.' };
    }

    // Check if the user is an active admin and reject storefront access
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', profile.email.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      console.error('[sendLoginOtpAction] Database query error on admin lookup:', adminError);
      return { success: false, error: 'Unable to process request. Please try again.' };
    }

    if (adminRecord) {
      return { success: false, error: 'This is an administrator account. Please sign in using the Admin Login page.' };
    }

    const sendResult = await sendOtp(profile.email, profile.full_name || undefined);

    if (!sendResult.success) {
      return { success: false, error: sendResult.error };
    }

    return {
      success: true,
      email: profile.email,
      fullName: profile.full_name || '',
      phone: profile.phone || '',
    };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[sendLoginOtpAction] Unexpected exception:', err.message, err.stack);
    return { success: false, error: `Server exception: ${err.message || String(error)}` };
  }
}
