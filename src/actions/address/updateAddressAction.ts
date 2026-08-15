'use server';

import { getSession } from '@/lib/auth/getSession';
import { createAdminClient } from '@/lib/supabase/server';
import { AddressActionResponse } from './createAddressAction';

/**
 * Server Action to update an existing customer address.
 * Validates authentication, restricts updates to owned addresses, and maintains default state logic.
 */
export async function updateAddressAction(params: {
  addressId: string;
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
    return { success: false, error: 'You must be signed in to update an address.' };
  }

  const { addressId, fullName, phone, addressLine1, addressLine2, city, state, postalCode, isDefault = false } = params;

  if (!addressId) {
    return { success: false, error: 'Address identifier is required.' };
  }

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

    // 3. Verify ownership first to prevent cross-account editing
    const { data: existingAddress, error: checkError } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', session.profile.id)
      .maybeSingle();

    if (checkError || !existingAddress) {
      return { success: false, error: 'Address not found or unauthorized.' };
    }

    // 4. Perform the update of non-default fields first to avoid constraint violations
    const { error: updateError } = await supabase
      .from('addresses')
      .update({
        full_name: cleanFullName,
        phone: cleanPhone,
        address_line1: cleanAddress1,
        address_line2: cleanAddress2,
        city: cleanCity,
        state: cleanState,
        postal_code: cleanPostalCode,
      })
      .eq('id', addressId)
      .eq('user_id', session.profile.id);

    if (updateError) {
      console.error('Database error updating address:', updateError);
      return { success: false, error: 'Unable to save address changes. Please try again.' };
    }

    // 5. Handle the default state atomically
    if (isDefault) {
      const { error: rpcError } = await supabase.rpc('set_default_address', {
        p_address_id: addressId,
        p_user_id: session.profile.id
      });
      
      if (rpcError) {
        console.error('Failed to atomically set default address:', rpcError);
      }
    } else {
      // If explicitly unchecked, we can safely set it to false (does not violate the unique true constraint)
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('id', addressId)
        .eq('user_id', session.profile.id);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error('Unexpected exception in updateAddressAction:', error);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}
