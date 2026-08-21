'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyOtp } from '@/lib/auth/verifyOtp';
import { clearCustomerSessionCookie } from '@/lib/auth/cookies';

export type VerifyAdminOtpResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to verify the administrator's 2FA OTP code,
 * generate a magiclink, execute token handshake, and save the session.
 */
export async function verifyAdminOtpAction(params: {
  email: string;
  otp: string;
}): Promise<VerifyAdminOtpResponse> {
  const { email, otp } = params;

  if (!email || !otp) {
    return { success: false, error: 'Email and verification code are required.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOtp = otp.trim();

  try {
    // 1. Verify OTP using bcrypt database hash verification
    const verifyResult = await verifyOtp(normalizedEmail, normalizedOtp);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }

    const supabase = createAdminClient();

    // 2. Fetch active administrative user record
    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('*, role:roles(*)')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError || !adminRecord) {
      return { success: false, error: 'Access Denied. Account is not registered for administrative access.' };
    }

    // 3. Generate magiclink to establish Supabase session
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[verifyAdminOtpAction] generateLink error:', linkError);
      return { success: false, error: 'Failed to generate administrative login session.' };
    }

    // 4. Fetch the link programmatically to retrieve tokens
    const verifyRes = await fetch(linkData.properties.action_link, {
      redirect: 'manual',
    });
    const locationHeader = verifyRes.headers.get('location');
    if (locationHeader && locationHeader.includes('#')) {
      const hash = locationHeader.split('#')[1];
      const hashParams = new URLSearchParams(hash);
      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');
      if (access_token && refresh_token) {
        const clientSupabase = await createClient();
        await clientSupabase.auth.setSession({ access_token, refresh_token });
        await clearCustomerSessionCookie();
      } else {
        return { success: false, error: 'Verification failed. Could not parse login session.' };
      }
    } else {
      return { success: false, error: 'Verification failed. Invalid session handshake.' };
    }

    // 5. Update last login timestamp using admin client to bypass RLS
    await supabase
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', adminRecord.id);

    return { success: true };
  } catch (error: any) {
    console.error('[verifyAdminOtpAction] Unexpected exception during verification:', error);
    return { success: false, error: 'Verification failed.' };
  }
}
