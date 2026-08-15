'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type SendOtpActionResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to orchestrate sending an OTP.
 * Validates inputs, enforces phone uniqueness across different profiles,
 * and triggers the OTP dispatch logic.
 * 
 * @param params The user inputs: fullName, email, and phone.
 */
export async function sendOtpAction(params: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<SendOtpActionResponse> {
  const { fullName, email, phone } = params;

  // 1. Validate existence of required fields
  if (!fullName || !email || !phone) {
    return { success: false, error: 'All fields (Name, Email, and Phone) are required.' };
  }

  // 2. Normalize input values
  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  // 3. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  // 4. Validate phone format (10-digit Indian mobile number starting with 6-9)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalizedPhone)) {
    return { success: false, error: 'Please enter a valid 10-digit phone number.' };
  }

  try {
    const supabase = createAdminClient();

    // Check if the email address belongs to an active admin
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      console.error('Database query error checking admin duplication:', adminError);
      return { success: false, error: 'Unable to send verification code. Please try again.' };
    }

    if (adminRecord) {
      return { success: false, error: 'This is an administrator account. Please sign in using the Admin Login page.' };
    }

    // 4.5. Check if the email address already belongs to a registered profile
    const { data: existingEmailProfile, error: emailError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (emailError) {
      console.error('Database query error checking email duplication:', emailError);
      return { success: false, error: 'Unable to send verification code. Please try again.' };
    }

    if (existingEmailProfile) {
      return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
    }

    // 5. Check if the phone number already belongs to another profile
    const { data: existingProfile, error: dbError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (dbError) {
      console.error('Database query error checking phone duplication:', dbError);
      return { success: false, error: 'Unable to send verification code. Please try again.' };
    }

    if (existingProfile && existingProfile.email !== normalizedEmail) {
      return { success: false, error: 'Phone number is already registered.' };
    }

    // 6. Delegate business logic to the sendOtp helper
    const sendResult = await sendOtp(normalizedEmail, normalizedFullName);

    if (!sendResult.success) {
      return { success: false, error: sendResult.error };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected error in sendOtpAction server action:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
