'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { sendOtp } from '@/lib/auth/sendOtp';

export type CheckLoginIdentifierResponse =
  | { success: true; type: 'admin'; email: string }
  | { success: true; type: 'customer'; email: string; phone?: string; message?: string }
  | { success: false; error: string };

/**
 * Server Action to check whether a login identifier (email or phone)
 * belongs to an active administrator or a customer.
 */
export async function checkLoginIdentifierAction(params: {
  email?: string;
  phone?: string;
}): Promise<CheckLoginIdentifierResponse> {
  const { email, phone } = params;

  if (!email && !phone) {
    return { success: false, error: 'Please enter your email address or mobile number.' };
  }

  try {
    const supabase = createAdminClient();

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return { success: false, error: 'Please enter a valid email address.' };
      }

      // 1. Check if it is an active admin
      const { data: adminRecord, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        console.error('[checkLoginIdentifierAction] Admin lookup error:', adminError);
        return { success: false, error: 'System error. Please try again.' };
      }

      if (adminRecord) {
        return { success: true, type: 'admin', email: normalizedEmail };
      }

      // 2. Check if it is a customer
      const { data: customerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (profileError) {
        console.error('[checkLoginIdentifierAction] Profile lookup error:', profileError);
        return { success: false, error: 'System error. Please try again.' };
      }

      if (!customerProfile) {
        // Neutral response to mitigate account enumeration
        return {
          success: true,
          type: 'customer',
          email: normalizedEmail,
          message: "If the account is eligible, we've sent a verification code.",
        };
      }

      // Send Customer OTP
      const otpRes = await sendOtp(normalizedEmail, customerProfile.full_name || undefined);
      if (!otpRes.success) {
        return { success: false, error: otpRes.error };
      }

      return { success: true, type: 'customer', email: normalizedEmail };
    } else if (phone) {
      const cleanPhone = phone.trim();
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
      }

      // 1. Lookup email from profile phone
      const { data: customerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (profileError) {
        console.error('[checkLoginIdentifierAction] Phone lookup error:', profileError);
        return { success: false, error: 'System error. Please try again.' };
      }

      if (!customerProfile || !customerProfile.email) {
        // Neutral response to mitigate account enumeration
        return {
          success: true,
          type: 'customer',
          email: '',
          phone: cleanPhone,
          message: "If the account is eligible, we've sent a verification code.",
        };
      }

      const resolvedEmail = customerProfile.email.trim().toLowerCase();

      // 2. Check if this resolved email is an active admin
      const { data: adminRecord, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', resolvedEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) {
        console.error('[checkLoginIdentifierAction] Admin phone lookup error:', adminError);
        return { success: false, error: 'System error. Please try again.' };
      }

      if (adminRecord) {
        return { success: true, type: 'admin', email: resolvedEmail };
      }

      // Send Customer OTP
      const otpRes = await sendOtp(resolvedEmail, customerProfile.full_name || undefined);
      if (!otpRes.success) {
        return { success: false, error: otpRes.error };
      }

      return { success: true, type: 'customer', email: resolvedEmail, phone: cleanPhone };
    }

    return { success: false, error: 'Invalid login details.' };
  } catch (error: any) {
    console.error('[checkLoginIdentifierAction] Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
