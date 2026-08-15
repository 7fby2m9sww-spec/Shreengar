// src/actions/auth/adminLogoutAction.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { clearCustomerSessionCookie } from '@/lib/auth/cookies';

export type AdminLogoutResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to log out an administrator.
 * Performs Supabase Auth signOut (clears the server‑side session cookie) and
 * defensively clears the custom shreengar_session cookie.
 */
export async function adminLogoutAction(): Promise<AdminLogoutResponse> {
  try {
    const supabase = await createClient();
    // Sign out from Supabase Auth – removes the HttpOnly auth cookie.
    const { error: signOutError } = await supabase.auth.signOut();
    // Clear the legacy customer session cookie as a defensive measure.
    await clearCustomerSessionCookie();
    if (signOutError) {
      console.error('Admin signOut error:', signOutError);
      return { success: false, error: 'Unable to log out admin. Please try again.' };
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Admin logout failed:', error);
    return { success: false, error: 'Unable to log out admin. Please try again.' };
  }
}
