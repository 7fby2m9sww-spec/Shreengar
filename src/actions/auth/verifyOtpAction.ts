'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/auth/verifyOtp';
import { createCustomerJwt } from '@/lib/auth/createJwt';
import { setCustomerSessionCookie } from '@/lib/auth/cookies';
import { OTP_LENGTH } from '@/lib/auth/config';

export type VerifyOtpActionResponse =
  | { success: true; redirect?: string }
  | { success: false; error: string };

/**
 * Server Action to verify the user-submitted OTP code.
 * Upon successful verification, it resolves/creates the customer profile,
 * issues a session JWT, and sets the secure HttpOnly cookie.
 * 
 * @param params The user inputs: fullName, email, phone, and the submitted otp.
 */
export async function verifyOtpAction(params: {
  fullName: string;
  email: string;
  phone: string;
  otp: string;
  flow?: string;
}): Promise<VerifyOtpActionResponse> {
  const { fullName, email, phone, otp, flow } = params;

  // 1. Validate existence of required fields
  if (!email || !otp) {
    return { success: false, error: 'Email and verification code are required.' };
  }

  // 2. Normalize input values
  const normalizedFullName = fullName ? fullName.trim() : '';
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone ? phone.trim() : '';
  const normalizedOtp = otp.trim();

  // Define generic error message matching verification guidelines
  const genericAuthError = 'Invalid or expired verification code.';
  const genericSystemError = 'Unable to verify code. Please try again.';

  // 3. Validate OTP format and length
  const digitsOnly = /^\d+$/;
  if (normalizedOtp.length !== OTP_LENGTH || !digitsOnly.test(normalizedOtp)) {
    return { success: false, error: genericAuthError };
  }

  try {
    // 4. Verify OTP using verifyOtp business logic
    const verifyResult = await verifyOtp(normalizedEmail, normalizedOtp);

    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }

    const supabase = createAdminClient();

    // 5. Query the existing profiles table by email
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Database query error checking profile existence:', profileError);
      return { success: false, error: genericSystemError };
    }

    let profileId: string;

    if (existingProfile) {
      if (flow === 'signup') {
        return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
      }
      // 6. Reuse existing profile ID
      profileId = existingProfile.id;
    } else {
      // 6.5. Require name and phone for new user registration
      if (!normalizedFullName || !normalizedPhone) {
        return { success: false, error: 'Full name and mobile number are required for new registration.' };
      }

      // 7. Create a new auth user via Supabase admin auth API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: {
          full_name: normalizedFullName,
          phone: normalizedPhone,
        },
      });

      if (createError) {
        console.error('Database error creating new auth user:', createError);
        return { success: false, error: genericSystemError };
      }

      if (!newUser?.user) {
        return { success: false, error: genericSystemError };
      }

      profileId = newUser.user.id;

      // 8. Confirm/Upsert user profile columns to ensure sync
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: profileId,
          email: normalizedEmail,
          full_name: normalizedFullName,
          phone: normalizedPhone,
        });

      if (upsertError) {
        console.error('Database error upserting user profile record:', upsertError);
        return { success: false, error: genericSystemError };
      }
    }

    // If flow is signup, stop here: account is created, but no session is established
    if (flow === 'signup') {
      return { success: true };
    }

    // 9. Collision policy enforcement: Clear any active admin Supabase Auth session
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const clientSupabase = await createClient();
      await clientSupabase.auth.signOut();
    } catch (signOutErr) {
      console.error('[verifyOtpAction] Failed to clear admin session during customer login:', signOutErr);
    }

    // 10. Generate a customer session JWT
    const token = await createCustomerJwt(profileId);

    // 11. Store the JWT in a secure HttpOnly cookie
    await setCustomerSessionCookie(token);

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in verifyOtpAction server action:', error);
    return { success: false, error: genericSystemError };
  }
}
