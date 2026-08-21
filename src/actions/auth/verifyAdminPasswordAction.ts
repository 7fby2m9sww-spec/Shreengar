'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type VerifyAdminPasswordResponse =
  | { success: true; email: string }
  | { success: false; error: string };

/**
 * Server Action to securely verify the administrator's password,
 * perform role/active status verification, and trigger OTP dispatch.
 */
export async function verifyAdminPasswordAction(params: {
  email: string;
  password?: string;
}): Promise<VerifyAdminPasswordResponse> {
  const { email, password } = params;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const supabase = await createClient();

    // 1. Authenticate password via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Invalid administrative credentials.' };
    }

    // 2. Double-check they are active admin (RLS bypass check)
    const adminSupabase = createAdminClient();
    const { data: adminRecord, error: adminError } = await adminSupabase
      .from('admin_users')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminRecord) {
      await supabase.auth.signOut();
      return { success: false, error: 'Access Denied. Account is not registered for administrative access.' };
    }

    // 3. Immediately sign out to prevent one-factor session completion
    await supabase.auth.signOut();

    // 4. Send the OTP
    const otpRes = await sendOtp(normalizedEmail);
    if (!otpRes.success) {
      return { success: false, error: otpRes.error };
    }

    return { success: true, email: normalizedEmail };
  } catch (error: any) {
    console.error('[verifyAdminPasswordAction] Exception caught:', error);
    return { success: false, error: 'Password verification failed.' };
  }
}
