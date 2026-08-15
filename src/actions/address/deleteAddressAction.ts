'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { AddressActionResponse } from './createAddressAction';

/**
 * Server Action to delete a customer address.
 * Validates authentication and ownership before deletion.
 */
export async function deleteAddressAction(params: {
  addressId: string;
}): Promise<AddressActionResponse> {
  const { addressId } = params;

  if (!addressId) {
    return { success: false, error: 'Address identifier is required.' };
  }

  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to delete an address.' };
  }

  try {
    const supabase = createAdminClient();

    // 2. Perform deletion atomically via RPC which handles promoting a new default if needed
    const { data: rpcSuccess, error: rpcError } = await supabase.rpc('delete_address_and_promote', {
      p_address_id: addressId,
      p_user_id: session.profile.id
    });

    if (rpcError || !rpcSuccess) {
      console.error('Database error in delete_address_and_promote:', rpcError);
      return { success: false, error: 'Unable to delete address. Please try again.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in deleteAddressAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
