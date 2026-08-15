'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';

export type AddressActionResponse =
  | { success: true }
  | { success: false; error: string };

/**
 * Server Action to create a new customer address.
 * Validates authentication, enforces format requirements, and coordinates default flags.
 */
export async function createAddressAction(params: {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}): Promise<AddressActionResponse> {
  // 1. Verify user session
  const session = await getSession();
  if (!session.authenticated) {
    return { success: false, error: 'You must be signed in to add an address.' };
  }

  const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, isDefault = false } = params;

  // 2. Validate input fields
  const cleanFullName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanAddress1 = addressLine1.trim();
  const cleanAddress2 = addressLine2?.trim() || null;
  const cleanCity = city.trim();
  const cleanState = state.trim();
  const cleanPostalCode = postalCode.trim();

  if (!cleanFullName || !cleanPhone || !cleanAddress1 || !cleanCity || !cleanState || !cleanPostalCode) {
    return { success: false, error: 'Please fill in all required fields.' };
  }

  // Validate phone format (10-digit Indian mobile number)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return { success: false, error: 'Please enter a valid 10-digit phone number.' };
  }

  // Validate pincode (6-digit Indian PIN)
  const pincodeRegex = /^\d{6}$/;
  if (!pincodeRegex.test(cleanPostalCode)) {
    return { success: false, error: 'Please enter a valid 6-digit Pincode.' };
  }

  try {
    const supabase = createAdminClient();

    // 3. Check if this is the user's first address
    const { count, error: countError } = await supabase
      .from('addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.profile.id);

    if (countError) {
      console.error('Failed to count addresses:', countError);
      return { success: false, error: 'Unable to verify address limits.' };
    }

    const isFirstAddress = count === 0;
    const shouldBeDefault = isDefault || isFirstAddress;

    // 4. Insert the new address
    // If it's the first address, it's safe to insert as true. Otherwise insert as false to avoid unique constraint violations.
    const { data: newAddress, error: insertError } = await supabase
      .from('addresses')
      .insert({
        user_id: session.profile.id,
        full_name: cleanFullName,
        phone: cleanPhone,
        address_line1: cleanAddress1,
        address_line2: cleanAddress2,
        city: cleanCity,
        state: cleanState,
        postal_code: cleanPostalCode,
        is_default: isFirstAddress ? true : false,
        country: 'India',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database error inserting address:', insertError);
      return { success: false, error: 'Unable to save address. Please try again.' };
    }

    // 5. If it should be default but wasn't the first address, atomically update using the RPC
    if (shouldBeDefault && !isFirstAddress) {
      const { error: rpcError } = await supabase.rpc('set_default_address', {
        p_address_id: newAddress.id,
        p_user_id: session.profile.id
      });
      
      if (rpcError) {
        console.error('Failed to atomically set default address:', rpcError);
        // We do not fail the whole request because the address was successfully created
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in createAddressAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
