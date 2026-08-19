'use server'

import { getSession } from '@/lib/auth/getSession'
import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Checks if a product is wishlisted for the currently logged-in customer.
 */
export async function checkWishlistStatusAction(productId: string): Promise<boolean> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return false
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', customerId)
      .eq('product_id', productId)
      .maybeSingle()

    if (error) {
      return false
    }
    return !!data
  } catch {
    return false
  }
}

/**
 * Toggles a product's wishlist status for the currently logged-in customer.
 */
export async function toggleWishlistAction(
  productId: string
): Promise<{ success: boolean; isWishlisted?: boolean; error?: string }> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return { success: false, error: 'Authentication required' }
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()

    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', customerId)
      .eq('product_id', productId)
      .maybeSingle()

    if (checkError) {
      return { success: false, error: 'Database check failed' }
    }

    if (existing) {
      // Remove it
      const { error: deleteError } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', customerId)
        .eq('product_id', productId)

      if (deleteError) {
        return { success: false, error: 'Could not remove from wishlist' }
      }
      
      revalidatePath('/wishlist')
      return { success: true, isWishlisted: false }
    } else {
      // Add it
      const { error: insertError } = await supabase
        .from('wishlist')
        .insert({
          user_id: customerId,
          product_id: productId
        })

      if (insertError) {
        return { success: false, error: 'Could not add to wishlist' }
      }

      revalidatePath('/wishlist')
      return { success: true, isWishlisted: true }
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error' }
  }
}

/**
 * Resolves the authenticated customer's wishlist count securely.
 */
export async function getWishlistCountAction(): Promise<number> {
  try {
    const session = await getSession()
    if (!session.authenticated) {
      return 0
    }

    const customerId = session.profile.id
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', customerId)

    if (error) {
      return 0
    }
    return count || 0
  } catch {
    return 0
  }
}
