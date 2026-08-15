'use server';

import { clearCustomerSessionCookie } from '@/lib/auth/cookies';
import { createClient } from '@/lib/supabase/server';

export type LogoutActionResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to log out the application session.
 * Clears the HttpOnly session cookie and signs out of Supabase Auth.
 * 
 * @returns A promise resolving to a LogoutActionResponse.
 */
export async function logoutAction(): Promise<LogoutActionResponse> {
  try {
    // 1. Clear the HttpOnly customer session cookie
    await clearCustomerSessionCookie();

    // 2. Sign out of the admin Supabase Auth session
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (supabaseErr) {
      console.error('Failed to sign out of Supabase Auth during logout:', supabaseErr);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception during customer logout:', error);
    
    return { success: false, error: 'Unable to log out. Please try again.' };
  }
}
