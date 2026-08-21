import 'server-only';
import { getCustomerSessionCookie, clearCustomerSessionCookie } from './cookies';
import { verifyCustomerJwt } from './verifyJwt';
import { createAdminClient, createClient } from '../supabase/server.ts';

export type ApplicationSession =
  | {
      type: 'anonymous';
    }
  | {
      type: 'customer';
      customerId: string;
      email: string;
      fullName: string;
      gender: string | null;
      phone: string | null;
      avatar_url: string | null;
      role: string;
    }
  | {
      type: 'admin';
      adminUserId: string;
      authUserId: string;
      email: string;
      fullName: string;
      role: string;
    };

/**
 * Dedicated server-side session resolver.
 * Inspects both custom customer session JWT cookies and Supabase Auth admin sessions,
 * returning a unified ApplicationSession.
 * Automatically enforces the collision policy to prevent hybrid identities.
 */
export async function resolveApplicationSession(): Promise<ApplicationSession> {
  try {
    // 1. Retrieve current session credentials
    const customerToken = await getCustomerSessionCookie();
    
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    // 2. Collision policy enforcement:
    // If both are present, customer session takes precedence on the customer storefront.
    // We explicitly clear the admin Supabase session context to prevent hybrid states.
    if (customerToken && authUser) {
      console.warn('[Collision Policy] Detected both customer JWT and admin Supabase session. Clearing admin session.');
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Failed to sign out admin session during collision cleanup:', signOutErr);
      }
    }

    // 3. Resolve Customer Session
    if (customerToken) {
      const verifyResult = await verifyCustomerJwt(customerToken);
      if (verifyResult.success) {
        const adminSupabase = createAdminClient();
        const { data: profile, error: dbError } = await adminSupabase
          .from('profiles')
          .select('id, email, full_name, gender, phone, avatar_url, role')
          .eq('id', verifyResult.payload.sub)
          .maybeSingle();

        if (!dbError && profile) {
          return {
            type: 'customer',
            customerId: profile.id,
            email: profile.email,
            fullName: profile.full_name || 'Customer',
            gender: profile.gender || null,
            phone: profile.phone || null,
            avatar_url: profile.avatar_url || null,
            role: profile.role || 'customer',
          };
        }
      }
      
      // Auto-clear stale/invalid customer session cookie
      await clearCustomerSessionCookie();
    }

    // 4. Resolve Admin Session
    if (authUser && !customerToken) {
      const adminSupabase = createAdminClient();
      const { data: adminRecord, error: adminErr } = await adminSupabase
        .from('admin_users')
        .select('id, email, full_name, role:roles(code)')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!adminErr && adminRecord) {
        const adminAny = adminRecord as any;
        const roleCode = Array.isArray(adminAny.role) ? adminAny.role[0]?.code : adminAny.role?.code;
        if (roleCode) {
          return {
            type: 'admin',
            adminUserId: adminRecord.id,
            authUserId: authUser.id,
            email: adminRecord.email,
            fullName: adminRecord.full_name || 'Admin',
            role: roleCode,
          };
        }
      }

      // If active admin record not found, immediately invalidate/sign out the authUser session
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error('Failed to sign out invalid admin user:', signOutErr);
      }
    }

    return { type: 'anonymous' };
  } catch (error: any) {
    // Rethrow Next.js internal bail-out errors (dynamic server usage, redirects, notFound)
    if (
      error &&
      (error.digest?.startsWith('NEXT_') ||
        error.digest === 'DYNAMIC_SERVER_USAGE' ||
        error.message?.includes('Dynamic server usage') ||
        error.message?.includes('cookies'))
    ) {
      throw error;
    }
    console.error('Unexpected exception inside resolveApplicationSession:', error);
    return { type: 'anonymous' };
  }
}
