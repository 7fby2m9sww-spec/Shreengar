'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { AddressActionResponse } from './createAddressAction';

/**
 * Server Action to set an address as the default shipping address.
 * Resets other defaults and updates the selected address for the active customer.
 */
export async function setDefaultAddressAction(params: {
  addressId: string;
}): Promise<AddressActionResponse> {
  const { addressId } = params;

  if (!addressId) {
    return { success: false, error: 'Address identifier is required.' };
  }

  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to set a default address.' };
  }

  try {
    const supabase = createAdminClient();

    // 2. Verify ownership of the target address first
    const { data: addressExists, error: checkError } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', session.profile.id)
      .maybeSingle();

    if (checkError || !addressExists) {
      return { success: false, error: 'Address not found or unauthorized.' };
    }

    // 3. Set target address default flag using the atomic RPC
    const { error: rpcError } = await supabase.rpc('set_default_address', {
      p_address_id: addressId,
      p_user_id: session.profile.id
    });

    if (rpcError) {
      console.error('Database error atomically updating default address status:', rpcError);
      return { success: false, error: 'Unable to set default address. Please try again.' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in setDefaultAddressAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
