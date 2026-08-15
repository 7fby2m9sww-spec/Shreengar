'use server'

import { getSession } from '@/lib/auth/getSession'
import { getShippingAddresses } from '@/services/store'
import { ShippingAddress } from '@/types/database'

export async function getAddressesAction(): Promise<
  { success: true; addresses: ShippingAddress[] } | { success: false; error: string }
> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return { success: false, error: 'Unauthorized' }
    }
    const addresses = await getShippingAddresses(session.profile.id)
    return { success: true, addresses }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch addresses' }
  }
}
